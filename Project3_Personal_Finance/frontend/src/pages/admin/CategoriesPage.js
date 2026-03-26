import { useEffect, useState } from "react";
import categoryApi from "../../api/categoryApi";
import CategoryTable from "../../components/table/CategoryTable";
import Layout from "../../components/layout/Layout";
import "./category.css"
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
         <Layout>

            <CategoryTable
                categories={categories}
                refresh={fetchCategories}
            />

        </Layout>
    )
}