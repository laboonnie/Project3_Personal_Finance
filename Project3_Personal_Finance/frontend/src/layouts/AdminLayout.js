import { useState } from "react";
import SidebarAdmin from "../components/layout/SidebarAdmin";
import Header from "../components/layout/Header";

export default function AdminLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    // vh-100 & overflow-hidden giữ khung màn hình cố định
    <div className="d-flex vh-100 overflow-hidden">
      {/* SidebarAdmin cố định ở bên trái */}
      <SidebarAdmin collapsed={collapsed} />

      {/* Cột nội dung bên phải tự cuộn độc lập khi dài */}
      <div className="flex-grow-1 d-flex flex-column h-100 overflow-y-auto">
        <Header toggleSidebar={() => setCollapsed(!collapsed)} />

        <div className="p-4 bg-light flex-grow-1">
          {children}
        </div>
      </div>
    </div>
  );
}