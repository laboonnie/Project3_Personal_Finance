import { useState } from "react";
import userApi from "../../api/userApi";
import Modal from "../modal/Modal";
import UserForm from "../form/UserForm";
import { toast } from 'react-toastify';

export default function UserTable({ users, refresh, showRole = "User" }) {

    const [editUser, setEditUser] = useState(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [open, setOpen] = useState(false);

    const pageSize = 4;

    const filteredUsers = users.filter(u =>
        u.role === showRole &&
        (u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase()))
    );

    const totalPages = Math.ceil(filteredUsers.length / pageSize);

    const paginatedUsers = filteredUsers.slice(
        (page - 1) * pageSize,
        page * pageSize
    );

    const handleToggleActive = async (id, currentStatus, userName) => {
        const actionText = currentStatus ? 'Lock' : 'Unlock';
        const confirmMessage = `Are you sure you want to ${actionText} access for user "${userName || 'this user'}"?`;

        if (window.confirm(confirmMessage)) {
            try {
                const res = await userApi.toggleActive(id);
                toast.success(res.data.message);
                refresh();
            } catch (error) {
                toast.error(error.response?.data || 'An error occurred!');
            }
        }
    };

    // const handleDelete = async (id, userName) => {
    //     const confirmMessage = `⚠️ CẢNH BÁO NGUY HIỂM ⚠️\n\nYou are about to permanently delete the user: "${userName || 'this user'}".\n\nThis action will DELETE ALL data associated with them, including:\n- Transaction history\n- Financial goals\n- Debts\n- Investment portfolio\n\nThis action cannot be undone. Are you sure you want to proceed?`;

    //     if (window.confirm(confirmMessage)) {
    //         try {
    //             await userApi.deleteUser(id);
    //             toast.success('The user and all associated data have been deleted successfully!');
    //             refresh();

    //         } catch (error) {
    //             toast.error(error.response?.data || 'An error occurred while deleting the user!');
    //         }
    //     }
    // };

    return (

        <div className="user-table">

            <div className="table-header">

                <button className="create-btn"
                    onClick={() => {

                        setEditUser(null);

                        setOpen(true);

                    }}
                >
                    Create {showRole}
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
                            <td style={{ color: u.isActive ? '#059669' : '#dc2626', fontWeight: 'bold' }}>
                                {u.isActive ? "Yes" : "No"}
                            </td>

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

                                {showRole === "User" && (
                                    <button
                                        className="delete-btn"
                                        style={{ backgroundColor: u.isActive ? '#f59e0b' : '#10b981', color: 'white' }}
                                        onClick={() => handleToggleActive(u.id, u.isActive, u.name || u.email)}
                                    >
                                        {u.isActive ? 'Lock' : 'Unlock'}
                                    </button>
                                )}


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
                            className={`btn mx-1 ${page === i + 1 ? 'active' : ''}`}
                            disabled={page === i + 1}
                            onClick={() => setPage(i + 1)}
                            style={{
                                padding: '5px 12px',
                                cursor: page === i + 1 ? 'not-allowed' : 'pointer',
                                backgroundColor: page === i + 1 ? '#3182ce' : '#e2e8f0',
                                color: page === i + 1 ? 'white' : 'black',
                                border: 'none',
                                borderRadius: '5px'
                            }}
                        >
                            {i + 1}
                        </button>
                    ))
                }

            </div>

            {

                open && (

                    <Modal close={() => setOpen(false)}>

                        <UserForm editUser={editUser} refresh={refresh} defaultRole={showRole} />

                    </Modal>

                )

            }

        </div>

    )

}