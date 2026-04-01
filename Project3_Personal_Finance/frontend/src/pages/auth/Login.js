import React, { useState } from 'react';
import api from '../../api/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './login.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isForgotMode, setIsForgotMode] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/Users/login', { email, password });
            
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('userName', response.data.user.name);
            localStorage.setItem('role', response.data.user.role); 

            toast.success('Login successful! Welcome back, ' + response.data.user.name);

            if (response.data.user.role === 'Admin') {
                navigate('/admin/dashboard'); 
            } else {
                navigate('/dashboard');
            }
        } catch (error) {
            if (error.response && error.response.data) {
                toast.error(error.response.data); 
            } else {
                toast.error("Không thể kết nối đến máy chủ!");
            }
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await api.post('/Users/forgot-password', { email: forgotEmail });
            toast.success(response.data.message || 'Mật khẩu mới đã được gửi vào email của bạn!');
            setIsForgotMode(false); 
            setForgotEmail('');
        } catch (error) {
            toast.error(error.response?.data || 'Email không tồn tại trong hệ thống!');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div className='containerLogin'>
                <div className='headerLogin'>
                    
                    {isForgotMode ? (
                        /* ================= FORM QUÊN MẬT KHẨU ================= */
                        <form onSubmit={handleForgotPassword}>
                            <div className='text'>Forgot Password</div>
                            <div className='underline'></div>
                            <p className="text-center text-muted mt-3 mb-1" style={{ fontSize: '14px' }}>
                                Nhập email của bạn để nhận mật khẩu khôi phục
                            </p>
                            <div className='inputs mt-0'>
                                <div className='input'>
                                    <i className="bi bi-envelope-at-fill"></i>
                                    <input type="email" placeholder="Enter your email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
                                </div>
                            </div>
                            
                            <div className='submit-container mt-4'>
                                {/* Sửa lại CSS để button ăn khớp với class submit */}
                                <button type="submit" className='submit' disabled={isLoading} style={{ border: 'none', fontFamily: 'inherit' }}>
                                    {isLoading ? 'Đang gửi...' : 'Gửi Yêu Cầu'}
                                </button>
                                
                                <div className='submit gray' onClick={() => setIsForgotMode(false)} style={{ cursor: 'pointer' }}>
                                    Trở lại Đăng nhập
                                </div>
                            </div>   
                        </form>
                    ) : (
                        /* ================= FORM ĐĂNG NHẬP ================= */
                        <form onSubmit={handleLogin}>
                            <div className='text'>Login</div>
                            <div className='underline'></div>
                            <div className='inputs'>
                                <div className='input'>
                                    <i className="bi bi-envelope-at-fill"></i>
                                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                </div>
                                <div className='input'>
                                    <i className="bi bi-lock-fill"></i>
                                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                                </div>
                            </div>
                            
                            <div className='forgot-password' style={{ cursor: 'pointer', textAlign: 'right', marginTop: '10px' }} onClick={() => setIsForgotMode(true)}>
                                Quên mật khẩu? <span style={{ color: '#3182ce', fontWeight: 'bold' }}>Bấm vào đây!</span>
                            </div>
                            
                            <div className='submit-container'>
                                <button type="submit" className='submit' style={{ border: 'none', fontFamily: 'inherit' }}>
                                    Login
                                </button>
                                <div className='submit gray' onClick={() => navigate('/register')} style={{ cursor: 'pointer' }}>
                                    Register
                                </div>
                            </div>   
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;