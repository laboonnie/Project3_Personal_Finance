import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import categoryApi from '../../api/categoryApi'; 
import { toast } from 'react-toastify';
import './Investments.css';

const InvestmentForm = ({ onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        assetName: '', assetType: '', amountInvested: '', categoryId: '', investDate: new Date().toISOString().split('T')[0]
    });
    
    const [loading, setLoading] = useState(false);
    const [ffaBalance, setFfaBalance] = useState(null); 

    useEffect(() => {
        const fetchFFABalance = async () => {
            try {
                const res = await api.get('/Investments/ffa-balance');
                setFfaBalance(res.data.balance);
                
                // Khóa cứng ID của hũ FFA vào form để lúc Mua sẽ trừ đúng hũ này
                setFormData(prev => ({ ...prev, categoryId: res.data.id }));
            } catch (error) {
                toast.error("An error occurred while fetching FFA balance!");
            }
        };
        fetchFFABalance();
    }, []);
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const formatMoney = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.categoryId) {
            toast.error('An error occurred while fetching FFA balance!');
            return;
        }

        if (Number(formData.amountInvested) > ffaBalance) {
            toast.error('The investment amount cannot exceed the balance in the FFA fund!');
            return;
        }

        setLoading(true);
        const payload = { ...formData, amountInvested: Number(formData.amountInvested), categoryId: Number(formData.categoryId) };

        try {
            const res = await api.post('/Investments', payload);
            const details = res.data.transactionDetails;
            
            toast.success(
                <div>
                    <strong>💸 Purchase successful!</strong><br/>
                    Amount deducted: <b>{formatMoney(details.amount)}</b><br/>
                    Remaining FFA balance: <b style={{color: '#059669'}}>{formatMoney(details.remainingBalance)}</b><br/>
                    <small style={{color: '#666'}}>Time: {details.time}</small>
                </div>, 
                { autoClose: 5000 }
            );
            
            onSuccess(); 
        } catch (error) {
            toast.error(error.response?.data || 'An error occurred while adding the investment!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="investment-form-container">
            <h3>Purchase New Investment Assets ➕</h3>
            <p className="text-muted" style={{ fontSize: '13px', marginBottom: '20px' }}>
                The investment funds will be extracted solely from the jar. <b>Financial Freedom</b>.
            </p>

            <form onSubmit={handleSubmit}>
                <div className="form-grid">
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        {/* THẺ HIỂN THỊ SỐ DƯ HIỆN ĐẠI (THAY THẾ SELECT) */}
                        <div className="ffa-balance-card">
                            <div className="ffa-icon">💎</div>
                            <div className="ffa-details">
                                <span className="ffa-label">Source of funds: Financial Freedom</span>
                                <span className="ffa-amount">
                                    {ffaBalance !== null ? formatMoney(ffaBalance) : 'Loading...'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Asset Name (Stock Code, Project Name...)</label>
                        <input type="text" name="assetName" value={formData.assetName} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <label>Asset Type</label>
                        <select name="assetType" value={formData.assetType} onChange={handleChange} required>
                            <option value="">-- Select Asset Type --</option>
                            <option value="Cổ phiếu">Stocks</option>
                            <option value="Bất động sản">Real Estate</option>
                            <option value="Tiền mã hóa">Cryptocurrency</option>
                            <option value="Vàng">Gold</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Investment Amount (VNĐ)</label>
                        <input type="number" name="amountInvested" value={formData.amountInvested} onChange={handleChange} required min="1000" />
                    </div>

                    <div className="form-group">
                        <label>Investment Date</label>
                        <input type="date" name="investDate" value={formData.investDate} onChange={handleChange} required />
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" disabled={loading || ffaBalance === null} className="btn-submit">
                        {loading ? 'Processing...' : 'Confirm Purchase'}
                    </button>
                    <button type="button" onClick={onCancel} className="btn-cancel">Cancel</button>
                </div>
            </form>
        </div>
    );
};

export default InvestmentForm;