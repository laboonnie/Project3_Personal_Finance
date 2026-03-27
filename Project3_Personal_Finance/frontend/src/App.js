import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminRoutes from "./routes/AdminRoutes";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/dashboard/Dashboard";
import ProtectedRoute from "./routes/ProtectedRoute";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Transactions from "./pages/Transactions/Transactions";
import Budgets from "./pages/budgets/Budgets";
import Goals from "./pages/Goals/GoalPages";
import Debts from "./pages/Debts/DebtPages";
import Investments from "./pages/Investments/Investments";
import 'bootstrap/dist/css/bootstrap.min.css';
import MainLayout from "./layouts/MainLayout";
import "./App.css";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />
        
        {/* ADMIN ROUTES */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>

              <AdminRoutes />

            </ProtectedRoute>
          }
        />
        {/* USER ROUTES */}

        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>

          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/transactions" element={<Transactions />} />

          <Route path="/budgets" element={<Budgets />} />

          <Route path="/goals" element={<Goals />} />

          <Route path="/debts" element={<Debts />} />

          <Route path="/investments" element={<Investments />} />

        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>

      <ToastContainer position="top-right" autoClose={3000} />

    </BrowserRouter>
  );
}

export default App;