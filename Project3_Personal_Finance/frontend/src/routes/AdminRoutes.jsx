import { Routes, Route, Navigate } from "react-router-dom";
import UsersPage from "../pages/admin/UsersPage";
import CategoriesPage from "../pages/admin/CategoriesPage";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminLayout from "../layouts/AdminLayout";
import AdminsPage from "../pages/admin/AdminPage";

export default function AdminRoutes() {

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token || role !== "Admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Routes>

      <Route
        path="dashboard"
        element={
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        }
      />

      <Route
        path="admins"
        element={
          <AdminLayout>
            <AdminsPage />
          </AdminLayout>
        }
      />

      <Route
        path="users"
        element={
          <AdminLayout>
            <UsersPage />
          </AdminLayout>
        }
      />

      <Route
        path="categories"
        element={
          <AdminLayout>
            <CategoriesPage />
          </AdminLayout>
        }
      />

      <Route index element={<Navigate to="dashboard" />} />

    </Routes>
  );
}