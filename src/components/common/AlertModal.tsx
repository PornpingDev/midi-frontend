import React from "react";
import { Modal, Button } from "react-bootstrap";

const AlertModal = ({
  show,
  onClose,
  onConfirm,
  title = "❗ ยืนยันการดำเนินการ",
  body = "คุณแน่ใจหรือไม่ว่าต้องการดำเนินการนี้?",
  variant = "danger", // "danger", "warning", "success"
}) => {
  const colorMap = {
    danger: "#dc3545",
    warning: "#ffc107",
    success: "#198754",
  };


  const textColorMap = {
    danger: "#ffffff",
    warning: "#000000",
    success: "#ffffff",
  };

  const bgColor = colorMap[variant] || "#0d6efd";
  const textColor = textColorMap[variant] || "#ffffff";

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header
        closeButton
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-dark">{body}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button style={{ backgroundColor: bgColor, borderColor: bgColor }} onClick={onConfirm}>
          ยืนยัน
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AlertModal;
