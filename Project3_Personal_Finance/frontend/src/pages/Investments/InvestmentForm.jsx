import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { toast } from 'react-toastify';
import './Investments.css';

const InvestmentForm = ({ onSuccess, onCancel, initialAsset = null, allowedJars: suppliedJars }) => {
    const [formData, setFormData] = useState({
        assetName: initialAsset?.symbol || '',
        assetType: 'Cổ phiếu',
        amountInvested: '', 
        quantity: '',
        jarId: '', 
        investDate: new Date().toISOString().split('T')[0]
    });
    const [investmentMode, setInvestmentMode] = useState('amount');
    
    const [loading, setLoading] = useState(false);
    const [allowedJars, setAllowedJars] = useState(suppliedJars || []);
    const [selectedJarBalance, setSelectedJarBalance] = useState(null);

    useEffect(() => {
        if (suppliedJars) {
            setAllowedJars(suppliedJars);
            if (suppliedJars.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    jarId: suppliedJars.some(jar => jar.jarId === Number(prev.jarId))
                        ? prev.jarId
                        : suppliedJars[0].jarId
                }));
            }
            return;
        }

        const fetchAllowedJars = async () => {
            try {
                const res = await api.get('/Investments/allowed-jars');
                setAllowedJars(res.data);
                
                if (res.data.length > 0) {
                    const firstJar = res.data[0];
                    setFormData(prev => ({ ...prev, jarId: firstJar.jarId }));
                    setSelectedJarBalance(firstJar.balance);
                }
            } catch (error) {
                toast.error("Could not fetch investment jar information!");
            }
        };
        fetchAllowedJars();
    }, [suppliedJars]);

    useEffect(() => {
        const selectedJar = allowedJars.find(jar => jar.jarId === Number(formData.jarId));
        setSelectedJarBalance(selectedJar?.balance ?? (allowedJars.length === 0 ? null : 0));
    }, [allowedJars, formData.jarId]);

    const handleJarChange = (e) => {
        const jarId = Number(e.target.value);
        const jar = allowedJars.find(j => j.jarId === jarId);
        
        setFormData(prev => ({ ...prev, jarId }));
        setSelectedJarBalance(jar ? jar.balance : 0);
    };

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const formatMoney = (amount) => new Intl.NumberFormat('vi-VN').format(amount || 0) + 'đ';

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.jarId) {
            toast.error('Please select an investment jar!');
            return;
        }

        const estimatedAmount = investmentMode === 'quantity'
            ? Number(formData.quantity) * Number(initialAsset?.currentPrice || 0)
            : Number(formData.amountInvested);
        if (estimatedAmount > selectedJarBalance) {
            toast.error('Investment amount exceeds the available balance of the selected jar!');
            return;
        }

        setLoading(true);
        const payload = { 
            assetName: formData.assetName,
            assetType: formData.assetType,
            amountInvested: investmentMode === 'amount' ? Number(formData.amountInvested) : 0,
            quantity: investmentMode === 'quantity' ? Number(formData.quantity) : null,
            jarId: Number(formData.jarId),
            investDate: formData.investDate
        };

        try {
            const res = await api.post('/Investments', payload);
            const details = res.data.transactionDetails;
            
            toast.success(
                <div>
                    <strong>💸 Investment deposit successful!</strong><br/>
                    Asset: <b>{details.assetName}</b><br/>
                    Deducted from jar <b>{details.jarName}</b>: <b>{formatMoney(details.amount)}</b><br/>
                    Remaining jar balance: <b style={{ color: '#059669' }}>{formatMoney(details.remainingBalance)}</b><br/>
                    <small style={{ color: '#666' }}>Time: {details.time}</small>
                </div>, 
                { autoClose: 5000 }
            );
            
            onSuccess(); 
        } catch (error) {
            toast.error(error.response?.data || 'An error occurred while depositing the investment!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="investment-form-container">
            <h3>{initialAsset ? `Invest in ${initialAsset.symbol}` : 'Add Investment Asset'}</h3>
            <p className="text-muted" style={{ fontSize: '13px', marginBottom: '20px' }}>
                Investment funds can only be withdrawn from Financial Freedom or Long-Term Savings.
            </p>

            <form onSubmit={handleSubmit}>
                <div className="form-grid">
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="fw-bold mb-1">SELECT FUNDING SOURCE</label>
                        <select 
                            name="jarId" 
                            className="form-select mb-3" 
                            value={formData.jarId} 
                            onChange={handleJarChange} 
                            required
                        >
                            <option value="">-- Select Investment Jar --</option>
                            {allowedJars.map(jar => (
                                <option key={jar.jarId} value={jar.jarId}>
                                    {jar.jarName} (Available: {formatMoney(jar.balance)})
                                </option>
                            ))}
                        </select>

                        <div className="ffa-balance-card">
                            <div className="ffa-icon">💎</div>
                            <div className="ffa-details">
                                <span className="ffa-label">
                                    AVAILABLE FINANCIAL FREEDOM BALANCE
                                </span>
                                <span className="ffa-amount">
                                    {selectedJarBalance !== null ? formatMoney(selectedJarBalance) : 'Loading...'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>{formData.assetType === 'Cổ phiếu' ? 'VIETNAMESE STOCK TICKER' : 'Asset Name'}</label>
                        <input 
                            type="text" 
                            name="assetName" 
                            value={formData.assetName} 
                            onChange={handleChange} 
                            placeholder={formData.assetType === 'Cổ phiếu' ? 'e.g. FPT, VNM, HPG' : 'e.g. SJC Gold, Project...'}
                            readOnly={Boolean(initialAsset)}
                            required 
                        />
                        {formData.assetType === 'Cổ phiếu' && (
                            <small className="text-muted">Reference prices are based on Yahoo Finance's closing price on the investment date, or the most recent previous trading session.</small>
                        )}
                    </div>

                    <div className="form-group">
                        <label>ASSET CATEGORY</label>
                        <select name="assetType" value={formData.assetType} onChange={handleChange} required disabled={Boolean(initialAsset)}>
                            <option value="Cổ phiếu">Stocks</option>
                            <option value="Trái phiếu">Bonds</option>
                            <option value="Vàng">Gold</option>
                            <option value="Bất động sản">Real Estate</option>
                            <option value="Tiền mã hóa">Cryptocurrency (Crypto)</option>
                        </select>
                    </div>

                    {investmentMode === 'quantity' && initialAsset ? (
                        <div className="form-group">
                            <label>Quantity</label>
                            <input
                                type="number"
                                name="quantity"
                                value={formData.quantity}
                                onChange={handleChange}
                                placeholder="e.g. 100"
                                required
                                min="1"
                                step="1"
                            />
                        </div>
                    ) : (
                        <div className="form-group">
                            <label>PURCHASE AMOUNT (VND)</label>
                            <input
                                type="number"
                                name="amountInvested"
                                value={formData.amountInvested}
                                onChange={handleChange}
                                placeholder="Enter the investment amount"
                                required
                                min="1000"
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>INVESTMENT DATE</label>
                        <input 
                            type="date" 
                            name="investDate" 
                            value={formData.investDate} 
                            onChange={handleChange} 
                            required 
                            readOnly={Boolean(initialAsset)}
                        />
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" disabled={loading || selectedJarBalance === null} className="btn-submit">
                        {loading ? 'Processing...' : 'Confirm Investment'}
                    </button>
                    <button type="button" onClick={onCancel} className="btn-cancel">Cancel</button>
                </div>
            </form>
        </div>
    );
};

export default InvestmentForm;
