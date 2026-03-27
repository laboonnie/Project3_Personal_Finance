import { useState } from "react";
import { Outlet } from "react-router-dom";
import SidebarAdmin from "../components/layout/SidebarAdmin";
import Header from "../components/layout/Header";

export default function AdminLayout() {

  const [collapsed, setCollapsed] = useState(false);

  return (

    <div className="d-flex">

      <SidebarAdmin collapsed={collapsed} />

      <div className="flex-grow-1">

        <Header toggleSidebar={() => setCollapsed(!collapsed)} />

        <div className="p-4 bg-light min-vh-100">

          <Outlet />

        </div>

      </div>

    </div>

  );

}