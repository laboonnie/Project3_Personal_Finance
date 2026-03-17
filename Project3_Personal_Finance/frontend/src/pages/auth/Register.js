import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/api'; 
import { toast } from 'react-toastify';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!email.includes('@')) {
            toast.warning('Email is not valid!');
            return;
        }
        if (password.length < 6) {
            toast.warning('Password must be at least 6 characters long!');
            return;
        }

        try {
            await api.post('/Users/register', { name, email, password });
            toast.success('Registration successful! Please login.');
            navigate('/login');
        } catch (error) {
            toast.error(error.response?.data || 'An error occurred while registering!');
        }
        setError('');
        setSuccessMsg('');

        if (password !== confirmPassword) {
            setError('Confirm password incorrect');
            return;
        }
        try {
            const response = await api.post('/Users/register', {
                name: name,
                email: email,
                password: password
            });

            setSuccessMsg('Registration successful! Redirecting to login page...');
            setName(''); setEmail(''); setPassword(''); setConfirmPassword('');
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err) {
            if (err.response && err.response.data) {
                setError(typeof err.response.data === 'string' ? err.response.data : 'Error connecting to server. Please check the backend.');
            } else {
                setError('Error connecting to server. Please check the backend.');
            }
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
            <h2 style={{ textAlign: 'center' }}>Register for an account</h2>
            {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
            {successMsg && <div style={{ color: 'green', marginBottom: '15px' }}>{successMsg}</div>}

            <form onSubmit={handleRegister}>
                <div style={{ marginBottom: '15px' }}>
                    <label>Name:</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label>Email:</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label>Password:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label>Confirm Password:</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    />
                </div>

                <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
                    Register
                </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '15px' }}>
                Already have an account? <Link to="/login">Login</Link>
            </p>
        </div>
    );
};

export default Register;