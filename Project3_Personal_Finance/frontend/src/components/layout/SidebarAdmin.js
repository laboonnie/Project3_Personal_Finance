import { Link, useLocation } from "react-router-dom";
import "./layout.css"; 

export default function SidebarAdmin({ collapsed }) {
  const location = useLocation();

  const menu = [
    { name: "Dashboard", path: "/admin/dashboard", icon: "bi-speedometer2" },
    { name: "Users", path: "/admin/users", icon: "bi-people" },
    { name: "Categories", path: "/admin/categories", icon: "bi-tags" },
    { name: "Admins", path: "/admin/admins", icon: "bi-person-badge" },
  ];

  return (
    <div
      className="custom-sidebar"
      style={{
        width: collapsed ? "80px" : "220px",
      }}
    >
    <div className="sidebar-brand text-center mb-4">
      {collapsed ? "🛠️" : "🛠️ Admin Panel"}
    </div>

      <div className="sidebar-menu">
        {menu.map((item) => {
          const isActive = location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item-link ${isActive ? "active-menu" : ""}`}
            >
              {/* Nếu Active thì bọc icon vào hình tròn nổi bật */}
              {isActive ? (
                <div className="icon-wrapper">
                  <i className={`bi ${item.icon}`} />
                </div>
              ) : (
                <i className={`bi ${item.icon}`} />
              )}

              {!collapsed && (
                <span className="ms-3">{item.name}</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}