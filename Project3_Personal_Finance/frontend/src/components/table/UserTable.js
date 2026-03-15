import { useState } from "react";
import UserForm from "../form/UserForm";
import userApi from "../../api/userApi";
export default function UserTable({users,refresh}){
    const[editUser,setEditUser] = useState(null);
    const handDelete= async(id)=>{
        await userApi.deleteUser(id);
        refresh();
    }
    return(
        <div>
            <UserForm editUser={editUser} refresh={refresh}/>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Active</th>
                        <th>Created</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((u) => (
                        <tr key={u.id}>
                            <td>{u.name}</td>
                            <td>{u.email}</td>
                            <td>{u.role}</td>
                            <td>{u.isActive ? "Yes":"No"}</td>
                            <td>{u.createdAt}</td>
                            <td>
                                <button onClick={()=>setEditUser(u)}>Edit</button>
                                <button onClick={()=>handDelete(u.id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}