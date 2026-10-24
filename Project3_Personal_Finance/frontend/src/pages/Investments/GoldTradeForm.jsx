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
            toast.error('Please select a source jar and enter a valid gold quantity.');
            return;
        }
        if (selectedJar && estimatedAmount > selectedJar.balance) {
            toast.error('Insufficient balance in the source jar for this transaction.');
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
                `Bought ${details.quantity} ${details.unit} ${details.assetName} at ${formatMoney(details.unitPrice)}/${details.unit}. Remaining ${formatMoney(details.remainingBalance)} in jar ${details.jarName}.`
            );
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data || 'Could not complete the gold purchase transaction.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="investment-form-container gold-trade-form">
            <h3>Buy Gold · {quote.assetName}</h3>
            <p className="text-muted">
                SJC price via Giavang.org — sell price: <b>{formatMoney(quote.sellPrice)}/{quote.unit}</b>. Buy price: {formatMoney(quote.buyPrice)}/{quote.unit}.
                {' '}Updated at {quote.priceTime}.
            </p>
            <form onSubmit={handleSubmit}>
                <div className="form-grid">
                    <div className="form-group">
                        <label htmlFor="gold-quantity">Quantity ({quote.unit})</label>
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
                        <small>Estimated at SJC sell price via Giavang.org: {formatMoney(estimatedAmount)}. The server will reconfirm the price before recording.</small>
                    </div>
                    <div className="form-group">
                        <label htmlFor="gold-source-jar">Source Jar</label>
                        <select
                            id="gold-source-jar"
                            value={jarId}
                            onChange={event => setJarId(Number(event.target.value))}
                            required
                        >
                            <option value="">-- Select Jar --</option>
                            {allowedJars.map(jar => (
                                <option key={jar.jarId} value={jar.jarId}>
                                    {jar.jarName} (Available {formatMoney(jar.balance)})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="form-actions">
                    <button type="submit" className="btn-submit" disabled={loading || allowedJars.length === 0}>
                        {loading ? 'Confirming...' : 'Confirm Gold Purchase'}
                    </button>
                    <button type="button" className="btn-cancel" onClick={onCancel} disabled={loading}>Cancel</button>
                </div>
            </form>
        </div>
    );
};

export default GoldTradeForm;
