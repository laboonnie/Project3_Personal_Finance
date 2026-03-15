import { Routes, Route } from "react-router-dom";
import UsersPage from "../pages/admin/UsersPage";
import CategoriesPage from "../pages/admin/CategoriesPage";

export default function AdminRoutes() {

  return (

    <Routes>

      <Route path="users" element={<UsersPage />} />

      <Route path="categories" element={<CategoriesPage />} />

    </Routes>

  );
}