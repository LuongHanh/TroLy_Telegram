import axios from "axios";

const apiAdmin = axios.create({ baseURL: "http://localhost:3000" });

apiAdmin.interceptors.request.use(config => {
  const token = sessionStorage.getItem("adminToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default apiAdmin;
