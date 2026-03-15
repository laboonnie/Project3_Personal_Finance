import { useEffect ,useState} from "react";
import categoryApi from "../../api/categoryApi"

export default function CategoryForm({category,close,refresh}){
    const [form,setForm] = useState({
        name:"",
        type:"Expense",
        jarId:""
    });

    useEffect(()=>{
        if(category){
            setForm(category);
        }
    },[category])

    const handleChange = (e) =>{
        setForm({
            ...form,
            [e.target.name] : e.target.value
        })
    }
    const handleSubmit = async(e)=>{
        e.preventDefault();
        if(form.id){
            await categoryApi.update(form.id,form)

        }else{
            await categoryApi.create(form)

        }
        refresh();
        close();
    }
    return(
        <div>
            <h3>{form.id ? "Update Category":"Create Category"}</h3>
            <form onSubmit={handleSubmit}>
                <div>
                    <p>Name:</p>
                    <input name="Name" value={form.name} onChange={handleChange}/>
                </div>
                <div>
                    <p>Type:</p>
                    <select name="type" value={form.type} onChange={handleChange}>
                        <option>Expense</option>
                        <option>Income</option>
                    </select>
                </div>
                <div>
                    <p>Jar Id:</p>
                     <input name="jarId" value={form.jarId} onChange={handleChange}/>
                </div>
                <br/>
                <button type="submit">Save</button>
                <button type="button" onClick={close}>Cancel</button>
            </form>  
        </div>
    )
}