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
        <form className="category-form" onSubmit={handleSubmit}>
            {/* MODAL HEADER */}
            <div className="form-header-container">
                <h3>{form.id ? "Update Category" : "Create Category"}</h3>
            </div>

            {/* CONTENT AREA */}
            <div className="form-content-area">
                <div className="form-group">
                    <label>Name</label>
                    <input
                        name="name"
                        type="text"
                        placeholder="Enter category name"
                        value={form.name}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Type</label>
                    <select name="type" value={form.type} onChange={handleChange}>
                        <option value="Expense">Expense</option>
                        <option value="Income">Income</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Jar</label>
                    <select name="jarId" value={form.jarId} onChange={handleChange}>
                        <option value={0}>Select Jar</option>
                        {jars.map((j) => (
                            <option key={j.id} value={j.id}>
                                {j.jarName}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="modal-footer">
                <div className="button-tray">
                    {close && (
                        <button type="button" className="cancel-btn" onClick={close}>
                            Cancel
                        </button>
                    )}
                    <button type="submit" className="submit-btn">
                        Save
                    </button>
                </div>
            </div>
        </form>
    );
}