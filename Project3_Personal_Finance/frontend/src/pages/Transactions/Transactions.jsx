import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/api'; // Trạm kiểm soát đã tự động nhét Token

const Transactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    
    const [formData, setFormData] = useState({
        amount: '',
        categoryId: '',
        transactionDate: new Date().toISOString().split('T')[0], // Mặc định ngày hôm nay
        note: ''
    });

    // Chạy 1 lần duy nhất khi load trang: Gọi API lấy Danh mục và Giao dịch
    useEffect(() => {
        fetchCategories();
        fetchTransactions();
    }, []);

    const fetchCategories = async () => {
        try {
            // Giả định bạn đã viết API lấy danh mục
            const response = await api.get('/Categories'); 
            setCategories(response.data);
        } catch (error) {
            toast.error('Không thể tải danh mục');
        }
    };

    const fetchTransactions = async () => {
        try {
            // Có thể truyền thêm params ?month=3&year=2026 vào đây để lọc
            const response = await api.get('/Transactions');
            setTransactions(response.data.data); // Chú ý: .data.data vì Backend trả về object có chứa mảng Data
        } catch (error) {
            toast.error('Không thể tải danh sách giao dịch');
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/Transactions', formData);
            
            // THUẬT TOÁN CẬP NHẬT UI KHÔNG CẦN RELOAD:
            // Nhét giao dịch mới (response.data) lên đầu mảng transactions hiện tại
            setTransactions([response.data, ...transactions]);
            toast.success('Thêm giao dịch thành công!');
            setFormData({ ...formData, amount: '', note: '' });
        } catch (error) {
            toast.error('Lỗi khi thêm giao dịch!');
        }
    };

    return (
        <div>
            <h2>Quản lý Giao dịch</h2>
            <form onSubmit={handleSubmit} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc' }}>
                <input type="number" name="amount" placeholder="Số tiền" value={formData.amount} onChange={handleChange} required />
                
                <select name="categoryId" value={formData.categoryId} onChange={handleChange} required>
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>

                <input type="date" name="transactionDate" value={formData.transactionDate} onChange={handleChange} required />
                <input type="text" name="note" placeholder="Ghi chú" value={formData.note} onChange={handleChange} />
                
                <button type="submit">Thêm giao dịch</button>
            </form>
            <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th>Ngày</th>
                        <th>Danh mục</th>
                        <th>Số tiền</th>
                        <th>Ghi chú</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map(t => (
                        <tr key={t.id}>
                            <td>{new Date(t.transactionDate).toLocaleDateString('vi-VN')}</td>
                            <td>{t.category ? t.category.name : 'Không xác định'}</td>
                            
                            <td>{t.amount.toLocaleString('vi-VN')} đ</td>
                            <td>{t.note}</td>
                            <td>
                                <button>Sửa</button> | <button>Xóa</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Transactions;