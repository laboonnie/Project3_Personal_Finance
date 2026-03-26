import { useState, useEffect } from "react";
import userApi from "../../api/userApi";

export default function UserForm({ editUser, refresh }) {
    const [form, setForm] = useState({
        name: "",
        email: "",
        role: "User",
        isActives: true
    });
    useEffect(() => {
        if (editUser) {
            setForm(editUser);
        }
    }, [editUser]);
    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        })
    }
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.id) {
            await userApi.updateUser(form.id, form);

        } else {
            await userApi.createUser(form);
        }
        refresh();
        setForm({
            name: "",
            email: "",
            role: "User",
            isActives: true
        })
    }
    return (

        <form
            className="user-form"
            onSubmit={handleSubmit}
        >

            <h3>

                {form.id
                    ? "Update User"
                    : "Create User"}

            </h3>


            <label>Name</label>

            <input
                name="name"
                value={form.name}
                onChange={handleChange}
            />


            <label>Email</label>

            <input
                name="email"
                value={form.email}
                onChange={handleChange}
            />


            <label>Role</label>

            <select
                name="role"
                value={form.role}
                onChange={handleChange}
            >

                <option>User</option>
                <option>Admin</option>

            </select>


            <label>

                <input
                    type="checkbox"
                    name="isActive"
                    checked={form.isActive}
                    onChange={handleChange}
                />

                Active

            </label>


            <button type="submit">

                {form.id
                    ? "Update"
                    : "Add"}

            </button>

        </form>

    )
}