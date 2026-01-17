import React, { useState } from 'react';
import { Table, Button, Modal } from 'react-bootstrap';

const CustomerTable = ({ customers, onEdit, onDelete }) => {
  const [showConfirm, setShowConfirm] = useState(false);  // ✅ เพิ่ม State สำหรับ Modal Confirm
  const [customerToDelete, setCustomerToDelete] = useState(null);  // ✅ เก็บข้อมูลลูกค้าที่จะลบ

  // ✅ ฟังก์ชันเมื่อกดปุ่มลบ
  const handleDeleteClick = (customer) => {
    setCustomerToDelete(customer);  // เก็บข้อมูลลูกค้าที่ต้องการลบ
    setShowConfirm(true);  // เปิด Modal Confirm
  };

  // ✅ ฟังก์ชันเมื่อกดยืนยันการลบ
  const handleConfirmDelete = () => {
    if (customerToDelete) {
      onDelete(customerToDelete.id);  // เรียกใช้ฟังก์ชันลบจาก props
      setShowConfirm(false);  // ปิด Modal Confirm
      setCustomerToDelete(null);  // ล้างข้อมูลลูกค้าที่จะลบ
    }
  };

  return (
    <>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th style={{ width: "2%" }}>รหัสลูกค้า</th>
            <th style={{ width: "8%" }}>ชื่อลูกค้า</th>
            <th style={{ width: "10%" }}>ที่อยู่</th>
            <th style={{ width: "2%" }}>เบอร์โทรศัพท์</th>
            <th style={{ width: "1%" }}>อีเมล</th>
{/*          <th style={{ width: "2%" }}>เลขประจำตัวผู้เสียภาษี</th>
          <th style={{ width: "4%" }}>วันวางบิล</th>
          <th style={{ width: "2%" }}>วันครบกำหนดชำระเงิน</th> */}

            <th style={{ width: "7%" }}>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>{customer.code}</td>
              <td>{customer.name}</td>
              <td>{customer.address}</td>
              <td>{customer.phone}</td>
              <td>{customer.email}</td>
{/*            <td>{customer.taxId}</td>
            <td>{customer.billingDate}</td>
            <td>{customer.paymentDueDate}</td>*/}

              <td style={{ textAlign: "center" }}>
                <Button
                  variant="warning"
                  className="me-2"
                  style={{ width: "90px" }}
                  onClick={() => onEdit(customer)}
                >
                  แก้ไข
                </Button>
                <Button
                  variant="danger"
                  className="me-2"
                  style={{ width: "90px" }}
                  onClick={() => handleDeleteClick(customer)}  
                >
                  ลบ
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* ✅ เพิ่ม Modal Confirm การลบ */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>ยืนยันการลบ</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          คุณแน่ใจว่าต้องการลบข้อมูลลูกค้า: <strong>{customerToDelete?.name}</strong> ?
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

export default CustomerTable;
