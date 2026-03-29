import { Link, useLocation } from "react-router-dom";

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
      className="text-white p-3"
      style={{
        width: collapsed ? "70px" : "200px",
        minHeight: "100vh",
        backgroundColor: "#7c6ee6",
        transition: "0.3s"
      }}
    >

      <h5 className="text-center mb-4">
        {collapsed ? "🛠️" : "🛠️ Admin Panel"}
      </h5>

      {
        menu.map(item => (

          <Link
            key={item.path}
            to={item.path}
            className={`d-flex align-items-center mb-3 text-decoration-none text-white p-2 rounded
              ${location.pathname.startsWith(item.path) ? "active-menu" : ""}
            `}
          >

            <i className={`bi ${item.icon}`} />

            {
              !collapsed &&
              <span className="ms-2">
                {item.name}
              </span>
            }

          </Link>

        ))
      }

    </div>
  );
}