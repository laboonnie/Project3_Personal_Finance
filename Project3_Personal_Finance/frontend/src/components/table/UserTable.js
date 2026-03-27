import { useState } from "react";
import userApi from "../../api/userApi";
import Modal from "../modal/Modal";
import UserForm from "../form/UserForm";

export default function UserTable({ users, refresh }) {

    const [editUser, setEditUser] = useState(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [open, setOpen] = useState(false);

    const pageSize = 5;

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const totalPages = Math.ceil(filteredUsers.length / pageSize);

    const paginatedUsers = filteredUsers.slice(
        (page - 1) * pageSize,
        page * pageSize
    );

    const handleDelete = async (id) => {

        await userApi.deleteUser(id);

        refresh();

    }

    return (

        <div className="user-table">

            <div className="table-header">

                <button className="create-btn"
                    onClick={() => {

                        setEditUser(null);

                        setOpen(true);

                    }}
                >
                    Create User
                </button>

                <input className="search-box"
                    placeholder="Search name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

            </div>

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

                    {paginatedUsers.map((u) => (

                        <tr key={u.id}>

                            <td>{u.name}</td>
                            <td>{u.email}</td>
                            <td>{u.role}</td>
                            <td>{u.isActive ? "Yes" : "No"}</td>

                            <td>
                                {new Date(u.createdAt)
                                    .toLocaleDateString()}
                            </td>

                            <td className="action-buttons">

                                <button className="edit-btn"
                                    onClick={() => {

                                        setEditUser(u);

                                        setOpen(true);

                                    }}
                                >
                                    Edit
                                </button>

                                <button className="delete-btn"
                                    onClick={() => handleDelete(u.id)}
                                >
                                    Delete
                                </button>

                            </td>

                        </tr>

                    ))}

                </tbody>

            </table>

            <div className="pagination">

                {

                    Array.from({ length: totalPages }, (_, i) => (

                        <button
                            key={i}
                            onClick={() => setPage(i + 1)}
                        >
                            {i + 1}
                        </button>

                    ))

                }

            </div>

            {

                open && (

                    <Modal close={() => setOpen(false)}>

                        <UserForm
                            editUser={editUser}
                            refresh={refresh}
                        />

                    </Modal>

                )

            }

        </div>

    )

}