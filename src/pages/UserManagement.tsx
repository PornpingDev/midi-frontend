import React, { useState, useEffect } from 'react';
import UserTable from '../components/common/UserTable';
import UserModal from '../components/common/UserModal';
import { Button, Container, Row, Col, Form } from 'react-bootstrap';
import bcrypt from 'bcryptjs';
import axios from 'axios';

/* ✅ เพิ่มมาตรฐานแจ้งเตือน + ยืนยัน */
import AlertToast from '../components/common/AlertToast';
import AlertModal from '../components/common/AlertModal';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [modalShow, setModalShow] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  /* ✅ Toast state */
  const [toast, setToast] = useState({
    show: false,
    message: '',
    variant: 'success', // success | danger | warning | info
  });

  /* ✅ Confirm Modal state (ใช้ AlertModal) */
  const [confirm, setConfirm] = useState({
    show: false,
    userId: null,
  });

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:3000/users');
      const usersWithCode = response.data.map((user, index) => ({
        ...user,
        code: user.employee_code || `EMP-${String(index + 1).padStart(3, '0')}`
      }));
      setUsers(usersWithCode);
    } catch (error) {
      console.error('Error fetching users:', error);
      setToast({ show: true, message: '❌ ดึงรายชื่อพนักงานไม่สำเร็จ', variant: 'danger' });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchNextCode = async () => {
    try {
      const response = await axios.get('http://localhost:3000/users/last-code');
      const lastCode = response.data.lastCode; // ตัวอย่าง: "EMP-006"
      let nextNumber = 1;
      if (lastCode) {
        const numPart = parseInt(lastCode.split('-')[1]);
        nextNumber = numPart + 1;
      }
      return `EMP-${String(nextNumber).padStart(3, '0')}`;
    } catch (error) {
      console.error('Error fetching next code:', error);
      return 'EMP-001';
    }
  };

  // ✅ สร้างรหัสพนักงานอัตโนมัติ (สำรอง)
  const getNextCode = () => {
    const codes = users
      .map((u) => u.code)
      .filter(Boolean)
      .map((c) => parseInt(c.split('-')[1]));
    const lastCode = codes.length ? Math.max(...codes) : 0;
    return `EMP-${String(lastCode + 1).padStart(3, '0')}`;
  };

  // ✅ ตรวจสอบไม่ให้ Email ซ้ำกัน
  const isEmailUnique = (email) => !users.some((u) => u.email === email);

  // ✅ เพิ่มพนักงาน
  const handleAddUser = async () => {
    const code = await fetchNextCode(); // ดึงจาก backend
    setSelectedUser({ code });
    setModalShow(true);
  };

  // ✅ แก้ไขพนักงาน
  const handleEditUser = (user) => {
    setSelectedUser({
      ...user,
      password: '********' // mask
    });
    setModalShow(true);
  };

  // ✅ ลบพนักงาน
  const handleDeleteUser = async (id) => {
    try {
      await axios.delete(`http://localhost:3000/users/${id}`);
      await fetchUsers();
      setToast({ show: true, message: '✅ ลบพนักงานสำเร็จ', variant: 'success' });
    } catch (error) {
      console.error('Error deleting user:', error);
      setToast({ show: true, message: '❌ ลบพนักงานไม่สำเร็จ', variant: 'danger' });
    }
  };

  // ✅ บันทึกข้อมูลพนักงาน (เพิ่ม/แก้ไข)
  const handleSaveUser = async (user) => {
    if (!isEmailUnique(user.email) && user.email !== selectedUser?.email) {
      setToast({ show: true, message: '⚠️ Email นี้ถูกใช้งานแล้ว', variant: 'warning' });
      return;
    }
    if (!user || !user.password) {
      setToast({ show: true, message: '⚠️ ข้อมูลไม่ครบถ้วน', variant: 'warning' });
      return;
    }

    const hashedPassword = bcrypt.hashSync(user.password, 10);
    try {
      if (user.id) {
        await axios.put(`http://localhost:3000/users/${user.id}`, {
          employee_code: user.code,
          name: user.name,
          phone: user.phone,
          email: user.email,
          password: hashedPassword,
          position: user.position,
          salary: user.salary,
          role: user.role
        });
      } else {
        await axios.post('http://localhost:3000/users', {
          employee_code: user.code,
          name: user.name,
          phone: user.phone,
          email: user.email,
          password: hashedPassword,
          position: user.position,
          salary: user.salary,
          role: user.role
        });
      }
      await fetchUsers();
      setModalShow(false);
      setToast({ show: true, message: '✅ บันทึกข้อมูลสำเร็จ', variant: 'success' });
    } catch (error) {
      console.error('Error saving user:', error);
      setToast({ show: true, message: '❌ บันทึกข้อมูลไม่สำเร็จ', variant: 'danger' });
    }
  };

  /* ===============================
     RESET PASSWORD (ใช้ AlertModal + Toast)
     =============================== */

  // กดปุ่ม Reset รอคอนเฟิร์ม
  const handleResetPassword = (id) => {
    setConfirm({ show: true, userId: id });
  };

  // กด "ยืนยัน" ใน AlertModal
  const doConfirmReset = async () => {
    const id = confirm.userId;
    if (!id) return;
    try {
      await axios.put(`http://localhost:3000/users/${id}/reset-password`);
      setConfirm({ show: false, userId: null });
      setToast({ show: true, message: '✅ รีเซ็ตรหัสผ่านสำเร็จ (password123)', variant: 'success' });
      await fetchUsers();
    } catch (error) {
      console.error('Reset password error:', error);
      setConfirm({ show: false, userId: null });
      setToast({ show: true, message: '❌ รีเซ็ตรหัสผ่านไม่สำเร็จ', variant: 'danger' });
    }
  };

  // ยกเลิก AlertModal
  const cancelConfirm = () => setConfirm({ show: false, userId: null });

  // ✅ ค้นหา
  const handleSearchChange = (e) => setSearch(e.target.value);

  return (
    <Container>
      <Row className="mt-4 mb-3">
        <Col><h1 className="text-primary">👥 User Management</h1></Col>
        <Col className="text-end">
          <Button variant="primary" onClick={handleAddUser}>เพิ่มพนักงาน</Button>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={4}>
          <Form.Control
            type="text"
            placeholder="ค้นหาพนักงาน..."
            value={search}
            onChange={handleSearchChange}
          />
        </Col>
      </Row>

      <UserTable
        users={users.filter((user) =>
          (user.name || '').toLowerCase().includes(search.toLowerCase()) ||
          (user.employee_code || '').toLowerCase().includes(search.toLowerCase())
        )}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        onResetPassword={handleResetPassword}  // <— ใช้คอนเฟิร์ม modal
      />

      <UserModal
        show={modalShow}
        onHide={() => setModalShow(false)}
        onSave={handleSaveUser}
        nextCode={getNextCode()}
        user={selectedUser}
      />

      {/* 🔔 Toast มาตรฐาน */}
      <AlertToast
        show={toast.show}
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast(t => ({ ...t, show: false }))}
      />

      {/* ❓ AlertModal คอนเฟิร์มรีเซ็ตรหัส */}
      <AlertModal
        show={confirm.show}
        onClose={cancelConfirm}
        onConfirm={doConfirmReset}
        title="ยืนยันรีเซ็ตรหัสผ่าน"
        body="ต้องการรีเซ็ตรหัสผ่านเป็นค่าเริ่มต้น (password123) หรือไม่?"
        variant="warning"
      />
    </Container>
  );
};

export default UserManagement;
