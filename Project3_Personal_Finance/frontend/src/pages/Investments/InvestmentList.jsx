import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/api';
import InvestmentForm from './InvestmentForm';
import { toast } from 'react-toastify';
import './Investments.css';

const InvestmentList = () => {
    const [investments, setInvestments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editData, setEditData] = useState(null); // Lưu data khi bấm nút Sửa
    const [refresh, setRefresh] = useState(false);

    const fetchInvestments = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/Investments');
            setInvestments(res.data);
        } catch (error) {
            toast.error('Lỗi tải danh mục đầu tư');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInvestments();
    }, [fetchInvestments, refresh]);

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa mục đầu tư này?')) {
            try {
                await api.delete(`/Investments/${id}`);
                setRefresh(prev => !prev);
                toast.success('Đã xóa thành công');
            } catch (err) {
                toast.error('Lỗi khi xóa!');
            }
        }
    };

    const handleSuccess = () => {
        setShowForm(false);
        setEditData(null);
        setRefresh(prev => !prev);
    };

    const handleEditClick = (inv) => {
        setEditData(inv);
        setShowForm(true);
        window.scrollTo(0, 0); // Cuộn lên đầu trang
    };

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>⏳ Đang tải dữ liệu...</div>;

    return (
        <div className="investment-list-container">
            <div className="investment-header">
                <h3>Danh mục Đầu tư</h3>
                <button className="btn-new-investment" onClick={() => { setEditData(null); setShowForm(true); }}>
                    ➕ Thêm Khoản Đầu Tư
                </button>
            </div>

            {showForm && (
                <InvestmentForm
                    initialData={editData}
                    onSuccess={handleSuccess}
                    onCancel={() => { setShowForm(false); setEditData(null); }}
                />
            )}

            {investments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    📭 Chưa có khoản đầu tư nào. Hãy thêm khoản đầu tiên của bạn!
                </div>
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
                                        <div className="date-text">Ngày đầu tư: {new Date(inv.investDate).toLocaleDateString('vi-VN')}</div>
                                    </div>
                                    <span className="type-badge">{inv.assetType}</span>
                                </div>

                                <div className="card-body">
                                    <div className="value-row">
                                        <span>Vốn ban đầu:</span>
                                        <strong>{formatMoney(inv.amountInvested)}</strong>
                                    </div>
                                    <div className="value-row">
                                        <span>Định giá hiện tại:</span>
                                        <strong>{formatMoney(inv.currentValue)}</strong>
                                    </div>

                                    <div className={`profit-box ${isProfit ? 'profit' : 'loss'}`}>
                                        <span>{isProfit ? '▲ Lãi' : '▼ Lỗ'} ({isProfit ? '+' : ''}{roi}%)</span>
                                        <span>{formatMoney(Math.abs(profit))}</span>
                                    </div>

                                    <div className="card-actions">
                                        <button onClick={() => handleEditClick(inv)} className="btn-icon" title="Sửa">✏️</button>
                                        <button onClick={() => handleDelete(inv.id)} className="btn-icon" title="Xóa">🗑️</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default InvestmentList;