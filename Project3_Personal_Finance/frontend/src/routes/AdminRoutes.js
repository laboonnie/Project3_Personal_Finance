import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";

import AdminDashboard from "../pages/admin/AdminDashboard";
import Users from "../pages/admin/UsersPage";
import Categories from "../pages/admin/CategoriesPage";

export default function AdminRoutes() {

  return (

    <Routes>

      <Route element={<AdminLayout />}>

        <Route path="dashboard" element={<AdminDashboard />} />

        <Route path="users" element={<Users />} />

        <Route path="categories" element={<Categories />} />

        <Route path="*" element={<Navigate to="dashboard" />} />

      </Route>

    </Routes>

  );

}