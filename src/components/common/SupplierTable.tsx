import React, { useState } from 'react';
import { Table, Button, Modal } from 'react-bootstrap';

const SupplierTable = ({ suppliers, onEdit, onDelete }) => {
  const [showConfirm, setShowConfirm] = useState(false);  
  const [supplierToDelete, setSupplierToDelete] = useState(null);  

  const handleDeleteClick = (supplier) => {
    setSupplierToDelete(supplier);  
    setShowConfirm(true);  
  };

  const handleConfirmDelete = () => {
    if (supplierToDelete) {
      onDelete(supplierToDelete.id);  
      setShowConfirm(false);  
      setSupplierToDelete(null);  
    }
  };

  return (
    <>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th style={{ width: "1%" }}>รหัสผู้ขาย</th>
            <th style={{ width: "5%" }}>ชื่อ Supplier</th>
            <th style={{ width: "7%" }}>ที่อยู่</th>
            <th style={{ width: "2%" }}>เบอร์โทรศัพท์</th>
            <th style={{ width: "1%" }}>อีเมล</th>

            <th style={{ width: "4%" }}>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((supplier) => (
            <tr key={supplier.id}>
              <td>{supplier.code}</td>
              <td>{supplier.name}</td>
              <td>{supplier.address}</td>
              <td>{supplier.phone}</td>
              <td>{supplier.email}</td>

              <td style={{ textAlign: "center" }}>
                <Button
                  variant="warning"
                  className="me-2"
                  style={{ width: "90px" }}
                  onClick={() => onEdit(supplier)}
                >
                  แก้ไข
                </Button>
                <Button
                  variant="danger"
                  style={{ width: "90px" }}
                  onClick={() => handleDeleteClick(supplier)}
                >
                  ลบ
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* ✅ Modal Confirm การลบ */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>ยืนยันการลบ</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          คุณแน่ใจว่าต้องการลบข้อมูล Supplier: <strong>{supplierToDelete?.name}</strong> ?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>
            ยกเลิก
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete}>
            ยืนยันการลบ
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default SupplierTable;
