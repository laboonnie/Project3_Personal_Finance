import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/api';
import categoryApi from '../../api/categoryApi';
import InvestmentForm from './InvestmentForm';
import { toast } from 'react-toastify';
import './Investments.css';

const InvestmentList = () => {
    const [investments, setInvestments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [refresh, setRefresh] = useState(false);

    // State cho việc bán tài sản
    const [sellTarget, setSellTarget] = useState(null); 
    const [ffaCategoryId, setFfaCategoryId] = useState(null); // ID của hũ FFA để nhận tiền

    const fetchInvestments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/Investments');
            setInvestments(res.data);
            
            // Gọi API mới để lấy đúng ID của hũ FFA phục vụ cho nút Rút tiền
            const ffaRes = await api.get('/Investments/ffa-balance');
            setFfaCategoryId(ffaRes.data.id);

        } catch (error) { toast.error('Error fetching investment data'); } 
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchInvestments(); }, [fetchInvestments, refresh]);

    const formatMoney = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

    const handleSell = async () => {
        if (!ffaCategoryId) { toast.error('Error: FFA jar not found!'); return; }

        try {
            const res = await api.post(`/Investments/${sellTarget.id}/sell`, { categoryId: ffaCategoryId });
            
            const details = res.data.transactionDetails;
            toast.success(
                <div>
                    <strong>💰 Profit/Loss cut successful!</strong><br/>
                    Amount returned to FFA jar: <b>{formatMoney(details.amount)}</b><br/>
                    Remaining FFA balance: <b style={{color: '#059669'}}>{formatMoney(details.remainingBalance)}</b><br/>
                    <small style={{color: '#666'}}>Time: {details.time}</small>
                </div>, 
                { autoClose: 6000 }
            );

            setSellTarget(null);
            setRefresh(prev => !prev);
        } catch (err) { toast.error(err.response?.data || 'Error occurred while withdrawing funds!'); }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>⏳ Loading market data...</div>;

    return (
        <div className="investment-list-container">
            <div className="investment-header">
                <h3>Market & Portfolio</h3>
                <button className="btn-new-investment" onClick={() => setShowForm(true)}>➕ Buy Investment Asset</button>
            </div>

            {showForm && <InvestmentForm onSuccess={() => { setShowForm(false); setRefresh(prev => !prev); }} onCancel={() => setShowForm(false)} />}

            {investments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>📭 You have no investment assets yet.</div>
            ) : (
                <div className="investment-grid">
                    {investments.map(inv => {
                        const profit = inv.currentValue - inv.amountInvested;
                        const roi = ((profit / inv.amountInvested) * 100).toFixed(2);
                        const isProfit = profit >= 0;

                        return (
                            <div key={inv.id} className={`investment-card ${isProfit ? 'profit' : 'loss'}`}>
                                <div className="card-header">
                                    <div>
                                        <h4>{inv.assetName}</h4>
                                        <div className="date-text">Purchase Date: {new Date(inv.investDate).toLocaleDateString('vi-VN')}</div>
                                    </div>
                                    <span className="type-badge">{inv.assetType}</span>
                                </div>

                                <div className="card-body">
                                    <div className="value-row"><span>Investment Amount:</span><strong>{formatMoney(inv.amountInvested)}</strong></div>
                                    <div className="value-row" style={{ marginTop: '5px' }}>
                                        <span>Current Value:</span>
                                        <strong style={{ fontSize: '18px', color: isProfit ? '#059669' : '#dc2626' }}>{formatMoney(inv.currentValue)}</strong>
                                    </div>

                                    <div className={`profit-box ${isProfit ? 'profit' : 'loss'}`}>
                                        <span>{isProfit ? '▲ Profit' : '▼ Loss'} ({isProfit ? '+' : ''}{roi}%)</span>
                                        <span>{formatMoney(Math.abs(profit))}</span>
                                    </div>
                                    
                                    <button onClick={() => setSellTarget(inv)} className="btn-withdraw-investment">
                                        <i className="bi bi-cash-coin"></i> Close & Withdraw Money
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {sellTarget && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-light">
                                <h5 className="modal-title fw-bold">Confirm Withdrawal</h5>
                                <button type="button" className="btn-close" onClick={() => setSellTarget(null)}></button>
                            </div>
                            <div className="modal-body p-4 text-center">
                                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🏦</div>
                                <p style={{ fontSize: '16px' }}>
                                    You are withdrawing the asset <b>{sellTarget.assetName}</b>.
                                </p>
                                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
                                    The amount <b style={{ color: '#059669', fontSize: '18px' }}>{formatMoney(sellTarget.currentValue)}</b> will be transferred directly to the jar <br/><b>Financial Freedom (Financial Freedom)</b>.
                                </div>
                                <div className="d-flex gap-2">
                                    <button className="btn btn-primary w-100 fw-bold py-2" onClick={handleSell}>Confirm Withdrawal</button>
                                    <button className="btn btn-secondary w-100 py-2" onClick={() => setSellTarget(null)}>Cancel</button>
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