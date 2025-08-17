import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api", // backend Express server
});

export default api;
