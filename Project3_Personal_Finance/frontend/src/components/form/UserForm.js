import { useState, useEffect } from "react";
import userApi from "../../api/userApi";

export default function UserForm({editUser,refresh}){
    const [form,setForm] = useState({
        name:"",
        email:"",
        role:"User",
        isActives:true
    });
    useEffect(()=>{
        if(editUser){
            setForm(editUser);
        }
    },[editUser]);
    const handleChange = (e)=>{
        setForm({
            ...form,
            [e.target.name]:e.target.value
        })
    }
    const handleSubmit = async(e)=>{
        e.preventDefault();
        if(form.id){
            await userApi.updateUser(form.id,form);

        }else{
            await userApi.createUser(form);
        }
        refresh();
        setForm({
            name:"",
            email:"",
            role:"User",
            isActives:true
        })
    }
    return(
        <form onSubmit={handleSubmit}>
            <div>
                <p>Name:</p>
                 <input name="name" value={form.name} onChange={handleChange} />
            </div>
            <div>
                <p>Email:</p>
                <input name="email" value={form.email} onChange={handleChange} />
            </div>
            <div>
                <p>Role:</p>
                <select name="role" value={form.role} onChange={handleChange}>
                <option>User</option>
                <option>Admin</option>
            </select>
            </div>
            <button type="submit">
                {form.id ? "Update" : "Add"}
            </button>
        </form>
    )
}