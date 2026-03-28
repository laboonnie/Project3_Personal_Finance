import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { toast } from 'react-toastify';
import './adminDashboard.css';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalAdmins: 0,
        totalTransactions: 0,
        totalCategories: 0
    });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/Admin/stats');
            setStats(response.data);
        } catch (error) {
            toast.error('Không thể tải dữ liệu thống kê hệ thống!');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Đang tải hệ thống...</div>;

    return (
        <div className="admin-dashboard">
            <div className="admin-header">
                <h2>Tổng quan Quản trị viên</h2>
                <p>Theo dõi tình trạng và số liệu hoạt động của toàn hệ thống.</p>
            </div>

            {/* DANH SÁCH THẺ THỐNG KÊ (KPIs) */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-icon icon-users"><i className="bi bi-people-fill"></i></div>
                    <div className="kpi-info">
                        <h4>Người dùng</h4>
                        <h2>{stats.totalUsers}</h2>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon icon-trans"><i className="bi bi-arrow-left-right"></i></div>
                    <div className="kpi-info">
                        <h4>Giao dịch</h4>
                        <h2>{stats.totalTransactions}</h2>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon icon-cats"><i className="bi bi-tags-fill"></i></div>
                    <div className="kpi-info">
                        <h4>Danh mục</h4>
                        <h2>{stats.totalCategories}</h2>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon icon-admins"><i className="bi bi-shield-lock-fill"></i></div>
                    <div className="kpi-info">
                        <h4>Quản trị viên</h4>
                        <h2>{stats.totalAdmins}</h2>
                    </div>
                </div>
            </div>

            {/* TRUY CẬP NHANH */}
            <div className="quick-actions">
                <h3>Thao tác nhanh</h3>
                <div className="action-buttons">
                    <button className="btn-action" onClick={() => navigate('/admin/users')}>
                        <i className="bi bi-person-lines-fill text-primary"></i> Quản lý Người dùng
                    </button>
                    <button className="btn-action" onClick={() => navigate('/admin/categories')}>
                        <i className="bi bi-list-task text-warning"></i> Quản lý Danh mục gốc
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;