using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Project3_Personal_Finance.Models;
using System.Data;
using System.Globalization;
using System.Net;
using System.Security.Claims;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Project3_Personal_Finance.Controllers
{
    public class CreateInvestmentDto
    {
        public string AssetName { get; set; } = null!;
        public string AssetType { get; set; } = null!;
        public decimal AmountInvested { get; set; }
        public decimal? Quantity { get; set; }
        public DateTime InvestDate { get; set; }
        public int JarId { get; set; } // Chọn Hũ (Tự do tài chính hoặc Tiết kiệm dài hạn)
    }

    public class SellInvestmentDto
    {
        public int JarId { get; set; } // Hũ nhận lại tiền bán
    }

    public class GoldBuyRequest
    {
        public string AssetName { get; set; } = null!;
        public decimal Quantity { get; set; }
        public int JarId { get; set; }
        public Guid IdempotencyKey { get; set; }
    }

    public class GoldSellRequest
    {
        public decimal Quantity { get; set; }
        public int JarId { get; set; }
        public Guid IdempotencyKey { get; set; }
    }

    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class InvestmentsController : ControllerBase
    {
        private static readonly SemaphoreSlim MarketApiSemaphore = new(3);
        private readonly PersonalFinanceDbContext _context;
        private readonly HttpClient _httpClient;
        private readonly IMemoryCache _marketCache;
        private readonly ILogger<InvestmentsController> _logger;

        public InvestmentsController(
            PersonalFinanceDbContext context,
            IHttpClientFactory httpClientFactory,
            IMemoryCache marketCache,
            ILogger<InvestmentsController> logger)
        {
            _context = context;
            _httpClient = httpClientFactory.CreateClient("YahooFinance");
            _marketCache = marketCache;
            _logger = logger;
        }

        private int GetCurrentUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

        private sealed record MarketPricePoint(DateOnly Date, decimal Close);
        private sealed record MarketQuote(
            string Symbol,
            string AssetName,
            decimal CurrentPrice,
            decimal PurchasePrice,
            string PriceTime,
            IReadOnlyList<MarketPricePoint> History);
        private sealed record MarketStock(
            string Symbol,
            string Name,
            decimal CurrentPrice,
            decimal ChangePercent,
            string PriceTime,
            IReadOnlyList<MarketPricePoint> History);
        private sealed record MarketSearchResult(IReadOnlyList<MarketStock> Stocks, int UnavailableCount);
        private sealed record GoldMarketQuote(
            string AssetName,
            string BranchName,
            decimal BuyPrice,
            decimal SellPrice,
            string PriceTime);

        private const string GoldMarketUrl = "https://giavang.org/trong-nuoc/sjc/";
        private const string GoldMarketSource = "Giavang.org";
        private const string GoldUnit = "chỉ";
        private const string GoldTradingUnavailableMessage =
            "Giao dịch vàng hiện tạm thời không khả dụng vì schema database hiện tại không lưu đủ dữ liệu giao dịch.";
        private static readonly CultureInfo VietnameseCulture = CultureInfo.GetCultureInfo("vi-VN");

        private static readonly string[] PopularStockSymbols =
        [
            "FPT", "VNM", "HPG", "VCB", "MWG", "VIC", "SSI", "TCB", "ACB", "VHM"
        ];

        private static bool IsStockAssetType(string? assetType)
        {
            var normalizedType = assetType?.Trim();
            return string.Equals(normalizedType, "Cổ phiếu", StringComparison.OrdinalIgnoreCase)
                || string.Equals(normalizedType, "Stock", StringComparison.OrdinalIgnoreCase)
                || string.Equals(normalizedType, "Stocks", StringComparison.OrdinalIgnoreCase)
                || string.Equals(normalizedType, "Share", StringComparison.OrdinalIgnoreCase)
                || string.Equals(normalizedType, "Shares", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsGoldTradingSupportedByCurrentSchema => false;

        private static string? GetStockSymbol(string? assetName)
        {
            if (string.IsNullOrWhiteSpace(assetName))
            {
                return null;
            }

            var symbol = assetName.Trim().ToUpperInvariant();
            var parenthesizedSymbol = Regex.Match(symbol, @"\(([A-Z0-9]{3,5})(?:\.VN)?\)");
            if (parenthesizedSymbol.Success)
            {
                symbol = parenthesizedSymbol.Groups[1].Value;
            }
            else
            {
                var symbolMatch = Regex.Match(symbol, @"(?:^|[\s:])([A-Z0-9]{3,5})(?:\.VN)?(?=$|[\s:,\-])");
                if (symbolMatch.Success)
                {
                    symbol = symbolMatch.Groups[1].Value;
                }
            }

            if (symbol.EndsWith(".VN", StringComparison.Ordinal))
            {
                symbol = symbol[..^3];
            }

            return symbol.Length is >= 3 and <= 5 && symbol.All(char.IsAsciiLetterOrDigit)
                ? symbol
                : null;
        }

        private async Task<HttpResponseMessage> SendMarketRequestAsync(string url, CancellationToken cancellationToken)
        {
            await MarketApiSemaphore.WaitAsync(cancellationToken);
            try
            {
                return await _httpClient.GetAsync(url, cancellationToken);
            }
            finally
            {
                MarketApiSemaphore.Release();
            }
        }

        private async Task<MarketStock> GetMarketStockAsync(string symbol, int historyDays, CancellationToken cancellationToken)
        {
            var cacheKey = $"YahooFinance:Stock:{symbol}:{historyDays}";
            if (_marketCache.TryGetValue(cacheKey, out MarketStock? cachedStock) && cachedStock != null)
            {
                return cachedStock;
            }

            var periodStart = DateTimeOffset.UtcNow.AddDays(-historyDays).ToUnixTimeSeconds();
            var periodEnd = DateTimeOffset.UtcNow.AddDays(2).ToUnixTimeSeconds();
            var url = $"v8/finance/chart/{Uri.EscapeDataString($"{symbol}.VN")}?period1={periodStart}&period2={periodEnd}&interval=1d";
            using var response = await SendMarketRequestAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var message = response.StatusCode == System.Net.HttpStatusCode.TooManyRequests
                    ? "Yahoo Finance đang giới hạn yêu cầu (HTTP 429); vui lòng thử lại sau."
                    : $"Yahoo Finance trả về HTTP {(int)response.StatusCode}.";
                throw new HttpRequestException(message, null, response.StatusCode);
            }

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            var chart = document.RootElement.GetProperty("chart");
            if (chart.TryGetProperty("error", out var apiError) && apiError.ValueKind != JsonValueKind.Null)
            {
                var description = apiError.TryGetProperty("description", out var descriptionElement)
                    ? descriptionElement.GetString()
                    : null;
                throw new InvalidOperationException(description ?? $"Yahoo Finance không tìm thấy mã {symbol}.VN.");
            }

            var results = chart.GetProperty("result");
            if (results.ValueKind != JsonValueKind.Array || results.GetArrayLength() == 0)
            {
                throw new InvalidOperationException($"Yahoo Finance không có dữ liệu cho mã {symbol}.VN.");
            }

            var result = results[0];
            var metadata = result.GetProperty("meta");
            if (!string.Equals(metadata.GetProperty("currency").GetString(), "VND", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException($"Yahoo Finance không trả về giá VND cho mã {symbol}.VN.");
            }
            if (!string.Equals(metadata.GetProperty("instrumentType").GetString(), "EQUITY", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException($"Mã {symbol}.VN không phải cổ phiếu.");
            }

            var currentPrice = metadata.GetProperty("regularMarketPrice").GetDecimal();
            if (currentPrice <= 0)
            {
                throw new InvalidOperationException($"Yahoo Finance không có giá hợp lệ cho mã {symbol}.VN.");
            }

            var marketTimestamp = metadata.GetProperty("regularMarketTime").GetInt64();
            var timezoneOffset = metadata.GetProperty("gmtoffset").GetInt32();
            var marketTime = DateTimeOffset.FromUnixTimeSeconds(marketTimestamp)
                .ToOffset(TimeSpan.FromSeconds(timezoneOffset));
            var marketDate = DateOnly.FromDateTime(marketTime.DateTime);
            var timestamps = result.GetProperty("timestamp");
            var closes = result.GetProperty("indicators").GetProperty("quote")[0].GetProperty("close");
            var history = new List<MarketPricePoint>();
            decimal? previousClose = null;

            for (var index = 0; index < timestamps.GetArrayLength() && index < closes.GetArrayLength(); index++)
            {
                if (closes[index].ValueKind != JsonValueKind.Number)
                {
                    continue;
                }

                var close = closes[index].GetDecimal();
                var quoteDate = DateOnly.FromDateTime(
                    DateTimeOffset.FromUnixTimeSeconds(timestamps[index].GetInt64()).UtcDateTime.AddSeconds(timezoneOffset));
                history.Add(new MarketPricePoint(quoteDate, close));
                if (quoteDate < marketDate)
                {
                    previousClose = close;
                }
            }

            decimal changePercent;
            if (metadata.TryGetProperty("regularMarketChangePercent", out var marketChangePercent)
                && marketChangePercent.ValueKind == JsonValueKind.Number)
            {
                changePercent = marketChangePercent.GetDecimal();
            }
            else if (previousClose is > 0)
            {
                changePercent = (currentPrice - previousClose.Value) / previousClose.Value * 100;
            }
            else
            {
                throw new InvalidOperationException($"Yahoo Finance không có giá đóng cửa trước đó cho mã {symbol}.VN.");
            }

            history.RemoveAll(point => point.Date == marketDate);
            history.Add(new MarketPricePoint(marketDate, currentPrice));
            var name = metadata.TryGetProperty("longName", out var longName)
                ? longName.GetString()
                : null;
            name ??= metadata.TryGetProperty("shortName", out var shortName)
                ? shortName.GetString()
                : null;

            var stock = new MarketStock(
                symbol,
                name ?? symbol,
                currentPrice,
                changePercent,
                marketTime.ToString("dd/MM/yyyy HH:mm"),
                history.OrderBy(point => point.Date).ToList());
            _marketCache.Set(cacheKey, stock, TimeSpan.FromMinutes(1));
            return stock;
        }

        [HttpGet("market/popular")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
        public async Task<IActionResult> GetPopularStocks(CancellationToken cancellationToken)
        {
            var requests = PopularStockSymbols.Select(async symbol =>
            {
                try
                {
                    return await GetMarketStockAsync(symbol, 5, cancellationToken);
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException or InvalidOperationException or KeyNotFoundException)
                {
                    _logger.LogWarning(ex, "Unable to load popular stock {Symbol} from Yahoo Finance.", symbol);
                    return null;
                }
            });

            var stocks = (await Task.WhenAll(requests)).OfType<MarketStock>().ToList();
            if (stocks.Count == 0)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, "Yahoo Finance hiện không có báo giá cho danh sách cổ phiếu phổ biến.");
            }

            return Ok(new MarketSearchResult(stocks, PopularStockSymbols.Length - stocks.Count));
        }

        [HttpGet("market/search")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status502BadGateway)]
        [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
        public async Task<IActionResult> SearchStocks([FromQuery] string q, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
            {
                return BadRequest("Nhập ít nhất 2 ký tự tên hoặc mã cổ phiếu.");
            }

            var normalizedQuery = q.Trim();
            var cacheKey = $"YahooFinance:Search:{normalizedQuery.ToUpperInvariant()}";
            if (_marketCache.TryGetValue(cacheKey, out MarketSearchResult? cachedResult) && cachedResult != null)
            {
                return Ok(cachedResult);
            }

            var url = $"v1/finance/search?q={Uri.EscapeDataString(normalizedQuery)}&quotesCount=30&newsCount=0";
            HttpResponseMessage marketResponse;
            try
            {
                marketResponse = await SendMarketRequestAsync(url, cancellationToken);
            }
            catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning(ex, "Yahoo Finance search timed out for {Query}.", normalizedQuery);
                return StatusCode(StatusCodes.Status503ServiceUnavailable, "Yahoo Finance không phản hồi kịp thời.");
            }
            catch (HttpRequestException ex)
            {
                _logger.LogWarning(ex, "Yahoo Finance search request failed for {Query}.", normalizedQuery);
                return StatusCode(StatusCodes.Status503ServiceUnavailable, "Không thể kết nối tới Yahoo Finance.");
            }

            using var response = marketResponse;
            if (!response.IsSuccessStatusCode)
            {
                var message = response.StatusCode == System.Net.HttpStatusCode.TooManyRequests
                    ? "Yahoo Finance đang giới hạn yêu cầu (HTTP 429); vui lòng thử lại sau."
                    : $"Yahoo Finance trả về HTTP {(int)response.StatusCode}.";
                _logger.LogWarning("Yahoo Finance search failed for {Query} with HTTP {StatusCode}.", normalizedQuery, (int)response.StatusCode);
                return StatusCode(StatusCodes.Status503ServiceUnavailable, message);
            }

            JsonDocument document;
            try
            {
                document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Yahoo Finance returned invalid search JSON for {Query}.", normalizedQuery);
                return StatusCode(StatusCodes.Status502BadGateway, "Yahoo Finance trả về dữ liệu tìm kiếm không hợp lệ.");
            }

            using (document)
            {
                if (!document.RootElement.TryGetProperty("quotes", out var quotes) || quotes.ValueKind != JsonValueKind.Array)
                {
                    return StatusCode(StatusCodes.Status502BadGateway, "Yahoo Finance trả về danh sách mã cổ phiếu không hợp lệ.");
                }

                var symbols = quotes.EnumerateArray()
                    .Select(quote =>
                    {
                        if (!quote.TryGetProperty("symbol", out var symbolElement)
                            || symbolElement.ValueKind != JsonValueKind.String
                            || !quote.TryGetProperty("quoteType", out var typeElement)
                            || !string.Equals(typeElement.GetString(), "EQUITY", StringComparison.OrdinalIgnoreCase))
                        {
                            return null;
                        }

                        var yahooSymbol = symbolElement.GetString();
                        return yahooSymbol?.EndsWith(".VN", StringComparison.OrdinalIgnoreCase) == true
                            ? GetStockSymbol(yahooSymbol)
                            : null;
                    })
                    .Where(symbol => symbol != null)
                    .Select(symbol => symbol!)
                    .Distinct(StringComparer.Ordinal)
                    .Take(10)
                    .ToList();

                var requests = symbols.Select(async symbol =>
                {
                    try
                    {
                        return await GetMarketStockAsync(symbol, 5, cancellationToken);
                    }
                    catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                    {
                        throw;
                    }
                    catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException or InvalidOperationException or KeyNotFoundException)
                    {
                        _logger.LogWarning(ex, "Unable to load searched stock {Symbol} from Yahoo Finance.", symbol);
                        return null;
                    }
                });

                var stocks = (await Task.WhenAll(requests)).OfType<MarketStock>().ToList();
                if (symbols.Count > 0 && stocks.Count == 0)
                {
                    return StatusCode(StatusCodes.Status503ServiceUnavailable, "Yahoo Finance tìm thấy mã nhưng hiện không trả báo giá thị trường.");
                }

                var searchResult = new MarketSearchResult(stocks, symbols.Count - stocks.Count);
                _marketCache.Set(cacheKey, searchResult, TimeSpan.FromMinutes(1));
                return Ok(searchResult);
            }
        }

        [HttpGet("market/{symbol}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status502BadGateway)]
        [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
        public async Task<IActionResult> GetStockDetails(string symbol, CancellationToken cancellationToken)
        {
            var normalizedSymbol = GetStockSymbol(symbol);
            if (normalizedSymbol == null || !string.Equals(symbol, normalizedSymbol, StringComparison.OrdinalIgnoreCase))
            {
                return NotFound("Mã không hợp lệ. Chỉ hỗ trợ cổ phiếu Việt Nam niêm yết, ví dụ FPT.");
            }

            try
            {
                return Ok(await GetMarketStockAsync(normalizedSymbol, 365, cancellationToken));
            }
            catch (HttpRequestException ex)
            {
                _logger.LogWarning(ex, "Stock detail quote failed for {Symbol}.", normalizedSymbol);
                return StatusCode(StatusCodes.Status503ServiceUnavailable, $"Không thể tải giá thị trường: {ex.Message}");
            }
            catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning(ex, "Stock detail quote timed out for {Symbol}.", normalizedSymbol);
                return StatusCode(StatusCodes.Status503ServiceUnavailable, "Yahoo Finance không phản hồi kịp thời.");
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Invalid Yahoo Finance detail response for {Symbol}.", normalizedSymbol);
                return StatusCode(StatusCodes.Status502BadGateway, "Yahoo Finance trả về dữ liệu không hợp lệ.");
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Yahoo Finance detail response is missing fields for {Symbol}.", normalizedSymbol);
                return StatusCode(StatusCodes.Status502BadGateway, "Yahoo Finance thiếu dữ liệu giá bắt buộc.");
            }
        }

        private async Task<MarketQuote> GetStockMarketQuoteAsync(
            string? assetName,
            DateOnly investDate,
            CancellationToken cancellationToken = default)
        {
            var symbol = GetStockSymbol(assetName);
            if (symbol == null)
            {
                throw new InvalidOperationException("Vui lòng nhập mã cổ phiếu Việt Nam hợp lệ, ví dụ FPT hoặc VNM.");
            }

            var cacheKey = $"YahooFinance:{symbol}:{investDate:yyyyMMdd}";
            if (_marketCache.TryGetValue(cacheKey, out MarketQuote? cachedQuote) && cachedQuote != null)
            {
                return cachedQuote;
            }

            var periodStart = new DateTimeOffset(investDate.AddDays(-10).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero)
                .ToUnixTimeSeconds();
            var periodEnd = DateTimeOffset.UtcNow.AddDays(2).ToUnixTimeSeconds();
            var url = $"v8/finance/chart/{Uri.EscapeDataString($"{symbol}.VN")}?period1={periodStart}&period2={periodEnd}&interval=1d&events=div%2Csplits";
            using var response = await SendMarketRequestAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var message = response.StatusCode == System.Net.HttpStatusCode.TooManyRequests
                    ? "Yahoo Finance đang giới hạn yêu cầu (HTTP 429); vui lòng thử lại sau."
                    : $"Yahoo Finance trả về HTTP {(int)response.StatusCode}.";
                throw new HttpRequestException(message, null, response.StatusCode);
            }

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            var chart = document.RootElement.GetProperty("chart");
            if (chart.TryGetProperty("error", out var apiError) && apiError.ValueKind != JsonValueKind.Null)
            {
                var description = apiError.TryGetProperty("description", out var descriptionElement)
                    ? descriptionElement.GetString()
                    : null;
                throw new InvalidOperationException(description ?? "API không tìm thấy mã cổ phiếu.");
            }

            var result = chart.GetProperty("result");
            if (result.ValueKind != JsonValueKind.Array || result.GetArrayLength() == 0)
            {
                throw new InvalidOperationException($"API không có dữ liệu cho mã {symbol}.");
            }

            var quoteData = result[0];
            var metadata = quoteData.GetProperty("meta");
            if (!string.Equals(metadata.GetProperty("currency").GetString(), "VND", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException($"API không trả về giá VND cho mã {symbol}.");
            }

            var currentPrice = metadata.GetProperty("regularMarketPrice").GetDecimal();
            var timezoneOffset = metadata.GetProperty("gmtoffset").GetInt32();
            var timestamps = quoteData.GetProperty("timestamp");
            var closes = quoteData.GetProperty("indicators").GetProperty("quote")[0].GetProperty("close");
            DateOnly? latestPurchaseDate = null;
            decimal? purchasePrice = null;
            var history = new List<MarketPricePoint>();

            for (var index = 0; index < timestamps.GetArrayLength() && index < closes.GetArrayLength(); index++)
            {
                var close = closes[index];
                if (close.ValueKind != JsonValueKind.Number)
                {
                    continue;
                }

                var quoteDate = DateOnly.FromDateTime(
                    DateTimeOffset.FromUnixTimeSeconds(timestamps[index].GetInt64()).UtcDateTime.AddSeconds(timezoneOffset));
                if (quoteDate <= investDate && (latestPurchaseDate == null || quoteDate > latestPurchaseDate))
                {
                    latestPurchaseDate = quoteDate;
                    purchasePrice = close.GetDecimal();
                }

                if (quoteDate > investDate)
                {
                    history.Add(new MarketPricePoint(quoteDate, close.GetDecimal()));
                }
            }

            if (currentPrice <= 0 || purchasePrice is null or <= 0)
            {
                throw new InvalidOperationException($"API không có giá giao dịch hợp lệ cho mã {symbol} vào ngày đầu tư.");
            }

            var marketTime = DateTimeOffset
                .FromUnixTimeSeconds(metadata.GetProperty("regularMarketTime").GetInt64())
                .ToOffset(TimeSpan.FromSeconds(timezoneOffset));
            var marketDate = DateOnly.FromDateTime(marketTime.DateTime);
            history.RemoveAll(point => point.Date == marketDate);
            history.Add(new MarketPricePoint(marketDate, currentPrice));
            history.Insert(0, new MarketPricePoint(investDate, purchasePrice.Value));

            var displayName = metadata.TryGetProperty("longName", out var longName)
                ? longName.GetString()
                : null;
            displayName ??= metadata.TryGetProperty("shortName", out var shortName)
                ? shortName.GetString()
                : null;

            var quote = new MarketQuote(
                symbol,
                displayName ?? symbol,
                currentPrice,
                purchasePrice.Value,
                marketTime.ToString("dd/MM/yyyy HH:mm"),
                history.OrderBy(point => point.Date).ToList());
                _marketCache.Set(cacheKey, quote, TimeSpan.FromMinutes(1));
                return quote;
        }

        // HÀM TÍNH SỐ DƯ THỰC TẾ CỦA HŨ (Đã khấu trừ các khoản đang nằm trong Investments)
        private async Task<decimal> GetJarAvailableBalance(int userId, int jarId)
        {
            // Lấy tất cả Category thuộc Hũ này
            var categoryIds = await _context.Categories
                .Where(c => c.JarId == jarId)
                .Select(c => c.Id)
                .ToListAsync();

            // Tổng Thu - Chi từ Transactions thuộc Hũ này
            var txs = await _context.Transactions
                .Where(t => t.UserId == userId && categoryIds.Contains(t.CategoryId))
                .ToListAsync();

            var totalIncome = txs.Where(t => t.Type == "Income").Sum(t => t.Amount);
            var totalExpense = txs.Where(t => t.Type == "Expense").Sum(t => t.Amount);

            return totalIncome - totalExpense;
        }

        // 1. API LẤY DANH SÁCH HŨ CHO PHÉP ĐẦU TƯ (Tự do tài chính & Tiết kiệm dài hạn) KÈM SỐ DƯ
        [HttpGet("allowed-jars")]
        public async Task<IActionResult> GetAllowedInvestmentJars()
        {
            var userId = GetCurrentUserId();

            // Tìm 2 Hũ: Financial Freedom & Long Term Saving
            var allowedJars = await _context.FinancialJars
                .Where(j => j.JarName.Contains("Financial Freedom")
                         || j.JarName.Contains("Tự do tài chính")
                         || j.JarName.Contains("Long Term")
                         || j.JarName.Contains("Tiết kiệm dài hạn"))
                .ToListAsync();

            var result = new List<object>();

            foreach (var jar in allowedJars)
            {
                var balance = await GetJarAvailableBalance(userId, jar.Id);
                result.Add(new
                {
                    jarId = jar.Id,
                    jarName = jar.JarName,
                    balance = balance
                });
            }

            return Ok(result);
        }

        // 2. LẤY DANH SÁCH TÀI SẢN ĐANG ĐẦU TƯ VÀ ĐỊNH GIÁ CỔ PHIẾU TỪ API
        [HttpGet]
        public async Task<IActionResult> GetInvestments()
        {
            var userId = GetCurrentUserId();
            var investments = await _context.Investments
                .Include(i => i.Jar)
                .Where(i => i.UserId == userId)
                .OrderByDescending(i => i.InvestDate)
                .ToListAsync();
            _logger.LogInformation("Loaded {InvestmentCount} investment records for market valuation.", investments.Count);

            var result = new List<object>();
            foreach (var investment in investments)
            {
                MarketQuote? quote = null;
                string? marketDataError = null;
                var isStock = IsStockAssetType(investment.AssetType);

                if (isStock && investment.InvestDate.HasValue)
                {
                    try
                    {
                        quote = await GetStockMarketQuoteAsync(investment.AssetName, investment.InvestDate.Value);
                        _logger.LogDebug(
                            "Market quote loaded for investment {InvestmentId}, symbol {Symbol}, current price {CurrentPrice} VND.",
                            investment.Id,
                            quote.Symbol,
                            quote.CurrentPrice);
                    }
                    catch (HttpRequestException ex)
                    {
                        marketDataError = $"Không thể tải giá thị trường: {ex.Message}";
                        _logger.LogWarning(ex, "Market quote failed for investment {InvestmentId}, symbol {Symbol}", investment.Id, GetStockSymbol(investment.AssetName) ?? "(invalid)");
                    }
                    catch (TaskCanceledException ex)
                    {
                        marketDataError = "API giá thị trường không phản hồi kịp thời.";
                        _logger.LogWarning(ex, "Market quote timed out for investment {InvestmentId}, symbol {Symbol}", investment.Id, GetStockSymbol(investment.AssetName) ?? "(invalid)");
                    }
                    catch (JsonException ex)
                    {
                        marketDataError = "API giá thị trường trả về dữ liệu không hợp lệ.";
                        _logger.LogWarning(ex, "Yahoo Finance response could not be parsed for investment {InvestmentId}, symbol {Symbol}", investment.Id, GetStockSymbol(investment.AssetName) ?? "(invalid)");
                    }
                    catch (InvalidOperationException ex)
                    {
                        marketDataError = ex.Message;
                        _logger.LogWarning("No market price for investment {InvestmentId}, symbol {Symbol}: {Reason}", investment.Id, GetStockSymbol(investment.AssetName) ?? "(invalid)", ex.Message);
                    }
                    catch (KeyNotFoundException ex)
                    {
                        marketDataError = "API giá thị trường thiếu trường dữ liệu cần thiết.";
                        _logger.LogWarning(ex, "Yahoo Finance response is missing expected data for investment {InvestmentId}, symbol {Symbol}", investment.Id, GetStockSymbol(investment.AssetName) ?? "(invalid)");
                    }
                }
                else if (isStock)
                {
                    marketDataError = "Tài sản thiếu ngày đầu tư để xác định giá vốn.";
                }

                var amountInvested = investment.AmountInvested ?? 0;
                result.Add(new
                {
                    investment.Id,
                    investment.AssetName,
                    investment.AssetType,
                    investment.AmountInvested,
                    currentValue = quote == null
                        ? (decimal?)null
                        : decimal.Round(amountInvested / quote.PurchasePrice * quote.CurrentPrice, 2),
                    investDate = investment.InvestDate,
                    investment.JarId,
                    jar = investment.Jar,
                    isMarketPriced = quote != null,
                    marketDataError = marketDataError ?? (isStock
                        ? null
                        : "Chưa có API giá thị trường cho loại tài sản này."),
                    marketName = quote?.AssetName,
                    marketSymbol = quote?.Symbol ?? GetStockSymbol(investment.AssetName),
                    marketPrice = quote?.CurrentPrice,
                    marketPurchasePrice = quote?.PurchasePrice,
                    marketQuantity = quote == null || quote.PurchasePrice <= 0
                        ? (decimal?)null
                        : decimal.Round((investment.AmountInvested ?? 0) / quote.PurchasePrice, 4),
                    marketPriceTime = quote?.PriceTime,
                    marketHistory = quote?.History
                });
            }

            return Ok(result);
        }

        // 3. MUA / NẠP TÀI SẢN ĐẦU TƯ (Tự động trừ tiền Hũ & Tạo Lịch sử Giao dịch)
        [HttpPost]
        public async Task<IActionResult> CreateInvestment(CreateInvestmentDto request, CancellationToken cancellationToken)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrWhiteSpace(request.AssetName)
                || (request.Quantity.HasValue ? request.Quantity <= 0 : request.AmountInvested <= 0))
            {
                return BadRequest("Vui lòng nhập tên tài sản và số tiền hoặc số lượng đầu tư hợp lệ.");
            }
            if (request.Quantity.HasValue && !IsStockAssetType(request.AssetType))
            {
                return BadRequest("Chỉ hỗ trợ nhập số lượng cho cổ phiếu.");
            }

            var investDate = DateOnly.FromDateTime(request.InvestDate);
            if (request.InvestDate == default || investDate > DateOnly.FromDateTime(DateTime.Now))
            {
                return BadRequest("Ngày đầu tư không hợp lệ hoặc nằm trong tương lai.");
            }

            MarketQuote? marketQuote = null;
            if (IsStockAssetType(request.AssetType))
            {
                try
                {
                    marketQuote = await GetStockMarketQuoteAsync(request.AssetName, investDate, cancellationToken);
                }
                catch (HttpRequestException ex)
                {
                    return StatusCode(StatusCodes.Status503ServiceUnavailable, $"Không thể xác minh giá cổ phiếu; chưa ghi nhận giao dịch: {ex.Message}");
                }
                catch (TaskCanceledException)
                {
                    return StatusCode(StatusCodes.Status503ServiceUnavailable, "API giá cổ phiếu không phản hồi; chưa ghi nhận giao dịch.");
                }
                catch (JsonException)
                {
                    return StatusCode(StatusCodes.Status503ServiceUnavailable, "API giá cổ phiếu trả về dữ liệu không hợp lệ; chưa ghi nhận giao dịch.");
                }
                catch (InvalidOperationException ex)
                {
                    return BadRequest($"Không thể mua cổ phiếu: {ex.Message}");
                }
            }

            var amountToInvest = request.Quantity.HasValue
                ? decimal.Round(request.Quantity.Value * marketQuote!.CurrentPrice, 2)
                : request.AmountInvested;
            if (amountToInvest <= 0)
            {
                return BadRequest("Số tiền đầu tư phải lớn hơn 0.");
            }

            // Kiểm tra Hũ tồn tại
            var jar = await _context.FinancialJars.FirstOrDefaultAsync(j => j.Id == request.JarId);
            if (jar == null) return BadRequest("Hũ tài chính không hợp lệ!");

            // Kiểm tra Số dư khả dụng của Hũ
            var currentBalance = await GetJarAvailableBalance(userId, request.JarId);
            if (currentBalance < amountToInvest)
            {
                return BadRequest($"Hũ {jar.JarName} không đủ số dư để đầu tư (Số dư hiện tại: {currentBalance:N0}đ)!");
            }

            // Lấy hoặc tự tạo Danh mục thuộc Hũ này để lưu Transaction
            var category = await _context.Categories
                .FirstOrDefaultAsync(c => c.JarId == request.JarId && (c.Name.Contains("Đầu tư") || c.Name.Contains("Invest")));

            if (category == null)
            {
                // Nếu chưa có category thì tạo 1 danh mục mặc định
                category = new Category
                {
                    Name = "Đầu tư tài chính",
                    JarId = request.JarId
                };
                _context.Categories.Add(category);
                await _context.SaveChangesAsync();
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // A. Tạo tài sản Đầu tư mới
                var investment = new Investment
                {
                    UserId = userId,
                    JarId = request.JarId,
                    AssetName = request.AssetName,
                    AssetType = request.AssetType,
                    AmountInvested = amountToInvest,
                    CurrentValue = amountToInvest,
                    InvestDate = investDate
                };
                _context.Investments.Add(investment);

                // B. Tự động tạo Giao dịch Chi tiêu (Trừ tiền Hũ)
                var moneyTransaction = new Transaction
                {
                    UserId = userId,
                    CategoryId = category.Id,
                    Amount = amountToInvest,
                    Type = "Expense",
                    TransactionDate = request.InvestDate,
                    Note = $"Nạp đầu tư tài sản: {request.AssetName} (Hũ: {jar.JarName})"
                };
                _context.Transactions.Add(moneyTransaction);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var newBalance = await GetJarAvailableBalance(userId, request.JarId);

                return Ok(new
                {
                    message = "Đầu tư thành công!",
                    transactionDetails = new
                    {
                        assetName = marketQuote?.AssetName ?? request.AssetName,
                        amount = amountToInvest,
                        quantity = request.Quantity,
                        marketPrice = marketQuote?.CurrentPrice,
                        jarName = jar.JarName,
                        remainingBalance = newBalance,
                        time = DateTime.Now.ToString("HH:mm:ss dd/MM/yyyy")
                    }
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest($"Lỗi hệ thống: {ex.Message}");
            }
        }

        // 4. BÁN / RÚT TÀI SẢN ĐẦU TƯ (Tự động cộng lại tiền vào Hũ & Tạo Lịch sử Giao dịch)
        [HttpPost("{id}/sell")]
        public async Task<IActionResult> SellInvestment(int id, SellInvestmentDto request)
        {
            var userId = GetCurrentUserId();
            var investment = await _context.Investments.FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);
            if (investment == null) return NotFound("Không tìm thấy tài sản đầu tư.");

            var amountInvested = investment.AmountInvested ?? 0;
            decimal currentValue;
            MarketQuote? marketQuote = null;
            if (IsStockAssetType(investment.AssetType))
            {
                if (!investment.InvestDate.HasValue)
                {
                    return BadRequest("Tài sản thiếu ngày đầu tư nên không thể xác định giá bán.");
                }

                try
                {
                    marketQuote = await GetStockMarketQuoteAsync(investment.AssetName, investment.InvestDate.Value);
                    currentValue = decimal.Round(amountInvested / marketQuote.PurchasePrice * marketQuote.CurrentPrice, 2);
                }
                catch (HttpRequestException ex)
                {
                    return StatusCode(StatusCodes.Status503ServiceUnavailable, $"Không thể xác định giá bán cổ phiếu: {ex.Message}");
                }
                catch (TaskCanceledException)
                {
                    return StatusCode(StatusCodes.Status503ServiceUnavailable, "API giá cổ phiếu không phản hồi; chưa thực hiện bán.");
                }
                catch (JsonException)
                {
                    return StatusCode(StatusCodes.Status503ServiceUnavailable, "API giá cổ phiếu trả về dữ liệu không hợp lệ; chưa thực hiện bán.");
                }
                catch (InvalidOperationException ex)
                {
                    return BadRequest($"Không thể xác định giá bán cổ phiếu: {ex.Message}");
                }
            }
            else
            {
                currentValue = amountInvested;
            }

            int targetJarId = request.JarId > 0 ? request.JarId : (investment.JarId ?? 0);
            var jar = await _context.FinancialJars.FirstOrDefaultAsync(j => j.Id == targetJarId);
            if (jar == null) return BadRequest("Hũ nhận tiền không hợp lệ.");

            // Lấy danh mục thuộc Hũ
            var category = await _context.Categories
                .FirstOrDefaultAsync(c => c.JarId == targetJarId && (c.Name.Contains("Đầu tư") || c.Name.Contains("Invest")));

            if (category == null)
            {
                category = new Category { Name = "Thu nhập đầu tư", JarId = targetJarId };
                _context.Categories.Add(category);
                await _context.SaveChangesAsync();
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // A. Tạo Giao dịch Thu nhập (Cộng lại tiền vào Hũ)
                var moneyTransaction = new Transaction
                {
                    UserId = userId,
                    CategoryId = category.Id,
                    Amount = currentValue,
                    Type = "Income",
                    TransactionDate = DateTime.Now,
                    Note = $"Bán tài sản đầu tư: {marketQuote?.AssetName ?? investment.AssetName} (Lời/Lỗ: {currentValue - amountInvested:N0}đ)"
                };
                _context.Transactions.Add(moneyTransaction);

                // B. Xóa tài sản khỏi danh mục đang nắm giữ
                _context.Investments.Remove(investment);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var newBalance = await GetJarAvailableBalance(userId, targetJarId);

                return Ok(new
                {
                    message = "Chốt lời/Rút vốn thành công!",
                    transactionDetails = new
                    {
                        assetName = marketQuote?.AssetName ?? investment.AssetName,
                        amountReceived = currentValue,
                        profitOrLoss = currentValue - amountInvested,
                        jarName = jar.JarName,
                        remainingBalance = newBalance,
                        time = DateTime.Now.ToString("HH:mm:ss dd/MM/yyyy")
                    }
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest($"Lỗi hệ thống: {ex.Message}");
            }
        }

        private async Task<IReadOnlyList<GoldMarketQuote>> GetGoldMarketQuotesAsync(CancellationToken cancellationToken)
        {
            const string cacheKey = "Giavang.org:SJC:GoldPrices";
            if (_marketCache.TryGetValue(cacheKey, out IReadOnlyList<GoldMarketQuote>? cachedQuotes)
                && cachedQuotes != null)
            {
                return cachedQuotes;
            }

            await MarketApiSemaphore.WaitAsync(cancellationToken);
            HttpResponseMessage response;
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, GoldMarketUrl);
                request.Headers.TryAddWithoutValidation(
                    "User-Agent",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36");
                response = await _httpClient.SendAsync(request, cancellationToken);
            }
            finally
            {
                MarketApiSemaphore.Release();
            }

            using (response)
            {
                if (!response.IsSuccessStatusCode)
                {
                    throw new HttpRequestException(
                        $"{GoldMarketSource} trả về HTTP {(int)response.StatusCode}.",
                        null,
                        response.StatusCode);
                }

                var html = await response.Content.ReadAsStringAsync(cancellationToken);
                var quotes = ParseGoldMarketQuotes(html);
                _marketCache.Set(cacheKey, quotes, TimeSpan.FromMinutes(1));
                return quotes;
            }
        }

        private static IReadOnlyList<GoldMarketQuote> ParseGoldMarketQuotes(string html)
        {
            var timestampMatch = Regex.Match(
                html,
                @"Cập nhật lúc\s*(?<time>\d{2}:\d{2}:\d{2}\s+\d{2}/\d{2}/\d{4})",
                RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
                TimeSpan.FromSeconds(2));
            if (!timestampMatch.Success
                || !DateTime.TryParseExact(
                    timestampMatch.Groups["time"].Value,
                    "HH:mm:ss dd/MM/yyyy",
                    VietnameseCulture,
                    DateTimeStyles.None,
                    out var parsedTime))
            {
                throw new JsonException($"{GoldMarketSource} did not return a valid gold price update time.");
            }

            var headerIndex = html.IndexOf("Loại vàng", StringComparison.OrdinalIgnoreCase);
            var tableStart = headerIndex < 0
                ? -1
                : html.LastIndexOf("<table", headerIndex, StringComparison.OrdinalIgnoreCase);
            var tableEnd = headerIndex < 0
                ? -1
                : html.IndexOf("</table>", headerIndex, StringComparison.OrdinalIgnoreCase);
            var bodyStartTag = headerIndex < 0
                ? -1
                : html.IndexOf("<tbody", headerIndex, StringComparison.OrdinalIgnoreCase);
            var bodyContentStart = bodyStartTag < 0 ? -1 : html.IndexOf('>', bodyStartTag);
            var bodyEnd = bodyContentStart < 0
                ? -1
                : html.IndexOf("</tbody>", bodyContentStart, StringComparison.OrdinalIgnoreCase);
            if (tableStart < 0 || tableEnd < 0 || bodyContentStart < tableStart
                || bodyEnd < bodyContentStart || bodyEnd > tableEnd)
            {
                throw new JsonException($"{GoldMarketSource} did not return a usable SJC gold price table.");
            }

            var body = html[(bodyContentStart + 1)..bodyEnd];
            var rows = Regex.Matches(
                body,
                @"<tr\b[^>]*>(?<cells>.*?)</tr>",
                RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.CultureInvariant,
                TimeSpan.FromSeconds(2));
            var quotes = new List<GoldMarketQuote>();
            var branchName = string.Empty;
            var branchRowsRemaining = 0;
            var priceTime = new DateTimeOffset(parsedTime, TimeSpan.FromHours(7))
                .ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture);

            foreach (Match row in rows)
            {
                var rowHtml = row.Groups["cells"].Value;
                var branchMatch = Regex.Match(
                    rowHtml,
                    @"<th\b[^>]*rowspan\s*=\s*[""']?(?<count>\d+)[""']?[^>]*>(?<name>.*?)</th>",
                    RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.CultureInvariant,
                    TimeSpan.FromSeconds(2));
                if (branchMatch.Success)
                {
                    branchName = WebUtility.HtmlDecode(
                        Regex.Replace(branchMatch.Groups["name"].Value, "<[^>]+>", string.Empty)).Trim();
                    branchRowsRemaining = int.Parse(branchMatch.Groups["count"].Value, CultureInfo.InvariantCulture);
                }

                var cells = Regex.Matches(
                    rowHtml,
                    @"<td\b[^>]*>(?<value>.*?)</td>",
                    RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.CultureInvariant,
                    TimeSpan.FromSeconds(2));
                if (string.Equals(branchName, "Hồ Chí Minh", StringComparison.OrdinalIgnoreCase)
                    && cells.Count == 3)
                {
                    var assetName = WebUtility.HtmlDecode(
                        Regex.Replace(cells[0].Groups["value"].Value, "<[^>]+>", string.Empty)).Trim();
                    var buyText = WebUtility.HtmlDecode(
                        Regex.Replace(cells[1].Groups["value"].Value, "<[^>]+>", string.Empty)).Trim();
                    var sellText = WebUtility.HtmlDecode(
                        Regex.Replace(cells[2].Groups["value"].Value, "<[^>]+>", string.Empty)).Trim();
                    if (string.IsNullOrWhiteSpace(assetName)
                        || !decimal.TryParse(buyText, NumberStyles.Number, VietnameseCulture, out var buyThousandsPerLuong)
                        || !decimal.TryParse(sellText, NumberStyles.Number, VietnameseCulture, out var sellThousandsPerLuong)
                        || buyThousandsPerLuong <= 0
                        || sellThousandsPerLuong < buyThousandsPerLuong)
                    {
                        throw new JsonException($"{GoldMarketSource} returned invalid SJC gold prices.");
                    }

                    quotes.Add(new GoldMarketQuote(
                        assetName,
                        branchName,
                        decimal.Round(buyThousandsPerLuong * 100m, 2),
                        decimal.Round(sellThousandsPerLuong * 100m, 2),
                        priceTime));
                }

                if (branchRowsRemaining > 0 && --branchRowsRemaining == 0)
                {
                    branchName = string.Empty;
                }
            }

            if (quotes.Count == 0)
            {
                throw new JsonException($"{GoldMarketSource} returned no SJC quotes for Hồ Chí Minh.");
            }

            return quotes
                .GroupBy(quote => quote.AssetName, StringComparer.OrdinalIgnoreCase)
                .Select(group => group.First())
                .OrderBy(quote => quote.AssetName, StringComparer.Ordinal)
                .ToList();
        }

        private static GoldMarketQuote? FindGoldQuote(
            IReadOnlyList<GoldMarketQuote> quotes,
            string? assetName)
        {
            return quotes.FirstOrDefault(quote =>
                string.Equals(quote.AssetName, assetName, StringComparison.OrdinalIgnoreCase));
        }

        private static bool IsAllowedInvestmentJar(FinancialJar jar)
        {
            return jar.JarName.Contains("Financial Freedom", StringComparison.OrdinalIgnoreCase)
                || jar.JarName.Contains("Tự do tài chính", StringComparison.OrdinalIgnoreCase)
                || jar.JarName.Contains("Long Term", StringComparison.OrdinalIgnoreCase)
                || jar.JarName.Contains("Tiết kiệm dài hạn", StringComparison.OrdinalIgnoreCase);
        }

        private async Task<Category> GetOrCreateInvestmentCategoryAsync(int jarId, string categoryName, string categoryType)
        {
            var category = await _context.Categories.FirstOrDefaultAsync(
                item => item.JarId == jarId
                    && item.Type == categoryType
                    && (item.Name.Contains("Đầu tư") || item.Name.Contains("Invest")));
            if (category != null)
            {
                return category;
            }

            category = new Category { Name = categoryName, Type = categoryType, JarId = jarId };
            _context.Categories.Add(category);
            return category;
        }

        private async Task<IActionResult> DuplicateGoldTransactionResultAsync(Guid idempotencyKey)
        {
            return await _context.Transactions.AnyAsync(
                    transaction => transaction.IdempotencyKey == idempotencyKey)
                ? Conflict("Giao dịch này đã được ghi nhận; hãy tải lại danh mục để xem số dư mới.")
                : StatusCode(StatusCodes.Status500InternalServerError, "Không thể lưu giao dịch vàng.");
        }

        private IActionResult GoldMarketUnavailable(Exception exception, string operation)
        {
            _logger.LogWarning(exception, "{Source} gold price request failed during {Operation}.", GoldMarketSource, operation);
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                $"Không thể tải giá vàng thực tế từ {GoldMarketSource} (SJC); chưa thực hiện giao dịch. {exception.Message}");
        }

        [HttpGet("gold-market")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status502BadGateway)]
        [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
        public async Task<IActionResult> GetGoldMarket(CancellationToken cancellationToken)
        {
            try
            {
                var quotes = await GetGoldMarketQuotesAsync(cancellationToken);
                return Ok(new
                {
                    source = GoldMarketSource,
                    market = "SJC",
                    branch = "Hồ Chí Minh",
                    unit = GoldUnit,
                    priceTime = quotes[0].PriceTime,
                    tradingAvailable = IsGoldTradingSupportedByCurrentSchema,
                    tradingUnavailableReason = IsGoldTradingSupportedByCurrentSchema
                        ? null
                        : GoldTradingUnavailableMessage,
                    hasHistoricalChart = false,
                    items = quotes.Select(quote => new
                    {
                        assetName = quote.AssetName,
                        buyPrice = quote.BuyPrice,
                        sellPrice = quote.SellPrice,
                        quote.BranchName,
                        quote.PriceTime
                    })
                });
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (HttpRequestException ex)
            {
                return GoldMarketUnavailable(ex, "loading market quotes");
            }
            catch (TaskCanceledException ex)
            {
                return GoldMarketUnavailable(ex, "loading market quotes");
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "{Source} returned invalid gold price data.", GoldMarketSource);
                return StatusCode(StatusCodes.Status502BadGateway, $"{GoldMarketSource} trả về dữ liệu giá vàng không hợp lệ.");
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "{Source} gold price data is missing required fields.", GoldMarketSource);
                return StatusCode(StatusCodes.Status502BadGateway, $"{GoldMarketSource} thiếu trường dữ liệu giá vàng bắt buộc.");
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "{Source} gold price data contains invalid field values.", GoldMarketSource);
                return StatusCode(StatusCodes.Status502BadGateway, $"{GoldMarketSource} trả về trường dữ liệu giá vàng không hợp lệ.");
            }
        }

        [HttpGet("gold-holdings")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetGoldHoldings(CancellationToken cancellationToken)
        {
            if (!IsGoldTradingSupportedByCurrentSchema)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, GoldTradingUnavailableMessage);
            }

            var userId = GetCurrentUserId();
            var investments = await _context.Investments
                .Include(investment => investment.Jar)
                .Where(investment => investment.UserId == userId && investment.AssetType == "Vàng")
                .OrderByDescending(investment => investment.InvestDate)
                .ToListAsync(cancellationToken);

            var realizedProfitByInvestment = await _context.Transactions
                .Where(transaction => transaction.UserId == userId
                    && transaction.InvestmentId.HasValue
                    && transaction.RealizedProfitLoss.HasValue)
                .GroupBy(transaction => transaction.InvestmentId!.Value)
                .Select(group => new
                {
                    InvestmentId = group.Key,
                    Amount = group.Sum(transaction => transaction.RealizedProfitLoss!.Value),
                    CostBasis = group.Sum(transaction => transaction.Amount - transaction.RealizedProfitLoss!.Value)
                })
                .ToDictionaryAsync(
                    group => group.InvestmentId,
                    group => new { group.Amount, group.CostBasis },
                    cancellationToken);

            IReadOnlyList<GoldMarketQuote>? quotes = null;
            string? marketError = null;
            if (investments.Any(investment => (investment.Quantity ?? 0) > 0))
            {
                try
                {
                    quotes = await GetGoldMarketQuotesAsync(cancellationToken);
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException or KeyNotFoundException or InvalidOperationException)
                {
                    marketError = $"Không thể tải báo giá SJC từ {GoldMarketSource}; giá trị vàng chưa được định giá.";
                    _logger.LogWarning(ex, "Unable to value gold holdings for user {UserId}.", userId);
                }
            }

            var result = investments.Select(investment =>
            {
                var quantity = investment.Quantity ?? 0;
                var quote = quantity > 0 && quotes != null
                    ? FindGoldQuote(quotes, investment.AssetName)
                    : null;
                var realizedData = realizedProfitByInvestment.GetValueOrDefault(
                    investment.Id,
                    new { Amount = 0m, CostBasis = 0m });
                var isClosed = quantity == 0;
                var error = isClosed
                    ? null
                    : marketError ?? (quote == null ? $"{GoldMarketSource} hiện không có báo giá cho sản phẩm này." : null);
                return new
                {
                    investment.Id,
                    investment.AssetName,
                    investment.AssetType,
                    investment.AmountInvested,
                    currentValue = isClosed
                        ? 0m
                        : quote == null ? (decimal?)null : decimal.Round(quantity * quote.BuyPrice, 2),
                    investDate = investment.InvestDate,
                    investment.JarId,
                    jar = investment.Jar,
                    isMarketPriced = isClosed || quote != null,
                    marketDataError = error,
                    marketName = investment.AssetName,
                    marketSymbol = "SJC",
                    marketSource = GoldMarketSource,
                    marketPrice = quote?.BuyPrice,
                    marketSellPrice = quote?.SellPrice,
                    marketPurchasePrice = quantity > 0
                        ? decimal.Round((investment.AmountInvested ?? 0) / quantity, 2)
                        : (decimal?)null,
                    marketQuantity = quantity,
                    unit = GoldUnit,
                    marketPriceTime = quote?.PriceTime,
                    marketHistory = (IReadOnlyList<MarketPricePoint>?)null,
                    realizedProfitLoss = realizedData.Amount,
                    realizedCostBasis = realizedData.CostBasis,
                    isClosed
                };
            });

            return Ok(result);
        }

        [HttpPost("gold/buy")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status502BadGateway)]
        [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
        public async Task<IActionResult> BuyGold(
            GoldBuyRequest request,
            CancellationToken cancellationToken)
        {
            if (!IsGoldTradingSupportedByCurrentSchema)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, GoldTradingUnavailableMessage);
            }

            var userId = GetCurrentUserId();
            if (string.IsNullOrWhiteSpace(request.AssetName)
                || request.Quantity <= 0
                || request.Quantity != decimal.Round(request.Quantity, 6)
                || request.JarId <= 0
                || request.IdempotencyKey == Guid.Empty)
            {
                return BadRequest("Vui lòng chọn loại vàng, nhập số lượng tối đa 6 chữ số thập phân, hũ nguồn vốn và mã giao dịch hợp lệ.");
            }

            if (await _context.Transactions.AnyAsync(
                    transaction => transaction.IdempotencyKey == request.IdempotencyKey,
                    cancellationToken))
            {
                return Conflict("Giao dịch này đã được ghi nhận; hãy tải lại danh mục để xem số dư mới.");
            }

            GoldMarketQuote? quote;
            try
            {
                quote = FindGoldQuote(
                    await GetGoldMarketQuotesAsync(cancellationToken),
                    request.AssetName.Trim());
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (HttpRequestException ex)
            {
                return GoldMarketUnavailable(ex, "buying gold");
            }
            catch (TaskCanceledException ex)
            {
                return GoldMarketUnavailable(ex, "buying gold");
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "{Source} returned invalid gold price data during purchase.", GoldMarketSource);
                return StatusCode(StatusCodes.Status502BadGateway, $"{GoldMarketSource} trả về dữ liệu giá vàng không hợp lệ; chưa ghi nhận giao dịch.");
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "{Source} gold price data is missing required fields during purchase.", GoldMarketSource);
                return StatusCode(StatusCodes.Status502BadGateway, $"{GoldMarketSource} thiếu dữ liệu giá vàng bắt buộc; chưa ghi nhận giao dịch.");
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "{Source} gold price data contains invalid fields during purchase.", GoldMarketSource);
                return StatusCode(StatusCodes.Status502BadGateway, $"{GoldMarketSource} trả về dữ liệu giá vàng không hợp lệ; chưa ghi nhận giao dịch.");
            }

            if (quote == null)
            {
                return BadRequest($"Loại vàng đã chọn không có trong bảng giá SJC hiện tại trên {GoldMarketSource}.");
            }

            var amount = decimal.Round(request.Quantity * quote.SellPrice, 2);
            if (amount <= 0)
            {
                return BadRequest("Tổng tiền mua vàng phải lớn hơn 0.");
            }

            await using var transaction = await _context.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);
            try
            {
                var jar = await _context.FinancialJars
                    .FirstOrDefaultAsync(item => item.Id == request.JarId, cancellationToken);
                if (jar == null || !IsAllowedInvestmentJar(jar))
                {
                    return BadRequest("Hũ nguồn vốn đầu tư không hợp lệ.");
                }

                var availableBalance = await GetJarAvailableBalance(userId, jar.Id);
                if (availableBalance < amount)
                {
                    return BadRequest($"Hũ {jar.JarName} không đủ số dư (còn {availableBalance:N0}đ, cần {amount:N0}đ).");
                }

                var category = await GetOrCreateInvestmentCategoryAsync(jar.Id, "Đầu tư vàng", "Expense");
                var now = DateTime.Now;
                var investment = new Investment
                {
                    UserId = userId,
                    JarId = jar.Id,
                    AssetName = quote.AssetName,
                    AssetType = "Vàng",
                    Quantity = request.Quantity,
                    AmountInvested = amount,
                    CurrentValue = decimal.Round(request.Quantity * quote.BuyPrice, 2),
                    InvestDate = DateOnly.FromDateTime(now)
                };
                var moneyTransaction = new Transaction
                {
                    UserId = userId,
                    Category = category,
                    CategoryId = category.Id,
                    JarId = jar.Id,
                    Investment = investment,
                    Amount = amount,
                    Quantity = request.Quantity,
                    UnitPrice = quote.SellPrice,
                    IdempotencyKey = request.IdempotencyKey,
                    Type = "Expense",
                    TransactionDate = now,
                    Note = $"Mua {quote.AssetName}: {request.Quantity:0.######} {GoldUnit} x {quote.SellPrice:N0}đ/{GoldUnit} (SJC, {GoldMarketSource})"
                };

                _context.Investments.Add(investment);
                _context.Transactions.Add(moneyTransaction);
                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                return Ok(new
                {
                    message = "Mua vàng thành công.",
                    transactionDetails = new
                    {
                        investment.Id,
                        assetName = quote.AssetName,
                        quantity = request.Quantity,
                        unit = GoldUnit,
                        unitPrice = quote.SellPrice,
                        amount,
                        jarName = jar.JarName,
                        remainingBalance = await GetJarAvailableBalance(userId, jar.Id),
                        priceTime = quote.PriceTime,
                        time = now.ToString("HH:mm:ss dd/MM/yyyy", CultureInfo.InvariantCulture)
                    }
                });
            }
            catch (DbUpdateException ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                _context.ChangeTracker.Clear();
                var duplicateResult = await DuplicateGoldTransactionResultAsync(request.IdempotencyKey);
                if (duplicateResult is ConflictObjectResult)
                {
                    return duplicateResult;
                }

                _logger.LogError(ex, "Failed to persist gold purchase {IdempotencyKey}.", request.IdempotencyKey);
                return duplicateResult;
            }
        }

        [HttpPost("gold/{id:int}/sell")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status502BadGateway)]
        [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
        public async Task<IActionResult> SellGold(
            int id,
            GoldSellRequest request,
            CancellationToken cancellationToken)
        {
            if (!IsGoldTradingSupportedByCurrentSchema)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, GoldTradingUnavailableMessage);
            }

            var userId = GetCurrentUserId();
            if (request.Quantity <= 0
                || request.Quantity != decimal.Round(request.Quantity, 6)
                || request.JarId <= 0
                || request.IdempotencyKey == Guid.Empty)
            {
                return BadRequest("Vui lòng nhập số lượng bán tối đa 6 chữ số thập phân, hũ nhận tiền và mã giao dịch hợp lệ.");
            }

            if (await _context.Transactions.AnyAsync(
                    transaction => transaction.IdempotencyKey == request.IdempotencyKey,
                    cancellationToken))
            {
                return Conflict("Giao dịch này đã được ghi nhận; hãy tải lại danh mục để xem số dư mới.");
            }

            GoldMarketQuote? quote;
            try
            {
                var investmentName = await _context.Investments
                    .Where(investment => investment.Id == id
                        && investment.UserId == userId
                        && investment.AssetType == "Vàng")
                    .Select(investment => investment.AssetName)
                    .FirstOrDefaultAsync(cancellationToken);
                if (investmentName == null)
                {
                    return NotFound("Không tìm thấy khoản vàng đang nắm giữ.");
                }

                quote = FindGoldQuote(
                    await GetGoldMarketQuotesAsync(cancellationToken),
                    investmentName);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (HttpRequestException ex)
            {
                return GoldMarketUnavailable(ex, "selling gold");
            }
            catch (TaskCanceledException ex)
            {
                return GoldMarketUnavailable(ex, "selling gold");
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "{Source} returned invalid gold price data during sale.", GoldMarketSource);
                return StatusCode(StatusCodes.Status502BadGateway, $"{GoldMarketSource} trả về dữ liệu giá vàng không hợp lệ; chưa thực hiện bán.");
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "{Source} gold price data is missing required fields during sale.", GoldMarketSource);
                return StatusCode(StatusCodes.Status502BadGateway, $"{GoldMarketSource} thiếu dữ liệu giá vàng bắt buộc; chưa thực hiện bán.");
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "{Source} gold price data contains invalid fields during sale.", GoldMarketSource);
                return StatusCode(StatusCodes.Status502BadGateway, $"{GoldMarketSource} trả về dữ liệu giá vàng không hợp lệ; chưa thực hiện bán.");
            }

            if (quote == null)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, $"{GoldMarketSource} hiện không có báo giá SJC cho sản phẩm vàng đang nắm giữ; chưa thực hiện bán.");
            }

            await using var transaction = await _context.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);
            try
            {
                var investment = await _context.Investments
                    .FirstOrDefaultAsync(item => item.Id == id
                        && item.UserId == userId
                        && item.AssetType == "Vàng",
                        cancellationToken);
                if (investment == null)
                {
                    return NotFound("Không tìm thấy khoản vàng đang nắm giữ.");
                }

                var holdingQuantity = investment.Quantity ?? 0;
                if (request.Quantity > holdingQuantity)
                {
                    return BadRequest($"Số lượng bán vượt quá số vàng đang nắm giữ ({holdingQuantity:0.######} {GoldUnit}).");
                }

                var jar = await _context.FinancialJars
                    .FirstOrDefaultAsync(item => item.Id == request.JarId, cancellationToken);
                if (jar == null || !IsAllowedInvestmentJar(jar))
                {
                    return BadRequest("Hũ nhận tiền không hợp lệ.");
                }

                var amountInvested = investment.AmountInvested ?? 0;
                var costBasisSold = request.Quantity == holdingQuantity
                    ? amountInvested
                    : decimal.Round(amountInvested * request.Quantity / holdingQuantity, 2);
                var amountReceived = decimal.Round(request.Quantity * quote.BuyPrice, 2);
                var realizedProfitLoss = amountReceived - costBasisSold;
                var remainingQuantity = holdingQuantity - request.Quantity;
                var remainingCostBasis = amountInvested - costBasisSold;
                var now = DateTime.Now;
                var category = await GetOrCreateInvestmentCategoryAsync(jar.Id, "Thu nhập đầu tư", "Income");

                investment.Quantity = remainingQuantity;
                investment.AmountInvested = remainingCostBasis;
                investment.CurrentValue = decimal.Round(remainingQuantity * quote.BuyPrice, 2);
                var moneyTransaction = new Transaction
                {
                    UserId = userId,
                    Category = category,
                    CategoryId = category.Id,
                    JarId = jar.Id,
                    Investment = investment,
                    Amount = amountReceived,
                    Quantity = request.Quantity,
                    UnitPrice = quote.BuyPrice,
                    RealizedProfitLoss = realizedProfitLoss,
                    IdempotencyKey = request.IdempotencyKey,
                    Type = "Income",
                    TransactionDate = now,
                    Note = $"Bán {quote.AssetName}: {request.Quantity:0.######} {GoldUnit} x {quote.BuyPrice:N0}đ/{GoldUnit} (SJC, {GoldMarketSource}); lãi/lỗ {realizedProfitLoss:N0}đ"
                };

                _context.Transactions.Add(moneyTransaction);
                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                return Ok(new
                {
                    message = "Bán vàng thành công.",
                    transactionDetails = new
                    {
                        investment.Id,
                        assetName = quote.AssetName,
                        quantity = request.Quantity,
                        unit = GoldUnit,
                        unitPrice = quote.BuyPrice,
                        amountReceived,
                        costBasisSold,
                        profitOrLoss = realizedProfitLoss,
                        remainingQuantity,
                        jarName = jar.JarName,
                        remainingBalance = await GetJarAvailableBalance(userId, jar.Id),
                        priceTime = quote.PriceTime,
                        time = now.ToString("HH:mm:ss dd/MM/yyyy", CultureInfo.InvariantCulture)
                    }
                });
            }
            catch (DbUpdateException ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                _context.ChangeTracker.Clear();
                var duplicateResult = await DuplicateGoldTransactionResultAsync(request.IdempotencyKey);
                if (duplicateResult is ConflictObjectResult)
                {
                    return duplicateResult;
                }

                _logger.LogError(ex, "Failed to persist gold sale {IdempotencyKey}.", request.IdempotencyKey);
                return duplicateResult;
            }
        }
    }
}