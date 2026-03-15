import { useState } from "react";
import categoryApi from "../../api/categoryApi";
import CategoryForm from "../form/CategoryForm";

export default function CategoryTable ({categories,refresh}){
    const [open,setOpen] = useState(false);
    const [editCategory,setEditCategory] = useState(null)

    const handleCreate = ()=>{
        setEditCategory(null)
        setOpen(true);
    }
    const handleEdit = (cat)=>{
        setEditCategory(cat);
        setOpen(true);
    }
    const handleDelete = async (id)=>{
        await categoryApi.delete(id);
        refresh();
    }

    return(
        <div>
            <button onClick={handleCreate}>Create Category</button>
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
                    {categories.map((c)=>(
                        <tr key={c.id}>
                            <td>{c.name}</td>
                            <td>{c.type}</td>
                            <td>{c.jarName}</td>
                            <td>
                                <button onClick={()=>handleEdit(c)}>Edit</button>
                                <button onClick={()=>handleDelete(c.id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {open && (
                <CategoryForm  category={editCategory} close={()=> setOpen(false) } refresh={refresh}/>
            )}
        </div>
    )
}