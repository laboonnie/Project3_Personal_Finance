import { useEffect, useState } from "react";
import categoryApi from "../../api/categoryApi"
import jarApi from "../../api/jarApi";
export default function CategoryForm({ category, close, refresh }) {
    const [form, setForm] = useState({
        name: "",
        type: "Expense",
        jarId: ""
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
        setForm({
            ...form,
            [e.target.name]: e.target.value
        })
    }
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.id) {
            await categoryApi.update(form.id, form)

        } else {
            await categoryApi.create(form)

        }
        refresh();
        close();
    }
        return(

        <div className="category-form">

            <h3>

                {

                    form.id

                    ? "Update Category"

                    : "Create Category"

                }

            </h3>


            <form onSubmit={handleSubmit}>


                <label>Name</label>

                <input

                    name="name"

                    value={form.name}

                    onChange={handleChange}

                />


                <label>Type</label>

                <select

                    name="type"

                    value={form.type}

                    onChange={handleChange}

                >

                    <option>Expense</option>

                    <option>Income</option>

                </select>


                <label>Jar</label>

                <select

                    name="jarId"

                    value={form.jarId}

                    onChange={handleChange}

                >

                    <option value="">

                        Select Jar

                    </option>

                    {

                        jars.map(j=>(
                            <option
                                key={j.id}
                                value={j.id}
                            >
                                {j.jarName}
                            </option>
                        ))

                    }

                </select>


                <button type="submit">

                    Save

                </button>


                <button

                    type="button"

                    onClick={close}

                >

                    Cancel

                </button>


            </form>

        </div>

    );
}