import React, { useState } from 'react';
import api from '../../api/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

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
        <form onSubmit={handleLogin}>
            <h2>Login</h2>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="submit">Login</button>
        </form>
    );
};

export default Login;