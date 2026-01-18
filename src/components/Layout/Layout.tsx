import React, { useState } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useUserRole } from "../../hooks/useUserRole";
import { Modal, Button, Form } from "react-bootstrap";
import axios from "axios";
import CustomModal from "../../components/common/CustomModal";
import AlertToast from "../../components/common/AlertToast";

const Layout = () => {
  const { email, role, loading, logout } = useUserRole();
  const navigate = useNavigate();

  // ---------- Change Password Modal state ----------
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdForm, setPwdForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [toast, setToast] = React.useState({
    show: false,
    message: "",
    variant: "success", // success | danger | warning | info
  });

  const openChangePwd = () => {
    setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPwdError("");
    setShowPwd(true);
  };

  const handlePwdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPwdForm((p) => ({ ...p, [name]: value }));
  };

  const submitChangePassword = async () => {
    setPwdError("");
    const { currentPassword, newPassword, confirmPassword } = pwdForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError("กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    if (newPassword.length < 8) {
      setPwdError("รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("รหัสผ่านใหม่และยืนยันรหัสไม่ตรงกัน");
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(
        "/me/change-password",
        { currentPassword, newPassword },
        { headers: { "Content-Type": "application/json" }, withCredentials: true }
      );
      setShowPwd(false);
      setToast({ show: true, message: "✅ เปลี่ยนรหัสผ่านสำเร็จ", variant: "success" });
    } catch (e: any) {
      setPwdError(e?.response?.data?.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Logout ----------
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="d-flex vh-100 justify-content-center align-items-center">
        <div className="text-muted">กำลังตรวจสอบสิทธิ์...</div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column vh-100">
      {/* Header (Navbar) */}
      <nav className="navbar navbar-light bg-light px-3 d-flex justify-content-between align-items-center">
        <span className="navbar-brand">MIDI Stock Management</span>
        <div className="d-flex align-items-center">
          <span className="text-muted me-2">
            ✉️ {email || "-"} | 👤 Role: {role || "-"}
          </span>

          {/* 🔑 ปุ่มเปลี่ยนรหัส */}
          <button className="btn btn-outline-secondary me-2" onClick={openChangePwd}>
            🔑 เปลี่ยนรหัส
          </button>

          <button className="btn btn-outline-danger" onClick={handleLogout}>
            🔓 Logout
          </button>
        </div>
      </nav>

      <div className="d-flex flex-grow-1">
        {/* Sidebar Menu */}
        <div className="bg-light border-end vh-100 p-3 sidebar-menu" style={{ width: "350px" }}>
          <h5 className="text-primary" style={{ fontSize: "1.3rem", fontWeight: "bold" }}>📌 เมนู</h5>
          <ul className="nav flex-column">
            <li className="nav-item"><Link to="/" className="nav-link">🏠 Dashboard</Link></li>

            {role !== "report" && role !== "sales" && (
              <li className="nav-item"><Link to="/stock" className="nav-link">📦 Stock Management</Link></li>
            )}
            {role !== "report" && (
              <li className="nav-item"><Link to="/sales" className="nav-link">🚚 Sales & Delivery</Link></li>
            )}

            <li className="nav-item"><Link to="/reports" className="nav-link">📊 Reports & Notifications</Link></li>

            {role !== "report" && (
              <li className="nav-item"><Link to="/documents" className="nav-link">📑 Document Management</Link></li>
            )}

            {/* 🧾 PO Management — ให้ admin กับ stock เห็นเมนูนี้ */}
            {(role === "admin" || role === "stock") && (
              <li className="nav-item">
                <Link to="/po-management" className="nav-link">🧾 PO Management</Link>
              </li>
            )}

            {role === "admin" && (
              <li className="nav-item"><Link to="/users" className="nav-link">👥 User Management</Link></li>
            )}

            {(role === "admin" || role === "stock") && (
              <li className="nav-item">
                <Link to="/customer-management" className="nav-link">🧑‍🤝‍🧑 Customer Management</Link>
                <Link to="/supplier-management" className="nav-link">🏢 Supplier Management</Link>
              </li>
            )}
          </ul>

        </div>

        {/* Main Content */}
        <div className="container mt-4">
          <Outlet />
        </div>
      </div>

      {/* 🔐 Modal เปลี่ยนรหัสผ่าน */}
      <CustomModal
        show={showPwd}
        title="🔑 เปลี่ยนรหัสผ่าน"
        onClose={() => setShowPwd(false)}
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowPwd(false)}>
              ยกเลิก
            </button>
            <button className="btn btn-primary ms-2" onClick={submitChangePassword} disabled={submitting}>
              {submitting ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </>
        }
      >
        <form onSubmit={(e)=>{e.preventDefault(); submitChangePassword();}}>
          <div className="mb-3">
            <label className="form-label">รหัสผ่านเดิม</label>
            <input
              type="password"
              name="currentPassword"
              className="form-control"
              value={pwdForm.currentPassword}
              onChange={handlePwdChange}
              autoFocus
            />
          </div>
          <div className="mb-3">
            <label className="form-label">รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</label>
            <input
              type="password"
              name="newPassword"
              className="form-control"
              value={pwdForm.newPassword}
              onChange={handlePwdChange}
            />
          </div>
          <div>
            <label className="form-label">ยืนยันรหัสผ่านใหม่</label>
            <input
              type="password"
              name="confirmPassword"
              className="form-control"
              value={pwdForm.confirmPassword}
              onChange={handlePwdChange}
            />
          </div>
          {pwdError && <div className="text-danger small mt-2">{pwdError}</div>}
        </form>
      </CustomModal>
      <AlertToast
        show={toast.show}
        message={toast.message}
        variant={toast.variant}   // "success" | "danger" | "warning" | "info"
        onClose={() => setToast(t => ({ ...t, show: false }))}
      />
    </div>
    
  );
};

export default Layout;
