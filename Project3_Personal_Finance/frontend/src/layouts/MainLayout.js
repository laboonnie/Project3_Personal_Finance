import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import { Outlet } from "react-router-dom";
import DueAlertPopup from "../pages/PopUp/DueAlertPopup";

export default function MainLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    // vh-100 & overflow-hidden giữ khung màn hình cố định
    <div className="d-flex vh-100 overflow-hidden">
      {/* Sidebar luôn đứng yên ở bên trái */}
      <Sidebar collapsed={collapsed} />
      <DueAlertPopup />

      {/* Cột nội dung bên phải sẽ tự cuộn khi nội dung dài */}
      <div className="flex-grow-1 d-flex flex-column h-100 overflow-y-auto">
        <Header toggleSidebar={() => setCollapsed(!collapsed)} />

        <div className="p-4 bg-light flex-grow-1">
          {children}
          <Outlet />
        </div>
      </div>
    </div>
  );
}