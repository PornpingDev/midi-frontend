import React, { useEffect } from "react";
import { Toast, ToastContainer } from "react-bootstrap";

const AlertToast = ({ show, onClose, message, variant = "success" }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  const bgColorMap = {
    success: "#198754",   // เขียว
    danger: "#f8d7da",     // แดงอ่อน
    warning: "#fff3cd",    // เหลืองอ่อน
  };

  const textColorMap = {
    success: "#ffffff",   // ขาว
    danger: "#000000",     // ดำ
    warning: "#000000",    // ดำ
  };

  const bgColor = bgColorMap[variant] || "#ffffff";
  const textColor = textColorMap[variant] || "#000000";

  return (
    <ToastContainer position="top-end" className="p-4" style={{ zIndex: 9999 }}>
      <Toast
        show={show}
        onClose={onClose}
        style={{
          minWidth: "320px",
          backgroundColor: bgColor,
          color: textColor,
          fontSize: "17px",
          boxShadow: "0 0 10px rgba(0,0,0,0.3)",
        }}
      >
        <Toast.Header
          closeButton={false}
          style={{
            backgroundColor: bgColor,
            color: textColor,
            fontWeight: "bold",
            fontSize: "16px",
          }}
        >
          <strong className="me-auto">
            {variant === "success" && "✅ สำเร็จ"}
            {variant === "danger" && "❌ ผิดพลาด"}
            {variant === "warning" && "⚠️ แจ้งเตือน"}
          </strong>
        </Toast.Header>
        <Toast.Body style={{ color: textColor }}>{message}</Toast.Body>
      </Toast>
    </ToastContainer>
  );
};

export default AlertToast;
