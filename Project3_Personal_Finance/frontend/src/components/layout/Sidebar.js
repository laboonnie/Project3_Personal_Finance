import { Link, useLocation } from "react-router-dom";

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
      className="text-white p-3"
      style={{
        width: collapsed ? "70px" : "200px",
        minHeight: "100vh",
        backgroundColor: "#7c6ee6",
        transition: "0.3s"
      }}
    >

      <h5 className="text-center mb-4">

        {collapsed ? "💰" : "💰 Finance App"}

      </h5>

      {
        menu.map(item => (

          <Link
            key={item.path}
            to={item.path}
            className={`d-flex align-items-center mb-3 text-decoration-none text-white p-2 rounded
            ${location.pathname === item.path ? "active-menu" : ""}
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