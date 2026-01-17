import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const CustomerModal = ({ show, onHide, onSave, customer, nextCode }) => {
  const [formData, setFormData] = useState({
  id: null,
  customer_no: '', 
  name: '',
  address: '',
  phone: '',
  email: '',
  tax_id: '',
  billing_date: '',
  payment_due_date: '',
  note: ''
});

  useEffect(() => {
    if (customer) {
      setFormData({
        id: customer.id || null,
        customer_no: customer.customer_no || customer.code || '',
        name: customer.name || '',
        address: customer.address || '',
        phone: customer.phone || '',
        email: customer.email || '',
        tax_id: customer.tax_id || '',
        billing_date: customer.billing_date || '',
        payment_due_date: customer.payment_due_date || '',
        note: customer.note || ''
      });
    } else {
      setFormData({
        id: null,
        customer_no: nextCode || '',
        name: '',
        address: '',
        phone: '',
        email: '',
        tax_id: '',
        billing_date: '',
        payment_due_date: '',
        note: ''
      });
    }
  }, [customer, nextCode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>{customer ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้า'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>รหัสลูกค้า</Form.Label>
            <Form.Control
              type="text"
              name="customer_no"
              value={formData.customer_no}
              onChange={handleChange}
              required
              placeholder="เช่น CUS-001"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>ชื่อลูกค้า</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>ที่อยู่</Form.Label>
            <Form.Control
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>เบอร์โทรศัพท์</Form.Label>
            <Form.Control
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>อีเมล</Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>เลขประจำตัวผู้เสียภาษี</Form.Label>
            <Form.Control
              type="text"
              name="tax_id"
              value={formData.tax_id}
              onChange={handleChange}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>วันวางบิล (1-31)</Form.Label>
            <Form.Control
              type="number"
              name="billing_date"
              value={formData.billing_date}
              onChange={handleChange}
              min="1"
              max="31"
              placeholder="ใส่วันที่วางบิล (1-31)"
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>วันครบกำหนดชำระเงิน</Form.Label>
            <Form.Select
              name="payment_due_date"
              value={formData.payment_due_date}
              onChange={handleChange}
              required
            >
              <option value="">-- เลือกวันครบกำหนดชำระเงิน --</option>
              <option value="30">30 วัน</option>
              <option value="45">45 วัน</option>
              <option value="60">60 วัน</option>
              <option value="90">90 วัน</option>
              <option value="120">120 วัน</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>หมายเหตุ</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="note"
              value={formData.note}
              onChange={handleChange}
            />
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

export default CustomerModal;
