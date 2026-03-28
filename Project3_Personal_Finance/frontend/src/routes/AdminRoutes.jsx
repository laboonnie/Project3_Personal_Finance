import { Routes, Route, Navigate } from "react-router-dom";
import UsersPage from "../pages/admin/UsersPage";
import CategoriesPage from "../pages/admin/CategoriesPage";
import AdminDashboard from "../pages/admin/AdminDashboard";

export default function AdminRoutes() {
  // 1. Lấy thông tin từ Local Storage
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  // 2. TRẠM KIỂM SOÁT QUYỀN LỰC
  // Nếu chưa đăng nhập HOẶC không có quyền Admin -> Đuổi về trang Dashboard của User thường
  if (!token || role !== 'Admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // 3. NẾU LÀ ADMIN THÌ CHO PHÉP ĐI TIẾP VÀO TRONG
  return (
    <Routes>
      <Route path="users" element={<UsersPage />} />
      <Route path="categories" element={<CategoriesPage />} />
      <Route path="dashboard" element={<AdminDashboard />} />
    </Routes>
  );
}