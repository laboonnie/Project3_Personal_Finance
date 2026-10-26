import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/api';
import InvestmentForm from './InvestmentForm';
import GoldTradeForm from './GoldTradeForm';
import { toast } from 'react-toastify';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import './Investments.css';







const RANGE_OPTIONS = [
    { label: '1M', value: '1M' },
    { label: '6M', value: '6M' },
    { label: '1Y', value: '1Y' },
    { label: 'YTD', value: 'YTD' },
    { label: 'All', value: 'ALL' }
];
const CHART_COLORS = ['#4f7df3', '#11b981', '#f59e0b', '#9b6bdf', '#ec698b', '#20a4ad'];

const InvestmentList = () => {
    const [investments, setInvestments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [initialAsset, setInitialAsset] = useState(null);
    const [refresh, setRefresh] = useState(false);
    const [chartRange, setChartRange] = useState('1Y');
    const [compositionMode, setCompositionMode] = useState('type');
    const [popularStocks, setPopularStocks] = useState([]);
    const [marketLoading, setMarketLoading] = useState(true);
    const [marketError, setMarketError] = useState('');
    const [marketWarning, setMarketWarning] = useState('');
    const [marketRefresh, setMarketRefresh] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [searchWarning, setSearchWarning] = useState('');
    const [selectedStock, setSelectedStock] = useState(null);
    const [stockDetails, setStockDetails] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');
    const [goldQuotes, setGoldQuotes] = useState([]);
    const [selectedGold, setSelectedGold] = useState(null);
    const [goldMarketLoading, setGoldMarketLoading] = useState(true);
    const [goldMarketError, setGoldMarketError] = useState('');
    const [goldMarketRefresh, setGoldMarketRefresh] = useState(false);
    const [goldTradingAvailable, setGoldTradingAvailable] = useState(false);


        const [goldTradingUnavailableMessage, setGoldTradingUnavailableMessage] = useState(
        'Gold trading is temporarily locked because the current database schema does not store enough transaction data.'
    );
    const [showGoldForm, setShowGoldForm] = useState(false);

    // State cho modal bán tài sản
    const [sellTarget, setSellTarget] = useState(null); 
    const [allowedJars, setAllowedJars] = useState([]); // Danh sách hũ cho phép nhận tiền (FFA & LTS)
    const [selectedJarId, setSelectedJarId] = useState(''); // Hũ người dùng chọn để rút tiền về
    const [sellQuantity, setSellQuantity] = useState('');
    const [sellIdempotencyKey, setSellIdempotencyKey] = useState('');

    const fetchInvestments = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const res = await api.get('/Investments');
            setInvestments(res.data);
        } catch (error) {
            const status = error.response?.status;























                        const message = status
                ? `Could not load investment portfolio (HTTP ${status}).`
                : 'Could not connect to the investment portfolio API.';
            setLoadError(message);
            toast.error(message);
            setLoading(false);
            return;
        }

        try {
            const jarRes = await api.get('/Investments/allowed-jars');
            setAllowedJars(jarRes.data);
            if (jarRes.data.length > 0) {
                setSelectedJarId(jarRes.data[0].jarId); // Default to first jar
            }
        } catch (error) {
            const status = error.response?.status;
            toast.error(status
                ? `Could not load destination jars (HTTP ${status}).`
                : 'Could not connect to load destination jars.');
        } finally {
            setLoading(false); 
        }
    }, []);

    useEffect(() => { fetchInvestments(); }, [fetchInvestments, refresh]);

    useEffect(() => {
        const controller = new AbortController();
        setMarketLoading(true);
        setMarketError('');
        api.get('/Investments/market/popular', { signal: controller.signal })
            .then(res => {
                setPopularStocks(res.data.stocks);
                setSelectedStock(current => current || res.data.stocks[0] || null);
                setMarketError('');












                                setMarketWarning(res.data.unavailableCount > 0
                    ? `${res.data.unavailableCount} symbols have no recent quotes from Yahoo Finance.`
                    : '');
            })
            .catch(error => {
                if (error.code === 'ERR_CANCELED') return;
                setMarketError(error.response?.data || 'Could not load stock quotes from Yahoo Finance.');
            })
            .finally(() => {
                if (!controller.signal.aborted) setMarketLoading(false);
            });
        return () => controller.abort();
    }, [marketRefresh]);

    useEffect(() => {
        const controller = new AbortController();
        setGoldMarketLoading(true);
        setGoldMarketError('');
        setGoldTradingAvailable(false);
        setShowGoldForm(false);
        api.get('/Investments/gold-market', { signal: controller.signal })
            .then(res => {
                setGoldQuotes(res.data.items);
                setSelectedGold(current =>
                    res.data.items.find(item => item.assetName === current?.assetName)
                    || res.data.items[0]
                    || null);
                setGoldTradingAvailable(res.data.tradingAvailable === true);


















                                setGoldTradingUnavailableMessage(
                    res.data.tradingUnavailableReason
                    || 'Gold trading is temporarily locked because the current database schema does not store enough transaction data.'
                );
                if (res.data.tradingAvailable !== true) setShowGoldForm(false);
            })
            .catch(error => {
                if (error.code === 'ERR_CANCELED') return;
                setGoldQuotes([]);
                setSelectedGold(null);
                setGoldTradingAvailable(false);
                setShowGoldForm(false);
                setGoldMarketError(error.response?.data || 'Could not load real-time gold prices from Giavang.org.');
            })
            .finally(() => {
                if (!controller.signal.aborted) setGoldMarketLoading(false);
            });
        return () => controller.abort();
    }, [goldMarketRefresh]);

    useEffect(() => {
        const query = searchQuery.trim();
        if (query.length < 2) {
            setSearchResults([]);
            setSearchError('');
            setSearchWarning('');
            setSearchLoading(false);
            return undefined;
        }

        setSearchResults([]);
        setSearchError('');
        setSearchWarning('');
        setSearchLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            setSearchLoading(true);
            setSearchError('');
            setSearchWarning('');
            api.get('/Investments/market/search', { params: { q: query }, signal: controller.signal })





                                .then(res => {
                    setSearchResults(res.data.stocks);
                    setSearchWarning(res.data.unavailableCount > 0
                        ? `${res.data.unavailableCount} results have no quotes to display.`
                        : '');
                })
                .catch(error => {
                    if (error.code === 'ERR_CANCELED') return;
                    setSearchResults([]);
                    setSearchError(error.response?.data || 'Could not search for stocks on Yahoo Finance.');
                })





                .finally(() => {
                    if (!controller.signal.aborted) setSearchLoading(false);
                });
        }, 350);
        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [searchQuery]);

    useEffect(() => {
        if (!selectedStock) return undefined;
        const controller = new AbortController();
        setStockDetails(null);
        setDetailLoading(true);
        setDetailError('');













                api.get(`/Investments/market/${encodeURIComponent(selectedStock.symbol)}`, { signal: controller.signal })
            .then(res => setStockDetails(res.data))
            .catch(error => {
                if (error.code === 'ERR_CANCELED') return;
                setDetailError(error.response?.data || 'Could not load stock details and price history.');
            })
            .finally(() => {
                if (!controller.signal.aborted) setDetailLoading(false);
            });
        return () => controller.abort();
    }, [selectedStock]);

    const formatMoney = (amount) => new Intl.NumberFormat('vi-VN').format(amount || 0) + 'đ';
    const handleSelectStock = (stock) => {
        setSelectedStock(stock);
        setSearchQuery('');
        setSearchResults([]);
    };
    const handleStartStockInvestment = () => {
        if (!stockDetails) return;
        setShowGoldForm(false);
        setInitialAsset(stockDetails);
        setShowForm(true);
    };
    const pricedInvestments = investments.filter(inv => inv.isMarketPriced && Number.isFinite(Number(inv.currentValue)));
    const totalInvested = investments.reduce((total, inv) => total + Number(inv.amountInvested || 0), 0);
    const pricedInvested = pricedInvestments.reduce((total, inv) => total + Number(inv.amountInvested || 0), 0);
    const totalCurrentValue = pricedInvestments.reduce((total, inv) => total + Number(inv.currentValue), 0);
    const realizedProfitOrLoss = investments.reduce((total, inv) => total + Number(inv.realizedProfitLoss || 0), 0);
    const unrealizedProfitOrLoss = totalCurrentValue - pricedInvested;
    const totalProfitOrLoss = unrealizedProfitOrLoss + realizedProfitOrLoss;
    const realizedCostBasis = investments.reduce((total, inv) => total + Number(inv.realizedCostBasis || 0), 0);
    const roiCapital = pricedInvested + realizedCostBasis;
    const totalRoi = roiCapital > 0 ? (totalProfitOrLoss / roiCapital) * 100 : 0;
    const portfolioHistory = useMemo(() => {
        const dates = [...new Set(pricedInvestments.flatMap(inv =>
            (inv.marketHistory || []).map(point => point.date)
        ))].sort();

        return dates.map(date => {
            const value = pricedInvestments.reduce((total, inv) => {
                let point = null;
                (inv.marketHistory || []).forEach(item => {
                    if (item.date <= date) point = item;
                });
                if (!point || date < inv.investDate || !inv.marketPurchasePrice) return total;
                return total + Number(inv.amountInvested || 0) / Number(inv.marketPurchasePrice) * Number(point.close);
            }, 0);







            return {
            date,
            value: Math.round(value),
            label: new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' })
            };
        });
    }, [pricedInvestments]);
    const visiblePortfolioHistory = useMemo(() => {
        if (chartRange === 'ALL' || portfolioHistory.length === 0) return portfolioHistory;

        const now = new Date();
        const start = new Date(now);
        if (chartRange === 'YTD') {
            start.setMonth(0, 1);
        } else {
            start.setMonth(start.getMonth() - (chartRange === '1M' ? 1 : chartRange === '6M' ? 6 : 12));
        }

        const firstVisibleIndex = portfolioHistory.findIndex(point => new Date(`${point.date}T00:00:00`) >= start);
        if (firstVisibleIndex < 0) return [];
        if (firstVisibleIndex === 0) return portfolioHistory;
        return portfolioHistory.slice(firstVisibleIndex - 1);
    }, [chartRange, portfolioHistory]);







        const composition = useMemo(() => {
        const groups = new Map();
        pricedInvestments.forEach(inv => {
            const key = compositionMode === 'type'
                ? (inv.assetType || 'Other')
                : (inv.marketSymbol || inv.assetName || 'Asset');
            groups.set(key, (groups.get(key) || 0) + Number(inv.currentValue));
        });

        return [...groups.entries()]
            .map(([name, value]) => ({ name, value: Math.round(value) }))
            .sort((first, second) => second.value - first.value);
    }, [compositionMode, pricedInvestments]);
    const compositionTotal = composition.reduce((total, item) => total + item.value, 0);

    const handleOpenSellModal = (inv) => {
        if (inv.assetType === 'Vàng' && !goldTradingAvailable) return;
        setSellTarget(inv);
        setSellQuantity(inv.assetType === 'Vàng' ? String(inv.marketQuantity || '') : '');
        setSellIdempotencyKey(inv.assetType === 'Vàng' ? window.crypto.randomUUID() : '');
        // Ưu tiên chọn hũ ban đầu của tài sản đó nếu có trong danh sách
        if (inv.jarId && allowedJars.some(j => j.jarId === inv.jarId)) {
            setSelectedJarId(inv.jarId);
        } else if (allowedJars.length > 0) {
            setSelectedJarId(allowedJars[0].jarId);
        }
    };

    const handleSell = async () => {
        if (sellTarget.assetType === 'Vàng' && !goldTradingAvailable) {
            toast.info(goldTradingUnavailableMessage);
            return;
        }

















































































































































































































































































































































































































































































































































































































































































































                if (!selectedJarId) { 
            toast.error('Please select a Jar to receive the withdrawn funds!'); 
            return; 
        }

        if (sellTarget.assetType === 'Vàng') {
            if (!sellQuantity || Number(sellQuantity) <= 0 || Number(sellQuantity) > Number(sellTarget.marketQuantity)) {
                toast.error('Sale quantity must be greater than 0 and not exceed the gold holdings.');
                return;
            }
            try {
                const res = await api.post(`/Investments/gold/${sellTarget.id}/sell`, {
                    quantity: Number(sellQuantity),
                    jarId: Number(selectedJarId),
                    idempotencyKey: sellIdempotencyKey
                });
                const details = res.data.transactionDetails;
                toast.success(
                    `Sold ${details.quantity} ${details.unit} ${details.assetName}, received ${formatMoney(details.amountReceived)}. Realized Profit/Loss: ${details.profitOrLoss >= 0 ? '+' : '-'}${formatMoney(Math.abs(details.profitOrLoss))}.`
                );
                setSellTarget(null);
                setRefresh(previous => !previous);
            } catch (error) {
                toast.error(error.response?.data || 'Could not complete the gold sale transaction.');
            }
            return;
        }

        try {
            const res = await api.post(`/Investments/${sellTarget.id}/sell`, { jarId: Number(selectedJarId) });
            
            const details = res.data.transactionDetails;
            toast.success(
                <div>
                    <strong>💰 Sale / Withdrawal Successful!</strong><br/>
                    Asset: <b>{details.assetName}</b><br/>
                    Amount withdrawn to jar <b>{details.jarName}</b>: <b>{formatMoney(details.amountReceived)}</b><br/>
                    Profit/Loss: <b style={{ color: details.profitOrLoss >= 0 ? '#059669' : '#dc2626' }}>
                        {details.profitOrLoss >= 0 ? '+' : '-'}{formatMoney(Math.abs(details.profitOrLoss))}
                    </b><br/>
                    New jar balance: <b style={{ color: '#059669' }}>{formatMoney(details.remainingBalance)}</b><br/>
                    <small style={{ color: '#666' }}>Time: {details.time}</small>
                </div>, 
                { autoClose: 6000 }
            );

            setSellTarget(null);
            setRefresh(prev => !prev);
        } catch (err) { 
            toast.error(err.response?.data || 'An error occurred during withdrawal!'); 
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>⏳ Loading investment portfolio data...</div>;
    if (loadError) {
        return (
            <div className="investment-load-error" role="alert">
                <i className="bi bi-exclamation-triangle"></i>
                <strong>{loadError}</strong>
                <span>Could not determine portfolio data. Please check your login or server connection.</span>
                <button type="button" onClick={() => setRefresh(prev => !prev)}>Try Reloading</button>
            </div>
        );
    }

    return (
        <div className="investment-list-container">
            <div className="investment-header">
                <div>
                    <h3>Investment Portfolio</h3>
                    <p>Track your assets and investment performance</p>
                </div>
                <button
                    className="btn-new-investment"
                    onClick={() => {
                        setShowForm(prev => !prev);
                        setInitialAsset(null);
                        setShowGoldForm(false);
                    }}
                >
                    <i className={`bi ${showForm ? 'bi-x-lg' : 'bi-plus-lg'}`}></i>
                    {showForm ? 'Close Form' : 'Add Asset'}
                </button>
            </div>

            <div className="investment-summary">
                <div className="investment-summary-card summary-value">
                    <div className="summary-icon value-icon"><i className="bi bi-wallet2"></i></div>
                    <div className="summary-card-content">
                        <span>Total Portfolio Value</span>
                        <strong>{pricedInvestments.length > 0 ? formatMoney(totalCurrentValue) : 'No price data'}</strong>
                        <small>Market value of {pricedInvestments.length}/{investments.length} assets</small>
                    </div>
                </div>
                <div className="investment-summary-card summary-capital">
                    <div className="summary-icon capital-icon"><i className="bi bi-piggy-bank"></i></div>
                    <div className="summary-card-content">
                        <span>Total Invested Capital</span>
                        <strong>{formatMoney(totalInvested)}</strong>
                        <small>Total capital currently recorded</small>
                    </div>
                </div>
                <div className={`investment-summary-card summary-performance ${pricedInvested > 0 || realizedProfitOrLoss !== 0 ? (totalProfitOrLoss >= 0 ? 'profit' : 'loss') : ''}`}>
                    <div className="summary-icon performance-icon">
                        <i className={`bi ${totalProfitOrLoss >= 0 ? 'bi-graph-up-arrow' : 'bi-graph-down-arrow'}`}></i>
                    </div>
                    <div className="summary-card-content">
                        <span>Total Profit / Loss</span>
                        <strong>{pricedInvested > 0 || realizedProfitOrLoss !== 0
                            ? `${totalProfitOrLoss >= 0 ? '+' : '-'}${formatMoney(Math.abs(totalProfitOrLoss))}`
                            : 'No price data'}</strong>
                        <small>
                            Unrealized {unrealizedProfitOrLoss >= 0 ? '+' : '-'}{formatMoney(Math.abs(unrealizedProfitOrLoss))}
                            {' · '}Realized {realizedProfitOrLoss >= 0 ? '+' : '-'}{formatMoney(Math.abs(realizedProfitOrLoss))}
                            {roiCapital > 0 ? ` · ROI ${totalRoi >= 0 ? '+' : ''}${totalRoi.toFixed(2)}%` : ''}
                        </small>
                    </div>
                </div>
            </div>

            {investments.some(inv => !inv.isMarketPriced) && (
                <p className="investment-market-note">
                    Portfolio value and profit/loss are only calculated for assets with market quotes. Assets without price data are displayed separately and not included in these totals.
                </p>
            )}

            <section className="investment-market-browser investment-panel">
                <div className="market-browser-heading">
                    <div>
                        <h4>Explore Stocks</h4>
                        <span>Vietnam market prices updated from Yahoo Finance</span>
                    </div>
                    <label className="market-search">
                        <i className="bi bi-search"></i>
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={event => setSearchQuery(event.target.value)}
                            placeholder="Search by symbol or company name"
                            aria-label="Search stocks by symbol or name"
                        />
                        {searchLoading && <i className="bi bi-arrow-repeat market-search-spinner"></i>}
                    </label>
                </div>
                <div className="market-browser-grid">
                    <div className="market-stock-list">
                        {marketError ? (
                            <div className="market-inline-error" role="alert">
                                <i className="bi bi-exclamation-triangle"></i>
                                <span>{marketError}</span>
                                <button type="button" onClick={() => setMarketRefresh(previous => !previous)}>Retry</button>
                            </div>
                        ) : marketLoading ? (
                            <div className="market-stock-empty">Loading real-time stock prices...</div>
                        ) : popularStocks.length === 0 ? (
                            <div className="market-stock-empty">Yahoo Finance currently has no popular stocks with price data.</div>
                        ) : (
                            <>
                                <div className="market-stock-list-title">Popular Stocks</div>
                                {popularStocks.map(stock => (
                                    <button
                                        type="button"
                                        key={stock.symbol}
                                        className={`market-stock-row ${selectedStock?.symbol === stock.symbol ? 'active' : ''}`}
                                        onClick={() => handleSelectStock(stock)}
                                    >
                                        <span className="market-stock-symbol">{stock.symbol}</span>
                                        <span className="market-stock-name" title={stock.name}>{stock.name}</span>
                                        <span className="market-stock-price">
                                            <strong>{formatMoney(stock.currentPrice)}</strong>
                                            <small className={stock.changePercent >= 0 ? 'text-profit' : 'text-loss'}>
                                                {stock.changePercent >= 0 ? '+' : ''}{Number(stock.changePercent).toFixed(2)}%
                                            </small>
                                        </span>
                                    </button>
                                ))}
                                {marketWarning && <div className="market-data-warning">{marketWarning}</div>}
                            </>
                        )}

                        {searchQuery.trim().length >= 2 && (
                            <div className="market-search-results">
                                <div className="market-stock-list-title">Search Results</div>
                                {searchLoading ? (
                                    <div className="market-stock-empty">Searching on Yahoo Finance...</div>
                                ) : searchError ? (
                                    <div className="market-inline-error" role="alert">{searchError}</div>
                                ) : searchResults.length === 0 ? (
                                    <div className="market-stock-empty">No Vietnamese stocks found with price data.</div>
                                ) : searchResults.map(stock => (
                                    <button
                                        type="button"
                                        key={stock.symbol}
                                        className={`market-stock-row ${selectedStock?.symbol === stock.symbol ? 'active' : ''}`}
                                        onClick={() => handleSelectStock(stock)}
                                    >
                                        <span className="market-stock-symbol">{stock.symbol}</span>
                                        <span className="market-stock-name" title={stock.name}>{stock.name}</span>
                                        <span className="market-stock-price">
                                            <strong>{formatMoney(stock.currentPrice)}</strong>
                                            <small className={stock.changePercent >= 0 ? 'text-profit' : 'text-loss'}>
                                                {stock.changePercent >= 0 ? '+' : ''}{Number(stock.changePercent).toFixed(2)}%
                                            </small>
                                        </span>
                                    </button>
                                ))}
                                {searchWarning && <div className="market-data-warning">{searchWarning}</div>}
                            </div>
                        )}
                    </div>

                    <div className="market-stock-detail">
                        {!selectedStock ? (
                            <div className="market-stock-empty">Select a stock symbol to view price and chart.</div>
                        ) : (
                            <>
                                <div className="market-detail-heading">
                                    <div>
                                        <span className="market-detail-symbol">{selectedStock.symbol}</span>
                                        <h5>{stockDetails?.name || selectedStock.name}</h5>
                                    </div>
                                    <div className="market-detail-quote">
                                        <strong>
                                            {stockDetails ? formatMoney(stockDetails.currentPrice) : formatMoney(selectedStock.currentPrice)}
                                        </strong>
                                        {stockDetails && (
                                            <span className={stockDetails.changePercent >= 0 ? 'text-profit' : 'text-loss'}>
                                                {stockDetails.changePercent >= 0 ? '+' : ''}{Number(stockDetails.changePercent).toFixed(2)}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {detailLoading ? (
                                    <div className="market-detail-chart-empty">Loading detail data and price history...</div>
                                ) : detailError ? (
                                    <div className="market-inline-error" role="alert">{detailError}</div>
                                ) : stockDetails?.history?.length > 1 ? (
                                    <div className="market-detail-chart">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={stockDetails.history} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="stockMarketPriceFill" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#4f7df3" stopOpacity={0.22} />
                                                        <stop offset="95%" stopColor="#4f7df3" stopOpacity={0.01} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid vertical={false} stroke="#edf1f7" strokeDasharray="3 4" />
                                                <XAxis
                                                    dataKey="date"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    minTickGap={28}
                                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                                    tickFormatter={date => new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    width={64}
                                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                                    tickFormatter={value => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value)}
                                                />
                                                <Tooltip
                                                    labelFormatter={date => new Date(`${date}T00:00:00`).toLocaleDateString('en-US')}
                                                    formatter={value => [formatMoney(value), 'Price']}
                                                />
                                                <Area type="monotone" dataKey="close" stroke="#4f7df3" strokeWidth={2} fill="url(#stockMarketPriceFill)" activeDot={{ r: 4 }} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="market-detail-chart-empty">The API does not have enough historical data to draw the chart.</div>
                                )}
                                <div className="market-detail-footer">
                                    <span><i className="market-live-dot"></i> Yahoo Finance quotes{stockDetails?.priceTime ? ` · ${stockDetails.priceTime}` : ''}</span>
                                    <button
                                        type="button"
                                        className="market-invest-button"
                                        disabled={!stockDetails || detailLoading}
                                        onClick={handleStartStockInvestment}
                                    >
                                        <i className="bi bi-plus-circle"></i> Invest
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </section>

            <section className="investment-market-browser investment-panel gold-market-browser">
                <div className="market-browser-heading">
                    <div>
                        <h4>Vietnam Gold Prices</h4>
                        <span>SJC prices in Ho Chi Minh City via Giavang.org · $/tael · Buy and Sell</span>
                    </div>
                    <button
                        type="button"
                        className="gold-refresh-button"
                        onClick={() => setGoldMarketRefresh(previous => !previous)}
                        disabled={goldMarketLoading}
                    >
                        <i className={`bi ${goldMarketLoading ? 'bi-arrow-repeat market-search-spinner' : 'bi-arrow-clockwise'}`}></i>
                        Update Prices
                    </button>
                </div>
                {goldMarketError ? (
                    <div className="market-inline-error" role="alert">
                        <i className="bi bi-exclamation-triangle"></i>
                        <span>{goldMarketError}</span>
                        <button type="button" onClick={() => setGoldMarketRefresh(previous => !previous)}>Retry</button>
                    </div>
                ) : goldMarketLoading ? (
                    <div className="market-stock-empty">Loading real-time SJC quotes from Giavang.org...</div>
                ) : goldQuotes.length === 0 ? (
                    <div className="market-stock-empty">Giavang.org currently has no SJC gold quotes.</div>
                ) : (
                    <div className="gold-market-content">
                        <label className="form-group">
                            <span>SJC gold type with quotes on Giavang.org</span>
                            <select
                                value={selectedGold?.assetName || ''}
                                onChange={event => setSelectedGold(goldQuotes.find(item => item.assetName === event.target.value) || null)}
                            >
                                {goldQuotes.map(quote => (
                                    <option key={quote.assetName} value={quote.assetName}>{quote.assetName}</option>
                                ))}
                            </select>
                        </label>
                        {selectedGold && (
                            <>
                                <div className="gold-market-rates">
                                    <div>
                                        <span>Provider Buys At</span>
                                        <strong>{formatMoney(selectedGold.buyPrice)} / tael</strong>
                                        <small>Reference price when you sell</small>
                                    </div>
                                    <div>
                                        <span>Provider Sells At</span>
                                        <strong>{formatMoney(selectedGold.sellPrice)} / tael</strong>
                                        <small>Price applied when you buy</small>
                                    </div>
                                </div>
                                <div className="gold-market-footer">
                                    <span><i className="market-live-dot"></i> Giavang.org · SJC · {selectedGold.branchName}</span>
                                    <span>Updated {selectedGold.priceTime}</span>
                                    {goldTradingAvailable && (
                                        <button
                                            type="button"
                                            className="market-invest-button"
                                            onClick={() => {
                                                setShowForm(false);
                                                setInitialAsset(null);
                                                setShowGoldForm(true);
                                            }}
                                            disabled={allowedJars.length === 0}
                                        >
                                            <i className="bi bi-plus-circle"></i> Buy Gold
                                        </button>
                                    )}
                                </div>
                                {!goldTradingAvailable && (
                                    <p className="gold-market-chart-note" role="status">
                                        {goldTradingUnavailableMessage}
                                    </p>
                                )}
                                <p className="gold-market-chart-note">
                                    Giavang.org provides the latest SJC quotes; no historical data is available from this source for charting.
                                </p>
                            </>
                        )}
                    </div>
                )}
            </section>

            {showGoldForm && goldTradingAvailable && selectedGold && (
                <GoldTradeForm
                    quote={{ ...selectedGold, unit: 'tael' }}
                    allowedJars={allowedJars}
                    onSuccess={() => {
                        setShowGoldForm(false);
                        setRefresh(previous => !previous);
                    }}
                    onCancel={() => setShowGoldForm(false)}
                />
            )}

            {showForm && (
                <div className="modal-overlay" onClick={() => { setShowForm(false); setInitialAsset(null); }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <InvestmentForm
                            key={initialAsset?.symbol || 'manual'}
                            initialAsset={initialAsset}
                            allowedJars={allowedJars}
                            onSuccess={() => {
                                setShowForm(false);
                                setInitialAsset(null);
                                setRefresh(prev => !prev);
                            }}
                            onCancel={() => {
                                setShowForm(false);
                                setInitialAsset(null);
                            }}
                        />
                    </div>
                </div>
            )}

            <div className="investment-dashboard-grid">
                <section className="investment-panel investment-assets-panel">
                    <div className="investment-panel-heading">
                        <div>
                            <h4>My Assets</h4>
                            <span>{investments.length} investments</span>
                        </div>
                        <i className="bi bi-three-dots"></i>
                    </div>

                    {investments.length === 0 ? (
                        <div className="investment-empty-state">
                            <i className="bi bi-safe2"></i>
                            <strong>Portfolio is empty</strong>
                            <span>Add investment assets to start tracking.</span>
                        </div>
                    ) : (
                        <div className="investment-assets-list">
                            <div className="investment-assets-columns">
                                <span>Asset</span>
                                <span>Value / Profit-Loss</span>
                            </div>
                            {investments.map(inv => {
                                const isPriced = inv.isMarketPriced && Number.isFinite(Number(inv.currentValue));
                                const invested = Number(inv.amountInvested || 0);
                                const value = isPriced ? Number(inv.currentValue) : null;
                                const profit = isPriced ? value - invested : null;
                                const roi = isPriced && invested > 0 ? (profit / invested * 100) : 0;
                                const isUnpricedStock = inv.assetType === 'Stock' && !isPriced;
                                const isUnpricedGold = inv.assetType === 'Gold' && !isPriced;
                                const displayName = inv.marketName || inv.assetName;

                                return (
                                    <div className="investment-asset-row" key={inv.id}>
                                        <div className="investment-asset-identity">
                                            <div className="asset-avatar">{(inv.marketSymbol || displayName || '?').slice(0, 1)}</div>
                                            <div className="investment-asset-name">
                                                <strong title={displayName}>{displayName}</strong>
                                                <span>{inv.isClosed ? 'Sold out' : `${inv.marketSymbol || inv.assetType || 'Asset'}${inv.unit ? ` · ${inv.unit}` : ''}`}</span>
                                                <small>Capital {formatMoney(invested)}</small>
                                                {isPriced && !inv.isClosed && (
                                                    inv.unit ? (
                                                        <small>
                                                            Qty {new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(inv.marketQuantity || 0)} {inv.unit}
                                                            {' · Avg Price '}{formatMoney(inv.marketPurchasePrice)}
                                                            {' → Current '}{formatMoney(inv.marketPrice)}
                                                        </small>
                                                    ) : (
                                                        <small>
                                                            Qty ~{new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(inv.marketQuantity || 0)}
                                                            {' · Buy '}{formatMoney(inv.marketPurchasePrice)}
                                                            {' → Current '}{formatMoney(inv.marketPrice)}
                                                        </small>
                                                    )
                                                )}
                                                {inv.unit && inv.marketPriceTime && !inv.isClosed && (
                                                    <small>Price updated {inv.marketPriceTime}</small>
                                                )}
                                                {Number(inv.realizedProfitLoss || 0) !== 0 && (
                                                    <small className={inv.realizedProfitLoss >= 0 ? 'text-profit' : 'text-loss'}>
                                                        Realized Profit/Loss {inv.realizedProfitLoss >= 0 ? '+' : '-'}{formatMoney(Math.abs(inv.realizedProfitLoss))}
                                                    </small>
                                                )}
                                            </div>
                                        </div>
                                        <div className="investment-asset-performance">
                                            <strong>{isPriced ? formatMoney(value) : 'No price'}</strong>
                                            {isPriced ? (
                                                <span className={profit >= 0 ? 'text-profit' : 'text-loss'}>
                                                    {profit >= 0 ? '+' : '-'}{formatMoney(Math.abs(profit))} ({roi >= 0 ? '+' : ''}{roi.toFixed(2)}%)
                                                </span>
                                            ) : (
                                                <span className="text-unpriced" title={inv.marketDataError}>
                                                    {inv.marketDataError || 'No price data'}
                                                </span>
                                            )}
                                            {inv.assetType !== 'Gold' || goldTradingAvailable ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenSellModal(inv)}
                                                    disabled={isUnpricedStock || isUnpricedGold || inv.isClosed}
                                                    className="asset-sell-button"
                                                    title={isUnpricedStock
                                                        ? 'Cannot sell stocks without market price.'
                                                        : isUnpricedGold ? 'Cannot sell gold without SJC quotes.' : 'Sell and Withdraw'}
                                                >
                                                    <i className="bi bi-box-arrow-up-right"></i>
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="investment-panel investment-history-panel">
                    <div className="investment-panel-heading">
                        <div>
                            <h4>Portfolio Value</h4>
                            <span>Yahoo Finance history; Giavang.org provides current SJC quotes</span>
                        </div>
                        <div className="chart-range-tabs" role="group" aria-label="Chart time range">
                            {RANGE_OPTIONS.map(option => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setChartRange(option.value)}
                                    className={chartRange === option.value ? 'active' : ''}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {visiblePortfolioHistory.length > 1 ? (
                        <div className="investment-chart-area">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={visiblePortfolioHistory} margin={{ top: 12, right: 10, left: 4, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="portfolioValueFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#4f7df3" stopOpacity={0.24} />
                                            <stop offset="95%" stopColor="#4f7df3" stopOpacity={0.01} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} stroke="#edf1f7" strokeDasharray="3 4" />
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={28} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        width={70}
                                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                                        tickFormatter={value => `${new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}đ`}
                                    />
                                    <Tooltip
                                        labelFormatter={(_, payload) => payload?.[0]?.payload?.date
                                            ? new Date(`${payload[0].payload.date}T00:00:00`).toLocaleDateString('en-US')
                                            : ''}
                                        formatter={value => [formatMoney(value), 'Portfolio Value']}
                                        contentStyle={{ border: '1px solid #e8edf5', borderRadius: 10, boxShadow: '0 8px 24px rgba(25, 45, 80, .12)' }}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#4f7df3" strokeWidth={2.5} fill="url(#portfolioValueFill)" activeDot={{ r: 5, strokeWidth: 0 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="investment-chart-empty">
                            <i className="bi bi-graph-up"></i>
                            <span>Not enough historical price data for charting.</span>
                        </div>
                    )}
                    <div className="chart-footnote">
                        <span><i className="market-live-dot"></i> Yahoo Finance (stocks) · Giavang.org/SJC has no history</span>
                        <span>{pricedInvestments.length} assets with current price</span>
                    </div>
                </section>

                <section className="investment-panel investment-composition-panel">
                    <div className="investment-panel-heading">
                        <div>
                            <h4>Asset Composition</h4>
                            <span>Allocation by market value</span>
                        </div>
                        <div className="composition-mode-tabs" role="group" aria-label="Asset composition grouping">
                            <button type="button" onClick={() => setCompositionMode('type')} className={compositionMode === 'type' ? 'active' : ''}>By Type</button>
                            <button type="button" onClick={() => setCompositionMode('asset')} className={compositionMode === 'asset' ? 'active' : ''}>By Asset</button>
                        </div>
                    </div>
                    {composition.length > 0 ? (
                        <div className="investment-composition-content">
                            <div className="investment-donut">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={composition} dataKey="value" nameKey="name" innerRadius="69%" outerRadius="91%" paddingAngle={3} stroke="none">
                                            {composition.map((item, index) => (
                                                <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={value => [formatMoney(value), 'Value']} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="investment-donut-center">
                                    <span>Total Value</span>
                                    <strong>{formatMoney(compositionTotal)}</strong>
                                </div>
                            </div>
                            <div className="investment-composition-legend">
                                {composition.map((item, index) => (
                                    <div className="composition-legend-item" key={item.name}>
                                        <span className="composition-color" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></span>
                                        <span className="composition-name" title={item.name}>{item.name}</span>
                                        <strong>{compositionTotal > 0 ? (item.value / compositionTotal * 100).toFixed(1) : '0.0'}%</strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="investment-chart-empty">
                            <i className="bi bi-pie-chart"></i>
                            <span>No assets priced yet to display composition.</span>
                        </div>
                    )}
                </section>
            </div>

            {/* Sell Confirmation Modal */}
            {sellTarget && (sellTarget.assetType !== 'Gold' || goldTradingAvailable) && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-light">
                                <h5 className="modal-title fw-bold">Confirm Sale & Withdrawal</h5>
                                <button type="button" className="btn-close" onClick={() => setSellTarget(null)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <div className="text-center" style={{ fontSize: '40px', marginBottom: '10px' }}>🏦</div>
                                <p className="text-center" style={{ fontSize: '16px' }}>
                                    {sellTarget.assetType === 'Gold' ? (
                                        <>Giavang.org reports SJC buy price for <b>{sellTarget.marketName || sellTarget.assetName}</b> at
                                            <b style={{ color: '#059669', fontSize: '18px' }}> {formatMoney(sellTarget.marketPrice)}/{sellTarget.unit}</b>.
                                            {' '}Holding {sellTarget.marketQuantity} {sellTarget.unit}.</>
                                    ) : sellTarget.isMarketPriced ? (
                                        <>You are closing the asset <b>{sellTarget.marketName || sellTarget.assetName}</b> with a value of
                                            <b style={{ color: '#059669', fontSize: '18px' }}> {formatMoney(sellTarget.currentValue)}</b>.</>
                                    ) : (
                                        <>Asset <b>{sellTarget.assetName}</b> does not have market price API. Amount received will equal invested capital:
                                            <b style={{ color: '#059669', fontSize: '18px' }}> {formatMoney(sellTarget.amountInvested)}</b>.</>
                                    )}
                                </p>

                                {sellTarget.assetType === 'Gold' && goldTradingAvailable && (
                                    <div className="mb-3 text-start">
                                        <label className="form-label fw-bold small" htmlFor="gold-sell-quantity">
                                            Sale Quantity ({sellTarget.unit})
                                        </label>
                                        <input
                                            id="gold-sell-quantity"
                                            className="form-control"
                                            type="number"
                                            min="0.000001"
                                            max={sellTarget.marketQuantity}
                                            step="0.000001"
                                            value={sellQuantity}
                                            onChange={event => setSellQuantity(event.target.value)}
                                        />
                                    </div>
                                )}

                                {/* Destination Jar Selection */}
                                <div className="mb-3 text-start">
                                    <label className="form-label fw-bold small">Select Destination Jar:</label>
                                    <select 
                                        className="form-select fw-semibold"
                                        value={selectedJarId}
                                        onChange={(e) => setSelectedJarId(e.target.value)}
                                    >
                                        {allowedJars.map(j => (
                                            <option key={j.jarId} value={j.jarId}>
                                                {j.jarName} (Balance: {formatMoney(j.balance)})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="d-flex gap-2 mt-4">
                                    <button
                                        className="btn btn-primary w-100 fw-bold py-2"
                                        onClick={handleSell}
                                        disabled={sellTarget.assetType === 'Gold'
                                            && (!goldTradingAvailable || !sellQuantity || Number(sellQuantity) <= 0 || Number(sellQuantity) > Number(sellTarget.marketQuantity))}
                                    >
                                        {sellTarget.assetType === 'Gold' ? 'Confirm Gold Sale' : 'Confirm Withdrawal'}
                                    </button>
                                    <button className="btn btn-secondary w-100 py-2" onClick={() => setSellTarget(null)}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvestmentList;