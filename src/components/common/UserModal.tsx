import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import bcrypt from 'bcryptjs';

const UserModal = ({ show, onHide, onSave, user, nextCode, existingEmails }) => {
  const [formData, setFormData] = useState({
    id: null,
    code: '',
    email: '',
    password: '',
    name: '',
    phone: '',
    position: '',
    salary: '',
    role: ''
  });

  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        id: user.id || null,
        code: user.code || '',
        email: user.email || '',
        password: user.password || 'Sripara5105809',
        name: user.name || '',
        phone: user.phone || '',
        position: user.position || '',
        salary: user.salary || '',
        role: user.role || 'sales'
      });
    } else {
      setFormData({
        id: null,
        code: nextCode,
        email: '',
        password: 'Sripara5105809',
        name: '',
        phone: '',
        position: '',
        salary: '',
        role: 'sales'
      });
    }
  }, [user, nextCode]);

  // ✅ ฟังก์ชัน Handle Change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  const { name, value } = e.target as HTMLInputElement;
  setFormData((prev) => ({
    ...prev,
    [name]: value
  }));


  // ✅ ตรวจสอบ Email ซ้ำ (ต้องอยู่ภายในฟังก์ชัน handleChange)
    if (name === 'email') {
      if (existingEmails.includes(value) && value !== user?.email) {
        setEmailError('Email นี้ถูกใช้งานแล้ว');
      } else {
        setEmailError('');
      }
    }
  };


  // ✅ บันทึกข้อมูล
  const handleSave = () => {
    if (emailError) {
      alert('กรุณาแก้ไข Email ให้ถูกต้อง');
      return;
    }
    onSave(formData);
  };


  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>{user ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงาน'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>รหัสพนักงาน (Employee Code)</Form.Label>
            <Form.Control
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              readOnly={!!user} // ✅ แก้ไขได้เฉพาะตอนเพิ่ม
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>อีเมล (ใช้เป็น Username)</Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              isInvalid={!!emailError}
              placeholder="เช่น admin@example.com"
            />
            <Form.Control.Feedback type="invalid">
              {emailError}
            </Form.Control.Feedback>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>รหัสผ่าน (Password)</Form.Label>
            <Form.Control
              type="text"  // ✅ แสดง Password แบบ Plain Text
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="กรอกรหัสผ่าน"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>ชื่อพนักงาน (Employee Name)</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>เบอร์โทรศัพท์ (Phone)</Form.Label>
            <Form.Control
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </Form.Group>         
          <Form.Group className="mb-3">
            <Form.Label>ตำแหน่ง (Position)</Form.Label>
            <Form.Control
              type="text"
              name="position"
              value={formData.position}
              onChange={handleChange}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>เงินเดือน (Salary)</Form.Label>
            <Form.Control
              type="number"
              name="salary"
              value={formData.salary}
              onChange={handleChange}
              min="0"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>สิทธิ์การเข้าถึง (Role)</Form.Label>
            <Form.Select
              name="role"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="admin">Admin</option>
              <option value="report">Reports Viewer</option>
              <option value="sales">Sales & Delivery</option>
              <option value="stock">Stock Management</option>
            </Form.Select>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          ยกเลิก
        </Button>
        <Button variant="primary" onClick={handleSave}>
          บันทึก
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default UserModal;
