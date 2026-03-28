import { useState } from "react";
import categoryApi from "../../api/categoryApi";
import CategoryForm from "../form/CategoryForm";
import Modal from "../modal/Modal";

export default function CategoryTable({ categories, refresh }) {

    const [open, setOpen] = useState(false);
    const [editCategory, setEditCategory] = useState(null);

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
     const [deleteId,setDeleteId] = useState(null);

    const pageSize = 4;

    const filtered = categories.filter(c =>
        c.name.toLowerCase()
        .includes(search.toLowerCase())
    );

    const totalPages =
        Math.ceil(filtered.length / pageSize);

    const paginated = filtered.slice(
        (page - 1) * pageSize,
        page * pageSize
    );

    const handleCreate = () => {

        setEditCategory(null);

        setOpen(true);

    };

    const handleEdit = (cat) => {

        setEditCategory(cat);

        setOpen(true);

    };
      const confirmDelete = (id)=>{

        setDeleteId(id);

    };

    const handleDelete = async (id) => {

        await categoryApi.delete(deleteId);

        setDeleteId(null);

        refresh();

    };

    return (

        <div className="category-table">

            <div className="table-header">

                <button className="create-btn" onClick={handleCreate}>
                    Create Category
                </button>

                <input className="search-box"
                    placeholder="Search category..."
                    value={search}
                    onChange={(e)=>setSearch(e.target.value)}
                />

            </div>

            <table>

                <thead>

                    <tr>

                        <th>Name</th>

                        <th>Type</th>

                        <th>Jar</th>

                        <th>Action</th>

                    </tr>

                </thead>

                <tbody>

                    {

                        paginated.map((c)=>(

                            <tr key={c.id}>

                                <td>{c.name}</td>

                                <td>{c.type}</td>

                                <td>{c.jarName}</td>

                                <td className="action-buttons">

                                    <button className="edit-btn"
                                        onClick={()=>handleEdit(c)}
                                    >
                                        Edit
                                    </button>

                                    <button className="delete-btn"
                                        onClick={()=>confirmDelete(c.id)}
                                    >
                                        Delete
                                    </button>

                                </td>

                            </tr>

                        ))

                    }

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

                    <Modal
                        close={()=>setOpen(false)}
                    >

                        <CategoryForm
                            category={editCategory}
                            close={()=>setOpen(false)}
                            refresh={refresh}
                        />

                    </Modal>

                )

            }
            
{

                deleteId && (

                    <Modal close={()=>setDeleteId(null)}>

                        <h3>
                            Delete Category?
                        </h3>

                        <p>
                            Are you sure you want to delete this category?
                        </p>

                        <button className="delete-btn"
                            onClick={handleDelete}
                        >
                            Yes Delete
                        </button>

                        <button
                            onClick={()=>setDeleteId(null)}
                        >
                            Cancel
                        </button>

                    </Modal>

                )

            }

        </div>

    );

}