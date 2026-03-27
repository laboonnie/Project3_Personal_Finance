import SidebarAdmin from "./SidebarAdmin";
import Sidebar from "./SidebarAdmin";
import Topbar from "./Topbar";
import "./layout.css";

export default function Layout({children}){

    return(

        <div className="layout">

            <SidebarAdmin/>

            <div className="main">

                <Topbar/>

                <div className="content">

                    {children}

                </div>

            </div>

        </div>

    )

}