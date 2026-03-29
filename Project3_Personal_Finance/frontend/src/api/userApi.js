import api from "./api";
const userApi ={
    getAll: ()=> api.get("/users"),
    getById:(id) =>api.get(`/users/${id}`),
    createUser:(data) =>api.post("/users",data),
    updateUser:(id,data) => api.put(`/users/${id}`,data),
    // deleteUser:(id) => api.delete(`/users/${id}`)
    toggleActive: (id) => api.put(`/Users/${id}/toggle-active`),
}

export default userApi;