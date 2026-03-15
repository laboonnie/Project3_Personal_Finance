import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminRoutes from "./routes/AdminRoutes";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* redirect trang chủ */}
        <Route path="/" element={<Navigate to="/admin/users" />} />

        {/* admin routes */}
        <Route path="/admin/*" element={<AdminRoutes />} />

      </Routes>

    </BrowserRouter>
  );
}

export default App;