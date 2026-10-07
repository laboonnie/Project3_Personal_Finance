import { useState, useEffect } from "react";
import userApi from "../../api/userApi";

export default function UserForm({ editUser, refresh, defaultRole = "User" , close}) {
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
            await userApi.createUser({
                name: form.name,
                email: form.email,
                role: form.role,
                isActive: form.isActive,
                passwordHash: "123456"
            });
        }
        refresh();
        setForm({
            name: "",
            email: "",
            role: defaultRole,
            isActive: true
        })
    }
    // return (

    //     <form
    //         className="user-form"
    //         onSubmit={handleSubmit}
    //     >

    //         <h3>

    //             {form.id
    //                 ? "Update User"
    //                 : "Create User"}

    //         </h3>


    //         <label>Name</label>

    //         <input
    //             name="name"
    //             value={form.name}
    //             onChange={handleChange}
    //         />


    //         <label>Email</label>

    //         <input
    //             name="email"
    //             value={form.email}
    //             onChange={handleChange}
    //         />


    //         <label>Role</label>

    //         <select
    //             name="role"
    //             value={form.role}
    //             onChange={handleChange}
    //         >

    //             <option>User</option>
    //             <option>Admin</option>

    //         </select>


    //         <div className="form-row">
    //             <label className="active-checkbox">
    //                 <input
    //                     type="checkbox"
    //                     name="isActive"
    //                     checked={form.isActive}
    //                     onChange={handleChange}
    //                 />
    //                 Active
    //             </label>

    //             <button type="submit" className="create-btn">
    //                 {form.id ? "Update" : "Add"}
    //             </button>
    //         </div>

    //     </form>

    // )
    return (
    <form className="user-form" onSubmit={handleSubmit}>
      {/* MODAL HEADER */}
      <div className="form-header-container">
        <h3>{form.id ? "Update User" : "Create User"}</h3>
      </div>

      {/* CONTENT AREA */}
      <div className="form-content-area">
        {/* Name Input */}
        <div className="form-group">
          <label>Name</label>
          <input
            name="name"
            placeholder="Enter full name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>

        {/* Email Input */}
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            placeholder="name@company.com"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        {/* Role Select */}
        <div className="form-group">
          <label>Role</label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
          >
            <option value="User">User</option>
            <option value="Admin">Admin</option>
          </select>
        </div>

        {/* CONTENT ROW 1: Active Status Toggle Switch */}
        <div className="content-row-toggle">
          <div className="toggle-info">
            <span className="toggle-title">Active Status</span>
            <span className="toggle-sub">Enable or disable user access</span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {/* MODAL FOOTER / BUTTON TRAY */}
      <div className="modal-footer">
        <div className="button-tray">
          {close && (
            <button type="button" className="cancel-btn" onClick={close}>
              Cancel
            </button>
          )}
          <button type="submit" className="submit-btn">
            {form.id ? "Update User" : "Create User"}
          </button>
        </div>
      </div>
    </form>
  );
}