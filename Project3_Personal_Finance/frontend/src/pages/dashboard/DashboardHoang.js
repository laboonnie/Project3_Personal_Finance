import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Dashboard = () => {
    const navigate = useNavigate();
    const userName = localStorage.getItem('userName'); // Lấy tên đã lưu lúc nãy

    const handleLogout = () => {
        // 1. Xóa sạch dữ liệu trong Local Storage
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        
        toast.info('You have been logged out.');
        
        // 2. Chuyển về trang đăng nhập
        navigate('/login');
    };

    return (
        <div>
            <h1>Chào mừng {userName} đã quay trở lại!</h1>
            <button onClick={handleLogout}>Đăng xuất</button>
        </div>
    );
};

export default Dashboard; 
