import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { toast } from 'react-toastify';

const Investments = () => {
    const [investments, setInvestments] = useState([]);
    const [editId, setEditId] = useState(null);
    
    const [formData, setFormData] = useState({
        assetName: '',
        assetType: '',
        amountInvested: '',
        currentValue: '',
        investDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => { fetchInvestments(); }, []);

    const fetchInvestments = async () => {
        try {
            const res = await api.get('/Investments');
            setInvestments(res.data);
        } catch (error) {
            toast.error('Lỗi tải danh mục đầu tư');
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const payload = {
            assetName: formData.assetName,
            assetType: formData.assetType,
            amountInvested: Number(formData.amountInvested),
            currentValue: Number(formData.currentValue),
            investDate: formData.investDate
        };

        try {
            if (editId) {
                const res = await api.put(`/Investments/${editId}`, payload);
                setInvestments(investments.map(i => i.id === editId ? res.data : i));
                toast.success('Cập nhật thành công!');
                setEditId(null);
            } else {
                const res = await api.post('/Investments', payload);
                setInvestments([res.data, ...investments]);
                toast.success('Thêm khoản đầu tư thành công!');
            }
            setFormData({ assetName: '', assetType: '', amountInvested: '', currentValue: '', investDate: new Date().toISOString().split('T')[0] });
        } catch (error) {
            toast.error(editId ? 'Lỗi khi cập nhật!' : 'Lỗi khi thêm mới!');
        }
    };

    const handleEditClick = (inv) => {
        setEditId(inv.id);
        setFormData({
            assetName: inv.assetName,
            assetType: inv.assetType,
            amountInvested: inv.amountInvested,
            currentValue: inv.currentValue,
            investDate: inv.investDate.split('T')[0]
        });
        window.scrollTo(0, 0); 
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa mục này?')) {
            await api.delete(`/Investments/${id}`);
            setInvestments(investments.filter(i => i.id !== id));
            toast.success('Đã xóa thành công');
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2>Danh mục Đầu tư</h2>

            <form onSubmit={handleSubmit} style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', background: '#f9f9f9' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <input type="text" name="assetName" placeholder="Tên tài sản (VD: Đất nền Cầu Giấy, Cổ phiếu...)" value={formData.assetName} onChange={handleChange} required style={{ padding: '8px' }}/>
                    
                    <select name="assetType" value={formData.assetType} onChange={handleChange} required style={{ padding: '8px' }}>
                        <option value="">-- Chọn loại tài sản --</option>
                        <option value="Bất động sản">Bất động sản</option>
                        <option value="Chứng khoán">Chứng khoán</option>
                        <option value="Tiền điện tử">Tiền điện tử</option>
                        <option value="Khác">Khác</option>
                    </select>

                    <input type="number" name="amountInvested" placeholder="Vốn ban đầu (đ)" value={formData.amountInvested} onChange={handleChange} required style={{ padding: '8px' }}/>
                    <input type="number" name="currentValue" placeholder="Định giá hiện tại (đ)" value={formData.currentValue} onChange={handleChange} required style={{ padding: '8px' }}/>
                    <input type="date" name="investDate" value={formData.investDate} onChange={handleChange} required style={{ padding: '8px' }}/>
                </div>
                
                <div style={{ marginTop: '15px' }}>
                    <button type="submit" style={{ padding: '10px 20px', background: editId ? '#ed8936' : '#3182ce', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                        {editId ? 'Cập nhật giá trị' : 'Thêm khoản đầu tư'}
                    </button>
                    {editId && (
                        <button type="button" onClick={() => { setEditId(null); setFormData({ assetName: '', assetType: '', amountInvested: '', currentValue: '', investDate: new Date().toISOString().split('T')[0] }); }} style={{ marginLeft: '10px', padding: '10px', background: '#e2e8f0', border: 'none', cursor: 'pointer' }}>
                            Hủy sửa
                        </button>
                    )}
                </div>
            </form>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {investments.map(inv => {
                    const profit = inv.currentValue - inv.amountInvested;
                    const roi = ((profit / inv.amountInvested) * 100).toFixed(2);
                    const isProfit = profit >= 0;
                    
                    return (
                        <div key={inv.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '10px', borderLeft: `5px solid ${isProfit ? '#38a169' : '#e53e3e'}`, background: '#fff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: '0 0 5px 0' }}>{inv.assetName}</h3>
                                <span style={{ fontSize: '12px', background: '#edf2f7', padding: '3px 8px', borderRadius: '15px' }}>{inv.assetType}</span>
                            </div>
                            
                            <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                                Ngày đầu tư: {new Date(inv.investDate).toLocaleDateString('vi-VN')}
                            </p>
                            
                            <div style={{ marginTop: '15px', borderTop: '1px dashed #ccc', paddingTop: '10px' }}>
                                <p style={{ margin: '5px 0' }}>Vốn ban đầu: <b>{inv.amountInvested.toLocaleString()} đ</b></p>
                                <p style={{ margin: '5px 0' }}>Định giá hiện tại: <b>{inv.currentValue.toLocaleString()} đ</b></p>
                            </div>

                            <div style={{ marginTop: '15px', padding: '10px', background: isProfit ? '#f0fff4' : '#fff5f5', borderRadius: '5px', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 'bold', color: isProfit ? '#2f855a' : '#c53030' }}>
                                    {isProfit ? '▲ Lãi:' : '▼ Lỗ:'} {Math.abs(profit).toLocaleString()} đ
                                </span>
                                <span style={{ fontWeight: 'bold', color: isProfit ? '#2f855a' : '#c53030' }}>
                                    {isProfit ? '+' : ''}{roi}%
                                </span>
                            </div>

                            <div style={{ marginTop: '15px', textAlign: 'right' }}>
                                <button onClick={() => handleEditClick(inv)} style={{ color: '#3182ce', background: 'none', border: 'none', cursor: 'pointer', marginRight: '15px' }}>Sửa</button>
                                <button onClick={() => handleDelete(inv.id)} style={{ color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer' }}>Xóa</button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Investments;