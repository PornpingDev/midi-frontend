import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: JSX.Element;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // ✅ ดึงค่า Email และ Role จาก Local Storage โดยตรง
  const email = localStorage.getItem('userEmail');
  const role = localStorage.getItem('userRole');

  // ✅ ถ้าไม่มี Email หรือ Role → Redirect ไป /login
  if (!email || !role) {
    return <Navigate to="/login" replace />;
  }

  // ✅ ถ้า Login แล้ว → เข้าได้ตามปกติ
  return children;
};

export default ProtectedRoute;
