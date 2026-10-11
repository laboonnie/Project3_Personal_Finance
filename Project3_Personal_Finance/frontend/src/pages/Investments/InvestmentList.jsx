import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/api';
import InvestmentForm from './InvestmentForm';
import { toast } from 'react-toastify';
import './Investments.css';

const InvestmentList = () => {
    const [investments, setInvestments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [refresh, setRefresh] = useState(false);

    // State cho modal bán tài sản
    const [sellTarget, setSellTarget] = useState(null); 
    const [allowedJars, setAllowedJars] = useState([]); // Danh sách hũ cho phép nhận tiền (FFA & LTS)
    const [selectedJarId, setSelectedJarId] = useState(''); // Hũ người dùng chọn để rút tiền về

    const fetchInvestments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/Investments');
            setInvestments(res.data);
            
            // Gọi API lấy danh sách Hũ cho phép (FFA & LTS)
            const jarRes = await api.get('/Investments/allowed-jars');
            setAllowedJars(jarRes.data);
            if (jarRes.data.length > 0) {
                setSelectedJarId(jarRes.data[0].jarId); // Mặc định chọn hũ đầu tiên
            }

        } catch (error) { 
            toast.error('Lỗi khi tải dữ liệu thị trường & hũ đầu tư'); 
        } finally { 
            setLoading(false); 
        }
    }, []);

    useEffect(() => { fetchInvestments(); }, [fetchInvestments, refresh]);

    const formatMoney = (amount) => new Intl.NumberFormat('vi-VN').format(amount || 0) + 'đ';

    const handleOpenSellModal = (inv) => {
        setSellTarget(inv);
        // Ưu tiên chọn hũ ban đầu của tài sản đó nếu có trong danh sách
        if (inv.jarId && allowedJars.some(j => j.jarId === inv.jarId)) {
            setSelectedJarId(inv.jarId);
        } else if (allowedJars.length > 0) {
            setSelectedJarId(allowedJars[0].jarId);
        }
    };

    const handleSell = async () => {
        if (!selectedJarId) { 
            toast.error('Vui lòng chọn Hũ để nhận tiền rút!'); 
            return; 
        }

        try {
            const res = await api.post(`/Investments/${sellTarget.id}/sell`, { jarId: Number(selectedJarId) });
            
            const details = res.data.transactionDetails;
            toast.success(
                <div>
                    <strong>💰 Chốt lời / Rút vốn thành công!</strong><br/>
                    Tài sản: <b>{details.assetName}</b><br/>
                    Số tiền rút về hũ <b>{details.jarName}</b>: <b>{formatMoney(details.amountReceived)}</b><br/>
                    Lời/Lỗ: <b style={{ color: details.profitOrLoss >= 0 ? '#059669' : '#dc2626' }}>
                        {details.profitOrLoss >= 0 ? '+' : ''}{formatMoney(details.profitOrLoss)}
                    </b><br/>
                    Số dư hũ mới: <b style={{ color: '#059669' }}>{formatMoney(details.remainingBalance)}</b><br/>
                    <small style={{ color: '#666' }}>Thời gian: {details.time}</small>
                </div>, 
                { autoClose: 6000 }
            );

            setSellTarget(null);
            setRefresh(prev => !prev);
        } catch (err) { 
            toast.error(err.response?.data || 'Có lỗi xảy ra khi rút tiền!'); 
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>⏳ Đang tải dữ liệu danh mục đầu tư...</div>;

    return (
        <div className="investment-list-container">
            <div className="investment-header">
                <h3>Thị trường & Danh mục Đầu tư</h3>
                <button className="btn-new-investment" onClick={() => setShowForm(true)}>➕ Nạp / Mua Tài Sản Đầu Tư</button>
            </div>

            {showForm && (
                <InvestmentForm 
                    allowedJars={allowedJars}
                    onSuccess={() => { setShowForm(false); setRefresh(prev => !prev); }} 
                    onCancel={() => setShowForm(false)} 
                />
            )}

            {investments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>📭 Bạn chưa có tài sản đầu tư nào.</div>
            ) : (
                <div className="investment-grid">
                    {investments.map(inv => {
                        const profit = inv.currentValue - inv.amountInvested;
                        const roi = inv.amountInvested > 0 ? ((profit / inv.amountInvested) * 100).toFixed(2) : 0;
                        const isProfit = profit >= 0;

                        return (
                            <div key={inv.id} className={`investment-card ${isProfit ? 'profit' : 'loss'}`}>
                                <div className="card-header">
                                    <div>
                                        <h4>{inv.assetName}</h4>
                                        <div className="date-text">
                                            Ngày mua: {new Date(inv.investDate).toLocaleDateString('vi-VN')}
                                            {inv.jar?.jarName && <span className="ms-2 badge bg-light text-dark">Hũ: {inv.jar.jarName}</span>}
                                        </div>
                                    </div>
                                    <span className="type-badge">{inv.assetType}</span>
                                </div>

                                <div className="card-body">
                                    <div className="value-row"><span>Vốn đầu tư:</span><strong>{formatMoney(inv.amountInvested)}</strong></div>
                                    <div className="value-row" style={{ marginTop: '5px' }}>
                                        <span>Giá trị hiện tại:</span>
                                        <strong style={{ fontSize: '18px', color: isProfit ? '#059669' : '#dc2626' }}>{formatMoney(inv.currentValue)}</strong>
                                    </div>

                                    <div className={`profit-box ${isProfit ? 'profit' : 'loss'}`}>
                                        <span>{isProfit ? '▲ Lời' : '▼ Lỗ'} ({isProfit ? '+' : ''}{roi}%)</span>
                                        <span>{formatMoney(Math.abs(profit))}</span>
                                    </div>
                                    
                                    <button onClick={() => handleOpenSellModal(inv)} className="btn-withdraw-investment">
                                        <i className="bi bi-cash-coin"></i> Bán & Rút Tiền Về Hũ
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Xác Nhận Rút Tiền */}
            {sellTarget && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-light">
                                <h5 className="modal-title fw-bold">Xác Nhận Bán & Rút Tiền</h5>
                                <button type="button" className="btn-close" onClick={() => setSellTarget(null)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <div className="text-center" style={{ fontSize: '40px', marginBottom: '10px' }}>🏦</div>
                                <p className="text-center" style={{ fontSize: '16px' }}>
                                    Bạn đang chốt bán tài sản <b>{sellTarget.assetName}</b> với giá trị 
                                    <b style={{ color: '#059669', fontSize: '18px' }}> {formatMoney(sellTarget.currentValue)}</b>.
                                </p>

                                {/* Dropdown chọn hũ nhận tiền */}
                                <div className="mb-3 text-start">
                                    <label className="form-label fw-bold small">Chọn Hũ nhận tiền rút về:</label>
                                    <select 
                                        className="form-select fw-semibold"
                                        value={selectedJarId}
                                        onChange={(e) => setSelectedJarId(e.target.value)}
                                    >
                                        {allowedJars.map(j => (
                                            <option key={j.jarId} value={j.jarId}>
                                                {j.jarName} (Dư khả dụng: {formatMoney(j.balance)})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="d-flex gap-2 mt-4">
                                    <button className="btn btn-primary w-100 fw-bold py-2" onClick={handleSell}>
                                        Xác Nhận Rút Tiền
                                    </button>
                                    <button className="btn btn-secondary w-100 py-2" onClick={() => setSellTarget(null)}>
                                        Hủy
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