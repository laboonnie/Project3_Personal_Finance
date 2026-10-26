import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { toast } from 'react-toastify';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!token) {
            toast.error("Reset token is missing!");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match!");
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.post('/Users/reset-password', {
                token: token,
                newPassword: newPassword
            });

            toast.success(response.data.message || "Your password has been reset successfully!");
            navigate('/login');
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Invalid or expired reset token!";
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #eff6ff, #f5f3ff)',
            padding: '24px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '420px',
                background: '#ffffff',
                borderRadius: '20px',
                boxShadow: '0 20px 60px rgba(37, 99, 235, 0.12)',
                padding: '32px'
            }}>
                <h2 style={{ margin: '0 0 8px', color: '#1f2937', fontSize: '24px', fontWeight: 700 }}>
                    Create a New Password
                </h2>
                <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: '14px' }}>
                    Enter and confirm your new password below.
                </p>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                            New Password
                        </label>
                        <input
                            type="password"
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                borderRadius: '12px',
                                border: '1px solid #d1d5db',
                                fontSize: '15px',
                                boxSizing: 'border-box'
                            }}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                borderRadius: '12px',
                                border: '1px solid #d1d5db',
                                fontSize: '15px',
                                boxSizing: 'border-box'
                            }}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                            color: '#ffffff',
                            fontWeight: 600,
                            fontSize: '15px',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.7 : 1
                        }}
                    >
                        {isLoading ? 'Processing...' : 'Reset Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
