import axios from "axios";

const apiAdmin = axios.create({ baseURL: import.meta.env.VITE_API_URL });

apiAdmin.interceptors.request.use(config => {
  const token = sessionStorage.getItem("adminToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default apiAdmin;
