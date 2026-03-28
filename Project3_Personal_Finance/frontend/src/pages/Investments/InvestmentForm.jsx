import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { toast } from 'react-toastify';
import './Investments.css';

const InvestmentForm = ({ onSuccess, onCancel, initialData }) => {
    const [formData, setFormData] = useState({
        assetName: '',
        assetType: '',
        amountInvested: '',
        currentValue: '',
        investDate: new Date().toISOString().split('T')[0]
    });
    const [loading, setLoading] = useState(false);

    // Nếu có dữ liệu truyền vào (chế độ Sửa), tự động điền vào Form
    useEffect(() => {
        if (initialData) {
            setFormData({
                assetName: initialData.assetName,
                assetType: initialData.assetType,
                amountInvested: initialData.amountInvested,
                currentValue: initialData.currentValue,
                investDate: initialData.investDate.split('T')[0]
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            assetName: formData.assetName,
            assetType: formData.assetType,
            amountInvested: Number(formData.amountInvested),
            currentValue: Number(formData.currentValue),
            investDate: formData.investDate
        };

        try {
            if (initialData && initialData.id) {
                await api.put(`/Investments/${initialData.id}`, payload);
                toast.success('Cập nhật thành công!');
            } else {
                await api.post('/Investments', payload);
                toast.success('Thêm khoản đầu tư thành công!');
            }
            onSuccess(); // Gọi hàm refresh danh sách ở ngoài
        } catch (error) {
            toast.error(initialData ? 'Lỗi khi cập nhật!' : 'Lỗi khi thêm mới!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="investment-form-container">
            <h3>{initialData ? 'Sửa khoản đầu tư ✏️' : 'Thêm khoản đầu tư mới ➕'}</h3>

            <form onSubmit={handleSubmit}>
                <div className="form-grid">
                    <div className="form-group">
                        <label>Tên tài sản</label>
                        <input type="text" name="assetName" value={formData.assetName} onChange={handleChange} placeholder="VD: Đất nền, Cổ phiếu FPT..." required />
                    </div>

                    <div className="form-group">
                        <label>Loại tài sản</label>
                        <select name="assetType" value={formData.assetType} onChange={handleChange} required>
                            <option value="">-- Chọn loại tài sản --</option>
                            <option value="Bất động sản">Bất động sản</option>
                            <option value="Chứng khoán">Chứng khoán</option>
                            <option value="Tiền điện tử">Tiền điện tử</option>
                            <option value="Khác">Khác</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Vốn ban đầu (VNĐ)</label>
                        <input type="number" name="amountInvested" value={formData.amountInvested} onChange={handleChange} placeholder="Nhập số tiền..." required min="0" />
                    </div>

                    <div className="form-group">
                        <label>Định giá hiện tại (VNĐ)</label>
                        <input type="number" name="currentValue" value={formData.currentValue} onChange={handleChange} placeholder="Giá trị ước tính..." required min="0" />
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Ngày đầu tư</label>
                        <input type="date" name="investDate" value={formData.investDate} onChange={handleChange} required />
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" disabled={loading} className={`btn-submit ${initialData ? 'edit-mode' : ''}`}>
                        {loading ? 'Đang xử lý...' : (initialData ? 'Lưu thay đổi' : 'Thêm mới')}
                    </button>
                    <button type="button" onClick={onCancel} className="btn-cancel">
                        Hủy
                    </button>
                </div>
            </form>
        </div>
    );
};

export default InvestmentForm;