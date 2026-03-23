import React, { useState } from 'react';
import api from '../../api/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './login.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/Users/login', { email, password });
            // Lưu token vào localStorage
            localStorage.setItem('token', response.data.token);
            // Có thể lưu thêm thông tin user nếu cần
            localStorage.setItem('userName', response.data.user.name);
            toast.success('Login successful!');
            navigate('/dashboard'); 
            // navigate('/transactions'); 
        } catch (error) {
            toast.error(error.response?.data || 'Invalid email or password!');
        }
    };
    return (
        <div>
            <div className='containerLogin'>
                <div className='headerLogin'>
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
                        {/* <div className='forgot-password'>Lost Password? <span>Click Here!</span></div> */}
                        <div className='submit-container'>
                            <div className='submit'>
                                <button type="submit">Login</button>
                            </div>
                        <div className='submit gray' onClick={() => navigate('/register')}>Sign Up</div>
                        </div>   
                    </form>
                </div>
            </div>
        </div>
        
    );
};

export default Login;