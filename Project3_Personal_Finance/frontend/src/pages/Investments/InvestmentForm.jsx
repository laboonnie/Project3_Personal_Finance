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
                // Gọi thẳng API mới tạo, không cần load toàn bộ Categories nữa
                const res = await api.get('/Investments/ffa-balance');
                setFfaBalance(res.data.balance);
                
                // Khóa cứng ID của hũ FFA vào form để lúc Mua sẽ trừ đúng hũ này
                setFormData(prev => ({ ...prev, categoryId: res.data.id }));
            } catch (error) {
                toast.error("Lỗi tải thông tin hũ FFA từ hệ thống!");
            }
        };
        fetchFFABalance();
    }, []);
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const formatMoney = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.categoryId) {
            toast.error('Hệ thống chưa xác định được hũ Financial Freedom!');
            return;
        }

        if (Number(formData.amountInvested) > ffaBalance) {
            toast.error('Số tiền đầu tư không được vượt quá số dư trong hũ!');
            return;
        }

        setLoading(true);
        const payload = { ...formData, amountInvested: Number(formData.amountInvested), categoryId: Number(formData.categoryId) };

        try {
            const res = await api.post('/Investments', payload);
            const details = res.data.transactionDetails;
            
            toast.success(
                <div>
                    <strong>💸 Mua thành công!</strong><br/>
                    Đã trừ: <b>{formatMoney(details.amount)}</b><br/>
                    Số dư hũ FFA: <b style={{color: '#059669'}}>{formatMoney(details.remainingBalance)}</b><br/>
                    <small style={{color: '#666'}}>Lúc: {details.time}</small>
                </div>, 
                { autoClose: 5000 }
            );
            
            onSuccess(); 
        } catch (error) {
            toast.error(error.response?.data || 'Lỗi khi thêm khoản đầu tư!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="investment-form-container">
            <h3>Mua Tài Sản Đầu Tư Mới ➕</h3>
            <p className="text-muted" style={{ fontSize: '13px', marginBottom: '20px' }}>
                Khoản tiền đầu tư sẽ được trích xuất duy nhất từ hũ <b>Financial Freedom (Tự do tài chính)</b>.
            </p>

            <form onSubmit={handleSubmit}>
                <div className="form-grid">
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        {/* THẺ HIỂN THỊ SỐ DƯ HIỆN ĐẠI (THAY THẾ SELECT) */}
                        <div className="ffa-balance-card">
                            <div className="ffa-icon">💎</div>
                            <div className="ffa-details">
                                <span className="ffa-label">Nguồn vốn: Financial Freedom</span>
                                <span className="ffa-amount">
                                    {ffaBalance !== null ? formatMoney(ffaBalance) : 'Đang tải...'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Tên tài sản (Mã CK, Tên dự án...)</label>
                        <input type="text" name="assetName" value={formData.assetName} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <label>Loại tài sản</label>
                        <select name="assetType" value={formData.assetType} onChange={handleChange} required>
                            <option value="">-- Chọn loại tài sản --</option>
                            <option value="Cổ phiếu">Cổ phiếu</option>
                            <option value="Bất động sản">Bất động sản</option>
                            <option value="Tiền mã hóa">Tiền mã hóa</option>
                            <option value="Vàng">Vàng</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Số tiền đầu tư (VNĐ)</label>
                        <input type="number" name="amountInvested" value={formData.amountInvested} onChange={handleChange} required min="1000" />
                    </div>

                    <div className="form-group">
                        <label>Ngày thực hiện</label>
                        <input type="date" name="investDate" value={formData.investDate} onChange={handleChange} required />
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" disabled={loading || ffaBalance === null} className="btn-submit">
                        {loading ? 'Đang giao dịch...' : 'Xác nhận Mua'}
                    </button>
                    <button type="button" onClick={onCancel} className="btn-cancel">Hủy bỏ</button>
                </div>
            </form>
        </div>
    );
};

export default InvestmentForm;