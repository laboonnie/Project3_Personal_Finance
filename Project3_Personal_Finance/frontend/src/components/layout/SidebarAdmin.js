import { Link } from "react-router-dom";

export default function SidebarAdmin(){

    return(

        <div className="sidebar">

            <h2>Finance Admin</h2>

            <Link to="/dashboard">Dashboard</Link>

            <Link to="/users">Users</Link>

            <Link to="/categories">Categories</Link>

        </div>

    )

}