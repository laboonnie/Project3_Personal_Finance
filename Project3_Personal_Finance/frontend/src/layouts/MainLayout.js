import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import { Outlet } from "react-router-dom";

export default function MainLayout({ children }) {

  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="d-flex">

      <Sidebar collapsed={collapsed} />

      <div className="flex-grow-1">

        <Header toggleSidebar={() => setCollapsed(!collapsed)} />

        <div className="p-4 bg-light min-vh-100">
          {children}
          <Outlet />
        </div>

      </div>

    </div>
  );
}