import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { toast } from 'react-toastify';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token'); // Lấy token từ URL

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!token) {
            toast.error("Mã xác thực không tồn tại!");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("Mật khẩu xác nhận không trùng khớp!");
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.post('/Users/reset-password', {
                token: token,
                newPassword: newPassword
            });

            toast.success(response.data.message || "Đặt lại mật khẩu thành công!");
            navigate('/login'); // Chuyển sang trang Đăng nhập
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Mã xác thực không hợp lệ hoặc đã hết hạn!";
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mt-5" style={{ maxWidth: '400px' }}>
            <h3 className="text-center mb-3">Đặt Lại Mật Khẩu</h3>
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label className="form-label">Mật khẩu mới</label>
                    <input
                        type="password"
                        className="form-control"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label">Xác nhận mật khẩu mới</label>
                    <input
                        type="password"
                        className="form-control"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="btn btn-primary w-100" disabled={isLoading}>
                    {isLoading ? 'Đang xử lý...' : 'Đổi Mật Khẩu'}
                </button>
            </form>
        </div>
    );
};

export default ResetPassword;