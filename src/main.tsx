import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import "bootstrap/dist/css/bootstrap.min.css";

import axios from 'axios';

// ✅ รองรับทั้ง VITE_API_BASE และ VITE_API_BASE_URL (กันพลาดชื่อ env)
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  'http://localhost:3000';

// ✅ ตั้งค่ากลางให้ axios ทั้งโปรเจกต์
axios.defaults.baseURL = API_BASE;
axios.defaults.withCredentials = true; // ส่ง cookie session ไปทุก request



createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

