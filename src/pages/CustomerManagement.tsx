import React, { useState, useEffect } from 'react';
import CustomerTable from '../components/common/CustomerTable';
import CustomerModal from '../components/common/CustomerModal';
import { Button, Container, Row, Col, Form } from 'react-bootstrap';
import axios from 'axios';




const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [modalShow, setModalShow] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const fetchCustomers = async () => {
    try {
      const res = await axios.get('http://localhost:3000/customers');
      setCustomers(res.data);
    } catch (error: any) {
      console.error('โหลดข้อมูลลูกค้าไม่สำเร็จ:', error?.response?.status, error?.response?.data || error?.message);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);




  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setModalShow(true);
  };

  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setModalShow(true);
  };

  const handleDeleteCustomer = async (id) => {
    try {
      await axios.delete(`http://localhost:3000/customers/${id}`);
      setCustomers(customers.filter((c) => c.id !== id));
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการลบลูกค้า:', error);
    }
  };
  

  const handleSaveCustomer = async (customer) => {
    try {
      if (customer.id) {
        // PUT (แก้ไข)
        await axios.put(`http://localhost:3000/customers/${customer.id}`, customer, {
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // POST (เพิ่มใหม่) — ใส่ code ให้ชัวร์
        const payload = { code: customer.code || getNextCode(), ...customer };
        await axios.post('http://localhost:3000/customers', payload, {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await fetchCustomers();   // ✅ รีเฟรชจากเซิร์ฟเวอร์ทุกครั้ง
      setModalShow(false);
    } catch (error: any) {
      console.error('❌ เกิดข้อผิดพลาดในการบันทึกลูกค้า:', error?.response?.status, error?.response?.data || error?.message);
    }
  };



  const getNextCode = () => {
    const lastCode = customers.length
      ? Math.max(
          ...customers.map((c) => {
            const parts = c.code?.split('-');
            return parts && parts.length === 2 ? parseInt(parts[1]) : 0;
          })
        )
      : 0;
    return `CUS-${String(lastCode + 1).padStart(3, '0')}`;
  };

  return (
    <Container>
      <Row className="mt-4 mb-3">
        <Col>
          <h1 className="text-primary">🧑‍🤝‍🧑 Customer Management</h1>
        </Col>
        <Col className="text-end">
          <Button variant="primary" onClick={handleAddCustomer}>
            เพิ่มลูกค้า
          </Button>
        </Col>
      </Row>
      <Row className="mb-3">
        <Col md={4}>
          <Form.Control
            type="text"
            placeholder="ค้นหาลูกค้า..."
            value={search}
            onChange={handleSearchChange}
          />
        </Col>
      </Row>
      <CustomerTable
        customers={customers.filter((customer) =>
          (customer.name || '').toLowerCase().includes(search.toLowerCase()) ||
          (customer.code || '').toLowerCase().includes(search.toLowerCase())
        )}
        onEdit={handleEditCustomer}
        onDelete={handleDeleteCustomer}
      />
      <CustomerModal
        show={modalShow}
        onHide={() => setModalShow(false)}
        onSave={handleSaveCustomer}
        nextCode={getNextCode()}
        customer={selectedCustomer}
      />
    </Container>
  );
};

export default CustomerManagement;
