import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api'; 
import { toast } from 'react-toastify';
import './login.css';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();

        if (!email.includes('@')) {
            toast.warning('Please enter a valid email address!');
            return;
        }

        if (password.length < 6) {
            toast.warning('Password must be at least 6 characters long!');
            return;
        }

        if (password !== confirmPassword) {
            toast.warning('Password confirmation does not match!');
            return;
        }

        setIsLoading(true);

        try {
            await api.post('/Users/register', { name, email, password });
            toast.success('Registration successful! Redirecting to login...');
            navigate('/login');
        } catch (error) {
            const errorMsg = typeof error.response?.data === 'string' 
                ? error.response.data 
                : error.response?.data?.message || 'Registration failed!';
            toast.error(errorMsg);
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
                        <h2>Start Your Financial Journey</h2>
                        <p>Create an account to manage your 6 Financial Jars, set savings goals, and track your investments effortlessly.</p>
                    </div>
                    <div className="banner-footer">
                        © 2026 Personal Finance Manager
                    </div>
                </div>

                {/* --- RIGHT REGISTER FORM --- */}
                <div className="fin-login-form-wrapper">
                    <form onSubmit={handleRegister}>
                        <h3 className="form-header-title">Create Account ✨</h3>
                        <p className="form-header-subtitle">Sign up for free and take control of your money.</p>

                        <div className="fin-input-group">
                            <label>Full Name</label>
                            <div className="fin-input-box">
                                <i className="bi bi-person-fill"></i>
                                <input 
                                    type="text" 
                                    placeholder="John Doe" 
                                    value={name} 
                                    onChange={(e) => setName(e.target.value)} 
                                    required 
                                />
                            </div>
                        </div>

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
                            <label>Password</label>
                            <div className="fin-input-box">
                                <i className="bi bi-lock-fill"></i>
                                <input 
                                    type="password" 
                                    placeholder="At least 6 characters" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    required 
                                />
                            </div>
                        </div>

                        <div className="fin-input-group">
                            <label>Confirm Password</label>
                            <div className="fin-input-box">
                                <i className="bi bi-shield-lock-fill"></i>
                                <input 
                                    type="password" 
                                    placeholder="Re-enter your password" 
                                    value={confirmPassword} 
                                    onChange={(e) => setConfirmPassword(e.target.value)} 
                                    required 
                                />
                            </div>
                        </div>

                        <div className="d-flex flex-column gap-3 mt-4">
                            <button type="submit" className="btn-fin-primary" disabled={isLoading}>
                                {isLoading ? 'Creating Account...' : 'Sign Up'}
                            </button>
                            <button type="button" className="btn-fin-secondary" onClick={() => navigate('/login')}>
                                Already have an account? Log In
                            </button>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    );
};

export default Register;