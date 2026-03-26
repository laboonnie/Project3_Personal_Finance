import api from "./api";

const jarApi = {

    getAll: () => api.get("/jars"),

    getById: (id) => api.get(`/jars/${id}`)

}

export default jarApi;