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

    // const handleLogin = async (e) => {
    //     e.preventDefault();
    //     try {
    //         const response = await api.post('/Users/login', { email, password });
    //         const user = response.data.user || response.data.User;
    //         const userRole = (user?.role || user?.Role || '').toString();
            
    //         localStorage.setItem('token', response.data.token|| response.data.Token);
    //         localStorage.setItem('userName', response.data.user.name|| user?.Name);
    //         localStorage.setItem('role', response.data.user.role); 

    //         toast.success('Login successful! Welcome back, ' + response.data.user.name);

    //        if (userRole.toLowerCase() === 'admin') {
    //             navigate('/admin/dashboard'); 
    //         } else {
    //             navigate('/dashboard');
    //         }
    //     } catch (error) {
    //         if (error.response && error.response.data) {
    //             toast.error(error.response.data); 
    //         } else {
    //             toast.error("An error occurred during login! Please try again.");
    //         }
    //     }
    // };
const handleLogin = async (e) => {
    e.preventDefault();
    try {
        console.log(">>> Sending login payload:", { email, password });
        
        const response = await api.post('/Users/login', { email, password });
        
        console.log(">>> API Response Data:", response.data);

        // Lấy object user an toàn
        const user = response.data.user || response.data.User;
        const role = user?.role || user?.Role || '';

        console.log(">>> Detected User Role:", role);

        localStorage.setItem('token', response.data.token || response.data.Token);
        localStorage.setItem('userName', user?.name || user?.Name);
        localStorage.setItem('role', role);

        toast.success(`Login successful! Role: ${role}`);

        // So sánh role (Chuyển về chữ thường để tránh lỗi hoa/thường)
        if (role.toString().toLowerCase() === 'admin') {
            console.log(">>> Navigating to Admin Dashboard...");
            navigate('/admin/dashboard');
        } else {
            console.log(">>> Navigating to User Dashboard...");
            navigate('/dashboard');
        }
    } catch (error) {
        console.error(">>> Login Error Catch Block:", error);

        // Bắt message lỗi từ Backend
        const errorMessage = 
            error.response?.data?.message || 
            (typeof error.response?.data === 'string' ? error.response.data : null) ||
            "An error occurred during login!";

        console.log(">>> Error Message to Display:", errorMessage);
        toast.error(`Lỗi: ${errorMessage}`);
    }
};
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await api.post('/Users/forgot-password', { email: forgotEmail });
            toast.success(response.data.message || 'A new password has been sent to your email!');
            setIsForgotMode(false); 
            setForgotEmail('');
        } catch (error) {
            toast.error(error.response?.data || 'The email does not exist in the system!');
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
                                Enter your email to receive a password reset link. If the email exists in our system, you will receive instructions to reset your password.
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
                                    {isLoading ? 'Sending...' : 'Send Request'}
                                </button>
                                
                                <div className='submit gray' onClick={() => setIsForgotMode(false)} style={{ cursor: 'pointer' }}>
                                    Back to Login
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
                                Forgot Password? <span style={{ color: '#3182ce', fontWeight: 'bold' }}>Click here!</span>
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