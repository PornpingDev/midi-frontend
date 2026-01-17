import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const SupplierModal = ({ show, onHide, onSave, supplier, nextCode }) => {
  const [formData, setFormData] = useState({
    id: null,
    supplier_code: '',
    name: '',
    address: '',
    phone: '',
    email: '',
    contactPerson: '',
    taxId: '',
    paymentDueDate: '',
    leadTime: '',
    note: ''
  });

  useEffect(() => {
    if (supplier) {
      setFormData({
        id: supplier.id || null,
        supplier_code: supplier.supplier_code || supplier.code || supplier.supplierCode || '',
        name: supplier.name || '',
        address: supplier.address || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        contactPerson: supplier.contactPerson || '',
        taxId: supplier.taxId || '',
        paymentDueDate: supplier.paymentDueDate || '',
        leadTime: supplier.leadTime || '',
        note: supplier.note || ''
      });
    } else {
      setFormData({
        id: null,
        supplier_code: nextCode || '',  
        name: '',
        address: '',
        phone: '',
        email: '',
        contactPerson: '',
        taxId: '',
        paymentDueDate: '',
        leadTime: '',
        note: ''
      });
    }
  }, [supplier, nextCode]);

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
        <Modal.Title>{supplier ? 'แก้ไข Supplier' : 'เพิ่ม Supplier'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>รหัสซัพพลายเออร์</Form.Label>
            <Form.Control
            type="text"
            name="supplier_code"
            value={formData.supplier_code}
            onChange={handleChange}
            placeholder=""
            required
          />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>ชื่อ Supplier</Form.Label>
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
            <Form.Label>ผู้ติดต่อ</Form.Label>
            <Form.Control
              type="text"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleChange}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>เลขประจำตัวผู้เสียภาษี</Form.Label>
            <Form.Control
              type="text"
              name="taxId"
              value={formData.taxId}
              onChange={handleChange}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>วันครบกำหนดชำระเงิน</Form.Label>
            <Form.Select
              name="paymentDueDate"
              value={formData.paymentDueDate}
              onChange={handleChange}
              required
            >
              <option value="">-- เลือกวันครบกำหนด --</option>
              <option value="30">30 วัน</option>
              <option value="45">45 วัน</option>
              <option value="60">60 วัน</option>
              <option value="90">90 วัน</option>
              <option value="120">120 วัน</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>ระยะเวลาผลิต (Lead Time)</Form.Label>
            <Form.Control
              type="number"
              name="leadTime"
              value={formData.leadTime}
              onChange={handleChange}
              placeholder="เช่น 30"
            />
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

export default SupplierModal;
