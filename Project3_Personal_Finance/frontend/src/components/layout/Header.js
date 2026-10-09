import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../api/api';
import Modal from '../modal/Modal';

export default function Header({ toggleSidebar }) {
  const navigate = useNavigate();
  const [userName, setUserName] = useState(localStorage.getItem('userName') || 'User');
  
  const [showProfile, setShowProfile] = useState(false);
  
  const [profileData, setProfileData] = useState({ name: '', email: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const handleOpenProfile = async () => {
    setShowProfile(true);
    try {
      const res = await api.get('/Users/profile');
      setProfileData({ name: res.data.name, email: res.data.email });
    } catch (error) {
      toast.error('Can not load profile data!');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/Users/profile', profileData);
      toast.success(res.data.message);
      
      setUserName(res.data.name);
      localStorage.setItem('userName', res.data.name);
    } catch (error) {
      toast.error(error.response?.data || 'Can not update profile information!');
    }
  };

  // 3. XỬ LÝ ĐỔI MẬT KHẨU
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.warning('Confirm password does not match new password!');
      return;
    }
    try {
      const res = await api.put('/Users/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success(res.data.message);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); // Xóa rỗng form
    } catch (error) {
      toast.error(error.response?.data || 'Can not change password!');
    }
  };

  // 4. ĐĂNG XUẤT
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
      sessionStorage.removeItem('dueAlertShownFor');
      toast.info('You have been logged out.');
      navigate('/login');
    }
  };

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=3182ce&color=fff&rounded=true&size=40`;

 return (
    <>
      <div className="bg-white shadow-sm p-3 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <button className="btn btn-light me-3 border-0 shadow-sm" onClick={toggleSidebar}>☰</button>
          <span className="fw-bold fs-5 text-secondary d-none d-sm-inline">Personal Finance</span>
        </div>

        <div className="d-flex align-items-center">
          <div 
            className="d-flex align-items-center me-4" 
            onClick={handleOpenProfile}
            style={{ cursor: 'pointer', padding: '5px 10px', borderRadius: '25px', transition: 'background 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Click to view/edit profile"
          >
            <img src={avatarUrl} alt="Avatar" className="me-2 shadow-sm" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
            <span className="fw-medium text-dark d-none d-md-inline">{userName} ⚙️</span>
          </div>

          <button className="btn btn-outline-danger btn-sm px-3 fw-medium" onClick={handleLogout}>Logout</button>
        </div>
      </div>
      {showProfile && (
        <Modal close={() => setShowProfile(false)}>
          <div className="profile-modal-container">
            <div className="profile-modal-header">
              <h3>Profile</h3>
              <button type="button" className="close-x-btn" onClick={() => setShowProfile(false)}></button>
            </div>
            <div className="profile-modal-body">
              <div>
                <div className="profile-section-title primary">Basic Information</div>
                <form onSubmit={handleUpdateProfile} className="profile-form">
                  <div className="form-group">
                    <label>Display Name</label>
                    <input 
                      type="text" 
                      value={profileData.name} 
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      value={profileData.email} 
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})} 
                      required 
                    />
                  </div>
                  <button type="submit" className="btn-action-primary">Update Information</button>
                </form>
              </div>
              <div>
                <div className="profile-section-title danger">Change Password</div>
                <form onSubmit={handleChangePassword} className="profile-form">
                  <div className="form-group">
                    <input 
                      type="password" 
                      placeholder="Current Password" 
                      value={passwordData.currentPassword} 
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <input 
                      type="password" 
                      placeholder="New Password (at least 6 characters)" 
                      value={passwordData.newPassword} 
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} 
                      required 
                      minLength="6" 
                    />
                  </div>
                  <div className="form-group">
                    <input 
                      type="password" 
                      placeholder="Confirm New Password" 
                      value={passwordData.confirmPassword} 
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} 
                      required 
                    />
                  </div>
                  <button type="submit" className="btn-action-danger">Change Password</button>
                </form>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}