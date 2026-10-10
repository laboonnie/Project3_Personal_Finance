import { Link, useLocation } from "react-router-dom";
import AiAdvisor from "../AiAdvisor/AiAdvisor";
import "./layout.css"; // Dùng chung file CSS với Admin Sidebar

export default function Sidebar({ collapsed }) {
  const location = useLocation();

  const menu = [
    { name: "Dashboard", path: "/dashboard", icon: "bi-speedometer2" },
    { name: "Transactions", path: "/transactions", icon: "bi-cash" },
    { name: "Budgets", path: "/budgets", icon: "bi-wallet2" },
    { name: "Goals", path: "/goals", icon: "bi-bullseye" },
    { name: "Debts", path: "/debts", icon: "bi-credit-card" },
    { name: "Investments", path: "/investments", icon: "bi-graph-up" }
  ];

  return (
    <div
      className="custom-sidebar"
      style={{
        width: collapsed ? "80px" : "220px",
      }}
    >
      {/* Brand Title */}
      <div className="sidebar-brand text-center">
        {collapsed ? "💰" : "💰 Finance App"}
      </div>

      {/* Menu List */}
      <div className="sidebar-menu">
        {menu.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item-link ${isActive ? "active-menu" : ""}`}
            >
              {/* Nút tròn nổi cho Tab active */}
              {isActive ? (
                <div className="icon-wrapper">
                  <i className={`bi ${item.icon}`} />
                </div>
              ) : (
                <i className={`bi ${item.icon}`} />
              )}

              {!collapsed && (
                <span className="ms-2">{item.name}</span>
              )}
            </Link>
          );
        })}
      </div>

      {/* AI Advisor Component đặt ở cuối */}
      <div className="mt-auto pt-3 pe-2">
        <AiAdvisor collapsed={collapsed} />
      </div>
    </div>
  );
}