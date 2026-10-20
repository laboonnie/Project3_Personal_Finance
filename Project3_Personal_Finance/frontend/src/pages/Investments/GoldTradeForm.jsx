import React, { useEffect, useState } from 'react';
import api from '../../api/api';
import { toast } from 'react-toastify';

const GoldTradeForm = ({ quote, allowedJars, onSuccess, onCancel }) => {
    const [quantity, setQuantity] = useState('');
    const [jarId, setJarId] = useState(allowedJars[0]?.jarId || '');
    const [loading, setLoading] = useState(false);
    const [idempotencyKey] = useState(() => window.crypto.randomUUID());
    const selectedJar = allowedJars.find(jar => jar.jarId === Number(jarId));
    const estimatedAmount = Number(quantity || 0) * Number(quote.sellPrice || 0);
    const formatMoney = amount => new Intl.NumberFormat('vi-VN').format(amount || 0) + 'đ';

    useEffect(() => {
        if (!allowedJars.some(jar => jar.jarId === Number(jarId)) && allowedJars.length > 0) {
            setJarId(allowedJars[0].jarId);
        }
    }, [allowedJars, jarId]);

    const handleSubmit = async event => {
        event.preventDefault();
        if (!jarId || !quantity || Number(quantity) <= 0) {
            toast.error('Vui lòng chọn hũ nguồn vốn và nhập số lượng vàng hợp lệ.');
            return;
        }
        if (selectedJar && estimatedAmount > selectedJar.balance) {
            toast.error('Số dư hũ nguồn vốn không đủ cho giao dịch này.');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/Investments/gold/buy', {
                assetName: quote.assetName,
                quantity: Number(quantity),
                jarId: Number(jarId),
                idempotencyKey
            });
            const details = response.data.transactionDetails;
            toast.success(
                `Đã mua ${details.quantity} ${details.unit} ${details.assetName} với giá ${formatMoney(details.unitPrice)}/${details.unit}. Còn ${formatMoney(details.remainingBalance)} trong hũ ${details.jarName}.`
            );
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data || 'Không thể hoàn tất giao dịch mua vàng.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="investment-form-container gold-trade-form">
            <h3>Mua vàng · {quote.assetName}</h3>
            <p className="text-muted">
                Giá SJC theo Giavang.org — bán ra: <b>{formatMoney(quote.sellPrice)}/{quote.unit}</b>. Mua vào: {formatMoney(quote.buyPrice)}/{quote.unit}.
                {' '}Cập nhật lúc {quote.priceTime}.
            </p>
            <form onSubmit={handleSubmit}>
                <div className="form-grid">
                    <div className="form-group">
                        <label htmlFor="gold-quantity">Số lượng ({quote.unit})</label>
                        <input
                            id="gold-quantity"
                            type="number"
                            min="0.000001"
                            max="1000000"
                            step="0.000001"
                            value={quantity}
                            onChange={event => setQuantity(event.target.value)}
                            required
                        />
                        <small>Tạm tính theo giá bán ra SJC từ Giavang.org: {formatMoney(estimatedAmount)}. Máy chủ sẽ xác nhận lại giá trước khi ghi nhận.</small>
                    </div>
                    <div className="form-group">
                        <label htmlFor="gold-source-jar">Hũ nguồn vốn</label>
                        <select
                            id="gold-source-jar"
                            value={jarId}
                            onChange={event => setJarId(Number(event.target.value))}
                            required
                        >
                            <option value="">-- Chọn hũ --</option>
                            {allowedJars.map(jar => (
                                <option key={jar.jarId} value={jar.jarId}>
                                    {jar.jarName} (Dư {formatMoney(jar.balance)})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="form-actions">
                    <button type="submit" className="btn-submit" disabled={loading || allowedJars.length === 0}>
                        {loading ? 'Đang xác nhận...' : 'Xác nhận mua vàng'}
                    </button>
                    <button type="button" className="btn-cancel" onClick={onCancel} disabled={loading}>Hủy</button>
                </div>
            </form>
        </div>
    );
};

export default GoldTradeForm;
