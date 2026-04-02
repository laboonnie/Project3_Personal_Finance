import { useState, useEffect } from "react";
import userApi from "../../api/userApi";

export default function UserForm({ editUser, refresh, defaultRole = "User" }) {
    const [form, setForm] = useState({
        name: "",
        email: "",
        role: defaultRole,
        isActive: true
    });
    useEffect(() => {
        if (editUser) {
            setForm(editUser);
        }
    }, [editUser]);
    const handleChange = (e) => {
        const value =
            e.target.type === "checkbox"
                ? e.target.checked
                : e.target.value;

        setForm({
            ...form,
            [e.target.name]: value
        });
    };
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
            role: defaultRole,
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


            <div className="form-row">
                <label className="active-checkbox">
                    <input
                        type="checkbox"
                        name="isActive"
                        checked={form.isActive}
                        onChange={handleChange}
                    />
                    Active
                </label>

                <button type="submit" className="create-btn">
                    {form.id ? "Update" : "Add"}
                </button>
            </div>

        </form>

    )
}