import api from "./api";
const categoryApi = {
    getAll: () => api.get("/categories"),
    create: (data) => api.post("/categories", data),
    update: (id, data) => api.put(`/categories/${id}`, data), 
    delete: (id) => api.delete(`/categories/${id}`)
}
export default categoryApi;