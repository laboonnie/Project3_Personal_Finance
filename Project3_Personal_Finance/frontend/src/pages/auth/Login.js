import React, { useState } from 'react';
import api from '../../api/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './login.css';

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
            const user = response.data.user || response.data.User;
            const role = user?.role || user?.Role || '';

            localStorage.setItem('token', response.data.token || response.data.Token);
            localStorage.setItem('userName', user?.name || user?.Name);
            localStorage.setItem('role', role);
            sessionStorage.removeItem('dueAlertShownFor');

            toast.success(`Login successful!`);

            if (role.toString().toLowerCase() === 'admin') {
                navigate('/admin/dashboard');
            } else {
                navigate('/dashboard');
            }
        } catch (error) {
            const errorMessage =
                error.response?.data?.message ||
                (typeof error.response?.data === 'string' ? error.response.data : null) ||
                "An error occurred during login!";
            toast.error(errorMessage);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await api.post('/Users/forgot-password', { email: forgotEmail });
            toast.success(response.data.message || 'Password reset instructions have been sent to your email!');
            setIsForgotMode(false);
            setForgotEmail('');
        } catch (error) {
            const errorMessage = error.response?.data?.message
                || (typeof error.response?.data === 'string' ? error.response.data : null)
                || 'An error occurred while submitting your request!';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fin-login-page">
            <div className="fin-login-card">
                
                {/* --- LEFT BRAND BANNER --- */}
                <div className="fin-login-banner">
                    <div className="brand-logo">
                        <i className="bi bi-wallet2"></i> FINWEB
                    </div>
                    <div className="banner-content">
                        <h2>Personal Finance</h2>
                        <p>Manage cash flow intelligently, track the 6 Financial Jars system, and optimize your investment plans.</p>
                    </div>
                    <div className="banner-footer">
                        © 2026 Personal Finance Manager
                    </div>
                </div>

                {/* --- RIGHT FORM SECTION --- */}
                <div className="fin-login-form-wrapper">
                    {isForgotMode ? (
                        /* FORGOT PASSWORD FORM */
                        <form onSubmit={handleForgotPassword}>
                            <h3 className="form-header-title">Reset Password</h3>
                            <p className="form-header-subtitle">
                                Enter your email address to receive password reset instructions.
                            </p>

                            <div className="fin-input-group">
                                <label>Email Address</label>
                                <div className="fin-input-box">
                                    <i className="bi bi-envelope-at-fill"></i>
                                    <input 
                                        type="email" 
                                        placeholder="your.email@example.com" 
                                        value={forgotEmail} 
                                        onChange={(e) => setForgotEmail(e.target.value)} 
                                        required 
                                    />
                                </div>
                            </div>

                            <div className="d-flex flex-column gap-3 mt-4">
                                <button type="submit" className="btn-fin-primary" disabled={isLoading}>
                                    {isLoading ? 'Processing...' : 'Send Reset Link'}
                                </button>
                                <button type="button" className="btn-fin-secondary" onClick={() => setIsForgotMode(false)}>
                                    Back to Login
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* LOGIN FORM */
                        <form onSubmit={handleLogin}>
                            <h3 className="form-header-title">Welcome Back! 👋</h3>
                            <p className="form-header-subtitle">Log in to manage your finances today.</p>

                            <div className="fin-input-group">
                                <label>Email Address</label>
                                <div className="fin-input-box">
                                    <i className="bi bi-envelope-at-fill"></i>
                                    <input 
                                        type="email" 
                                        placeholder="your.email@example.com" 
                                        value={email} 
                                        onChange={(e) => setEmail(e.target.value)} 
                                        required 
                                    />
                                </div>
                            </div>

                            <div className="fin-input-group">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <label className="m-0">Password</label>
                                    <span className="forgot-link" style={{ cursor: 'pointer' }} onClick={() => setIsForgotMode(true)}>
                                        Forgot password?
                                    </span>
                                </div>
                                <div className="fin-input-box">
                                    <i className="bi bi-lock-fill"></i>
                                    <input 
                                        type="password" 
                                        placeholder="••••••••" 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        required 
                                    />
                                </div>
                            </div>

                            <div className="d-flex flex-column gap-3 mt-4">
                                <button type="submit" className="btn-fin-primary">
                                    Log In
                                </button>
                                <button type="button" className="btn-fin-secondary" onClick={() => navigate('/register')}>
                                    Don't have an account? Register now
                                </button>
                            </div>
                        </form>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Login;