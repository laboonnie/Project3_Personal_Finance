import { useEffect, useState } from "react";
import userApi from "../../api/userApi";
import UserTable from "../../components/table/UserTable";
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
        <div>
            <h2>User Management</h2>
            <UserTable users={users} refresh={fetchUsers} />
        </div>
    )
 }