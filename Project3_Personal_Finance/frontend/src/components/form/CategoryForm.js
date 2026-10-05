import { useEffect, useState } from "react";
import categoryApi from "../../api/categoryApi"
import jarApi from "../../api/jarApi";
export default function CategoryForm({ category, close, refresh }) {
    const [form, setForm] = useState({
        name: "",
        type: "Expense",
        jarId: 0
    });
    const [jars, setJars] = useState([]);
    useEffect(() => {
        loadJars();
        if (category) {
            setForm(category);
        }
    }, [category])
    const loadJars = async () => {
        const res = await jarApi.getAll()
        setJars(res.data);
    }
    const handleChange = (e) => {

    let value = e.target.value;

    if (e.target.name === "jarId") {
        value = parseInt(value);
    }

    setForm({
        ...form,
        [e.target.name]: value
    });
};
   const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Tạo một bản sao dữ liệu sạch để gửi lên API
    const dataToSend = {
        id: form.id,
        name: form.name,
        type: form.type,
        jarId: form.jarId
    };

    if (form.id) {
        // Gửi dataToSend thay vì gửi cả form
        await categoryApi.update(form.id, dataToSend);
    } else {
        await categoryApi.create(dataToSend);
    }
    refresh();
    close();
};
    return (

        <div className="category-form">

            <h3>
                {
                    form.id ? "Update Category" : "Create Category"
                }
            </h3>


            <form onSubmit={handleSubmit}>
                <label>Name</label>
                <input name="name" value={form.name} onChange={handleChange} />
                <label>Type</label>
                <select name="type" value={form.type} onChange={handleChange}>
                    <option>Expense</option>
                    <option>Income</option>
                </select>
                <label>Jar</label>
                <select name="jarId" value={form.jarId} onChange={handleChange}>
                    <option value={0}>Select Jar</option>

                    {jars.map(j => (
                        <option key={j.id} value={j.id} >{j.jarName}</option>
                    ))
                    }
                </select>
                <button type="submit" className="create-btn"> Save </button>
                <button className="delete-btn" type="button" onClick={close} > Cancel</button>
            </form>
        </div>

    );
}