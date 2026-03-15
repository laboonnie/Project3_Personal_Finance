import { useEffect, useState } from "react";
import categoryApi from "../../api/categoryApi";
import CategoryTable from "../../components/table/CategoryTable";

export default function CategoriesPage() {
    const [categories,setCategories] = useState([])

    const fetchCategories = async ()=>{
        const res = await categoryApi.getAll();
        setCategories(res.data);
    };

    useEffect(()=>{
        fetchCategories();
    },[])
    return(
        <div>
            <h2>Category Management</h2>
            <CategoryTable  categories={categories} refresh={fetchCategories}/>
        </div>
    )
}