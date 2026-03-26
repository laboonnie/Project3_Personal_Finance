import { useEffect, useState } from "react";
import userApi from "../../api/userApi";
import UserTable from "../../components/table/UserTable";
import Layout from "../../components/layout/Layout";
import "./user.css"
 export default function UsersPage() {
    const [users,setUsers]= useState([]);
    const fetchUsers = async ()=>{
        const res = await userApi.getAll();
        setUsers(res.data);
    };

    useEffect(()=>{
        fetchUsers();
    },[]);
    return(
         <Layout>

            <UserTable
                users={users}
                refresh={fetchUsers}
            />

        </Layout>
    )
 }