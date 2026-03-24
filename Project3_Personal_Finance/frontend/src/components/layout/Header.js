export default function Header({ toggleSidebar }) {

  return (
    <div className="bg-white shadow-sm p-3 d-flex justify-content-between align-items-center">

      <div>

        <button
          className="btn btn-outline-secondary me-3"
          onClick={toggleSidebar}
        >
          ☰
        </button>

        <span className="fw-bold">
          {/* Dashboard */}
        </span>

      </div>

      <button className="btn btn-outline-danger btn-sm">
        Logout
      </button>

    </div>
  );
}