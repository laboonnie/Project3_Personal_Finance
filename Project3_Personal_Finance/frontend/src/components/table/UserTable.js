import { useState } from "react";
import userApi from "../../api/userApi";
import Modal from "../modal/Modal";
import UserForm from "../form/UserForm";
import { toast } from 'react-toastify';

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

    const handleDelete = async (id, userName) => { 
    
    // 1. Tạo thông báo cảnh báo chi tiết
    const confirmMessage = `⚠️ CẢNH BÁO NGUY HIỂM ⚠️\n\nBạn đang chuẩn bị xóa vĩnh viễn người dùng: "${userName || 'này'}".\n\nHành động này sẽ XÓA SẠCH toàn bộ dữ liệu của họ bao gồm:\n- Lịch sử giao dịch\n- Mục tiêu tài chính\n- Các khoản nợ\n- Danh mục đầu tư\n\nHành động này KHÔNG THỂ khôi phục. Bạn có CHẮC CHẮN muốn tiếp tục?`;

    // 2. Hỏi người dùng có xác nhận không
    if (window.confirm(confirmMessage)) {
        try {
            // 3. Gọi API xóa từ file userApi.js của bạn
            await userApi.deleteUser(id);

            // 4. Thông báo thành công
            toast.success('Đã xóa người dùng và toàn bộ dữ liệu liên quan!');

            // 5. Tải lại bảng theo logic của bạn
            refresh(); 

        } catch (error) {
            // Báo lỗi (Ví dụ: Bắt lỗi Admin không được tự xóa chính mình từ Backend trả về)
            toast.error(error.response?.data || 'Đã có lỗi xảy ra khi xóa người dùng!');
        }
    }
};

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
                                    onClick={() => handleDelete(u.id, u.name || u.email)}
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