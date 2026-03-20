import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminRoutes from "./routes/AdminRoutes";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/dashboard/Dashboard";
import ProtectedRoute from "./routes/ProtectedRoute";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Transactions from "./pages/Transactions/Transactions";
import Goals from "./pages/Goals/GoalPages";
import Debts from "./pages/Debts/DebtPages";
import Investments from "./pages/Investments/Investments";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Các route cần bảo vệ */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/transactions" element={
          <ProtectedRoute>
            <Transactions />
          </ProtectedRoute>
        } />
        <Route path="/goals" element={
          <ProtectedRoute>
            <Goals />
          </ProtectedRoute>
        } />
        <Route path="/debts" element={
          <ProtectedRoute>
            <Debts />
          </ProtectedRoute>
        } />
        <Route path="/investments" element={
          <ProtectedRoute>
            <Investments />
          </ProtectedRoute>
        } />

        {/* redirect trang chủ */}
        {/* <Route path="/" element={<Navigate to="/admin/users" />} /> */}

        {/* admin routes */}
        <Route path="/admin/*" element={<AdminRoutes />} />

        {/* Default route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}

export default App;