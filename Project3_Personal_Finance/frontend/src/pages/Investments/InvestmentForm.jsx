import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { toast } from 'react-toastify';
import './Investments.css';

const InvestmentForm = ({ onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        assetName: '', 
        assetType: 'Cổ phiếu', 
        amountInvested: '', 
        jarId: '', 
        investDate: new Date().toISOString().split('T')[0]
    });
    
    const [loading, setLoading] = useState(false);
    const [allowedJars, setAllowedJars] = useState([]); 
    const [selectedJarBalance, setSelectedJarBalance] = useState(null);

    // Lấy danh sách 2 Hũ cho phép (FFA & LTS) từ Backend
    useEffect(() => {
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
                toast.error("Không thể lấy thông tin hũ đầu tư!");
            }
        };
        fetchAllowedJars();
    }, []);

    // Xử lý khi thay đổi Hũ đầu tư
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
            toast.error('Vui lòng chọn Hũ dùng để đầu tư!');
            return;
        }

        if (Number(formData.amountInvested) > selectedJarBalance) {
            toast.error('Số tiền đầu tư vượt quá số dư khả dụng của Hũ đã chọn!');
            return;
        }

        setLoading(true);
        const payload = { 
            assetName: formData.assetName,
            assetType: formData.assetType,
            amountInvested: Number(formData.amountInvested), 
            jarId: Number(formData.jarId),
            investDate: formData.investDate
        };

        try {
            const res = await api.post('/Investments', payload);
            const details = res.data.transactionDetails;
            
            toast.success(
                <div>
                    <strong>💸 Nạp đầu tư thành công!</strong><br/>
                    Tài sản: <b>{details.assetName}</b><br/>
                    Số tiền trừ từ hũ <b>{details.jarName}</b>: <b>{formatMoney(details.amount)}</b><br/>
                    Số dư hũ còn lại: <b style={{ color: '#059669' }}>{formatMoney(details.remainingBalance)}</b><br/>
                    <small style={{ color: '#666' }}>Thời gian: {details.time}</small>
                </div>, 
                { autoClose: 5000 }
            );
            
            onSuccess(); 
        } catch (error) {
            toast.error(error.response?.data || 'Đã có lỗi xảy ra khi nạp đầu tư!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="investment-form-container">
            <h3>Mua / Nạp Tài Sản Đầu Tư Mới ➕</h3>
            <p className="text-muted" style={{ fontSize: '13px', marginBottom: '20px' }}>
                Nguồn vốn đầu tư chỉ được phép trích từ 2 hũ: <b>Tự do tài chính</b> hoặc <b>Tiết kiệm dài hạn</b>.
            </p>

            <form onSubmit={handleSubmit}>
                <div className="form-grid">
                    {/* CHỌN HŨ ĐẦU TƯ & HIỂN THỊ SỐ DƯ */}
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="fw-bold mb-1">Chọn Hũ Nguồn Vốn Đầu Tư:</label>
                        <select 
                            name="jarId" 
                            className="form-select mb-3" 
                            value={formData.jarId} 
                            onChange={handleJarChange} 
                            required
                        >
                            <option value="">-- Chọn Hũ Đầu Tư --</option>
                            {allowedJars.map(jar => (
                                <option key={jar.jarId} value={jar.jarId}>
                                    {jar.jarName} (Dư khả dụng: {formatMoney(jar.balance)})
                                </option>
                            ))}
                        </select>

                        {/* THẺ HIỂN THỊ SỐ DƯ KHI CHỌN HŨ */}
                        <div className="ffa-balance-card">
                            <div className="ffa-icon">💎</div>
                            <div className="ffa-details">
                                <span className="ffa-label">
                                    Số dư khả dụng hũ {allowedJars.find(j => j.jarId === Number(formData.jarId))?.jarName || 'chọn'}:
                                </span>
                                <span className="ffa-amount">
                                    {selectedJarBalance !== null ? formatMoney(selectedJarBalance) : 'Đang tải...'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Tên Tài Sản (Tên Cổ phiếu, Vàng, Dự án...)</label>
                        <input 
                            type="text" 
                            name="assetName" 
                            value={formData.assetName} 
                            onChange={handleChange} 
                            placeholder="VD: Vinamilk (VNM), Vàng SJC..."
                            required 
                        />
                    </div>

                    <div className="form-group">
                        <label>Loại Tài Sản</label>
                        <select name="assetType" value={formData.assetType} onChange={handleChange} required>
                            <option value="Cổ phiếu">Cổ phiếu</option>
                            <option value="Trái phiếu">Trái phiếu</option>
                            <option value="Vàng">Vàng</option>
                            <option value="Bất động sản">Bất động sản</option>
                            <option value="Tiền mã hóa">Tiền mã hóa (Crypto)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Số Tiền Mua (VNĐ)</label>
                        <input 
                            type="number" 
                            name="amountInvested" 
                            value={formData.amountInvested} 
                            onChange={handleChange} 
                            placeholder="VD: 5000000"
                            required 
                            min="1000" 
                        />
                    </div>

                    <div className="form-group">
                        <label>Ngày Đầu Tư</label>
                        <input 
                            type="date" 
                            name="investDate" 
                            value={formData.investDate} 
                            onChange={handleChange} 
                            required 
                        />
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" disabled={loading || selectedJarBalance === null} className="btn-submit">
                        {loading ? 'Đang xử lý...' : 'Xác Nhận Đầu Tư'}
                    </button>
                    <button type="button" onClick={onCancel} className="btn-cancel">Hủy</button>
                </div>
            </form>
        </div>
    );
};

export default InvestmentForm;