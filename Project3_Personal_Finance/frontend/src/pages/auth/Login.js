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
            // toast.error(error.response?.data || 'Wrong email or password!');
            if (error.response && error.response.data) {
                // Hiển thị chính xác dòng chữ "Tài khoản của bạn đã bị khóa..." từ Backend
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
            toast.success(response.data.message || 'New password has been sent to your email!');
            setIsForgotMode(false); 
            setForgotEmail('');
        } catch (error) {
            toast.error(error.response?.data || 'Email does not exist in the system!');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div className='containerLogin'>
                <div className='headerLogin'>
                    
                    {isForgotMode ? (
                        <form onSubmit={handleForgotPassword}>
                            <div className='text'>Forgot Password</div>
                            <div className='underline'></div>
                            <p className="text-center text-muted mt-3 mb-1" style={{ fontSize: '14px' }}>
                                Enter your email to receive a new password
                            </p>
                            <div className='inputs mt-0'>
                                <div className='input'>
                                    <i className="bi bi-envelope-at-fill"></i>
                                    <input type="email" placeholder="Enter your email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
                                </div>
                            </div>
                            
                            <div className='submit-container mt-4'>
                                <div className='submit'>
                                    <button type="submit" disabled={isLoading}>
                                        {isLoading ? 'Sending...' : 'Send Request'}
                                    </button>
                                </div>
                                <div className='submit gray' onClick={() => setIsForgotMode(false)}>
                                    Back to Login
                                </div>
                            </div>   
                        </form>
                    ) : (
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
                                Forgot Password? <span style={{ color: '#3182ce', fontWeight: 'bold' }}>Click here!</span>
                            </div>
                            
                            <div className='submit-container'>
                                <div className='submit'>
                                    <button type="submit">Login</button>
                                </div>
                                <div className='submit gray' onClick={() => navigate('/register')}>
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