import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/api'; 
import { toast } from 'react-toastify';
import './login.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [action,setAction]= useState("Sign Up")

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

        if (password !== confirmPassword) {
            toast.warning('Confirm password incorrect!');
            return;
        }

        try {
            await api.post('/Users/register', { name, email, password });

            toast.success('Registration successful!');
            navigate('/login');

        } catch (error) {
            toast.error(error.response?.data || 'Register failed!');
        }
    };

    // const handleRegister = async (e) => {
    //     e.preventDefault();
    //     if (!email.includes('@')) {
    //         toast.warning('Email is not valid!');
    //         return;
    //     }
    //     if (password.length < 6) {
    //         toast.warning('Password must be at least 6 characters long!');
    //         return;
    //     }

    //     try {
    //         await api.post('/Users/register', { name, email, password });
    //         toast.success('Registration successful! Please login.');
    //         navigate('/login');
    //     } catch (error) {
    //         toast.error(error.response?.data || 'An error occurred while registering!');
    //     }
    //     setError('');
    //     setSuccessMsg('');

    //     if (password !== confirmPassword) {
    //         setError('Confirm password incorrect');
    //         return;
    //     }
    //     try {
    //         const response = await api.post('/Users/register', {
    //             name: name,
    //             email: email,
    //             password: password
    //         });

    //         setSuccessMsg('Registration successful! Redirecting to login page...');
    //         setName(''); setEmail(''); setPassword(''); setConfirmPassword('');
    //         setTimeout(() => {
    //             navigate('/login');
    //         }, 2000);

    //     } catch (err) {
    //         if (err.response && err.response.data) {
    //             setError(typeof err.response.data === 'string' ? err.response.data : 'Error connecting to server. Please check the backend.');
    //         } else {
    //             setError('Error connecting to server. Please check the backend.');
    //         }
    //     }
    // };

    return (
        <div >
            {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
            {successMsg && <div style={{ color: 'green', marginBottom: '15px' }}>{successMsg}</div>}
            <div className='containerLogin'>
                <div className='headerLogin'>
                    <form onSubmit={handleRegister}>
                        <div className='text'>Sign Up</div>
                        <div className='underline'></div>
                        <div className='inputs'>
                            <div className='input'>
                                <i className="bi bi-person-fill"></i>
                                <input
                                    type="text" placeholder='Name'
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                                />
                            </div>
                            <div className='input'>
                                <i className="bi bi-envelope-at-fill"></i>
                                <input
                                    type="email" placeholder='Email'
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className='input'>
                                <i className="bi bi-lock-fill"></i>
                                <input
                                    type="password" placeholder='Password'
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div  className='input'>
                                <i className="bi bi-lock-fill"></i>
                                <input
                                    type="password" placeholder='Confirm Password'
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className='submit-container'>
                           <div className="submit gray" onClick={() => navigate('/login')}>Login</div>
                            <div className="submit">
                                <button type="submit">Sign Up</button>
                            </div>
                        </div> 
                    </form>
                </div>
            </div>
            {/* <p style={{ textAlign: 'center', marginTop: '15px' }}>
                Already have an account? <Link to="/login">Login</Link>
            </p> */}
        </div>
    );
};

export default Register;