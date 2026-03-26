import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "./layout.css";

export default function Layout({children}){

    return(

        <div className="layout">

            <Sidebar/>

            <div className="main">

                <Topbar/>

                <div className="content">

                    {children}

                </div>

            </div>

        </div>

    )

}