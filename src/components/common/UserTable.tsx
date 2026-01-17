import React, { useState } from 'react';
import { Table, Button, Modal } from 'react-bootstrap';

const UserTable = ({ users, onEdit, onDelete, onResetPassword }) => {
  const [showConfirm, setShowConfirm] = useState(false);  
  const [userToDelete, setUserToDelete] = useState(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);  
  const [userToReset, setUserToReset] = useState(null);  
  const [showSuccess, setShowSuccess] = useState(false);  

  // ✅ การกดปุ่มลบ
  const handleDeleteClick = (user) => {
    setUserToDelete(user);  
    setShowConfirm(true);  
  };

  // ✅ ยืนยันการลบ
  const handleConfirmDelete = () => {
    if (userToDelete) {
      onDelete(userToDelete.id);  
      setShowConfirm(false);  
      setUserToDelete(null);  
    }
  };

  // ✅ ฟังก์ชันสำหรับ Masking Password
  const maskPassword = (password) => {
    return password ? '********' : '';
  };

  // ✅ การกดปุ่ม Reset Password
  const handleResetClick = (user) => {
    setUserToReset(user);  
    setShowConfirmReset(true);  
  };

  // ✅ ยืนยันการ Reset Password
  const handleConfirmReset = () => {
    if (userToReset) {
      onResetPassword(userToReset.id);  // ✅ เรียกฟังก์ชัน Reset Password
      setShowConfirmReset(false);  
      setShowSuccess(true);  // ✅ แสดงข้อความแจ้งเตือนสำเร็จ
      setUserToReset(null);  
    }
  };


  return (
    <>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>รหัสพนักงาน</th>
            <th>อีเมล (Username)</th>
            <th>Password</th>
            <th>ชื่อพนักงาน</th>
            <th>เบอร์โทรศัพท์</th>
            <th>ตำแหน่ง</th>
            <th>เงินเดือน</th>
            <th>สิทธิ์การเข้าถึง (Role)</th>
            <th>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.employee_code}</td>
              <td>{user.email}</td>
              <td>{maskPassword(user.password)}</td> 
              <td>{user.name}</td>
              <td>{user.phone}</td>              
              <td>{user.position}</td>
              <td>{user.salary}</td>
              <td>{user.role}</td>
              <td style={{ textAlign: "center" }}>
                <div className="d-flex justify-content-center align-items-center gap-2">
                  <Button
                    variant="warning"
                    style={{ width: "90px" }}
                    onClick={() => onEdit(user)}
                  >
                    แก้ไข
                  </Button>
                  <Button
                    variant="secondary"
                    style={{ width: "100px" }}
                    onClick={() => onResetPassword(user.id)}
                  >
                    Reset รหัส
                  </Button>
                  <Button
                    variant="danger"
                    style={{ width: "90px" }}
                    onClick={() => handleDeleteClick(user)}
                  >
                    ลบ
                  </Button>
                </div>
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
          คุณแน่ใจว่าต้องการลบข้อมูลพนักงาน: <strong>{userToDelete?.name}</strong> ?
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

      {/* ✅ Modal Confirm การ Reset Password */}
      <Modal show={showConfirmReset} onHide={() => setShowConfirmReset(false)}>
        <Modal.Header closeButton>
          <Modal.Title>ยืนยันการ Reset รหัสผ่าน</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          คุณแน่ใจว่าต้องการ Reset รหัสผ่านของพนักงาน: <strong>{userToReset?.name}</strong> ?
          <br />
          รหัสผ่านใหม่จะถูกตั้งเป็นค่า Default: <strong>password123</strong>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmReset(false)}>
            ยกเลิก
          </Button>
          <Button variant="primary" onClick={handleConfirmReset}>
            ยืนยันการ Reset
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ✅ Modal แจ้งเตือน Reset สำเร็จ */}
      <Modal show={showSuccess} onHide={() => setShowSuccess(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Reset รหัสผ่านสำเร็จ</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          รหัสผ่านของพนักงาน: <strong>{userToReset?.name}</strong> ถูก Reset เป็น <strong>password123</strong> แล้ว
        </Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={() => setShowSuccess(false)}>
            ตกลง
          </Button>
        </Modal.Footer>
      </Modal>    

    </>
  );
};

export default UserTable;
