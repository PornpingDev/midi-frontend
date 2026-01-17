import React, { useState, useEffect } from 'react';
import SupplierTable from '../components/common/SupplierTable';
import SupplierModal from '../components/common/SupplierModal';
import { Button, Container, Row, Col, Form } from 'react-bootstrap';
import axios from 'axios';


const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [modalShow, setModalShow] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);


  const fetchSuppliers = async () => {
    try {
      const response = await axios.get('http://localhost:3000/suppliers');
      setSuppliers(response.data);
    } catch (error: any) {
      console.error(
        '❌ โหลด suppliers ล้มเหลว:',
        error?.response?.status,
        error?.response?.data || error?.message
      );
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);




  // ✅ สร้างรหัส Supplier Code อัตโนมัติ
  const getNextCode = () => {
    if (!suppliers || suppliers.length === 0) {
      return "SUP-001"; // ถ้าไม่มีข้อมูลเลย
    }

    const maxNumber = Math.max(
      ...suppliers.map((s) => {
        const code = s.supplier_code || s.code || "";
        const num = parseInt(code.split("-")[1]);
        return isNaN(num) ? 0 : num;
      })
    );

    // ✅ บวกไปอีก 1 เสมอ
    return `SUP-${String(maxNumber + 1).padStart(3, "0")}`;
  };

  // ✅ เพิ่ม Supplier
  const handleAddSupplier = () => {
    setSelectedSupplier(null);
    setModalShow(true);
  };

  // ✅ แก้ไข Supplier
  const handleEditSupplier = (supplier: any) => {
    // map ให้คีย์ supplier_code มีค่าเสมอ (รองรับหลายชื่อจาก backend/table)
    const normalized = {
      ...supplier,
      supplier_code:
        supplier.supplier_code || supplier.code || supplier.supplierCode || '',
    };
    setSelectedSupplier(normalized);
    setModalShow(true);
  };

  // ✅ ลบ Supplier
  const handleDeleteSupplier = async (id) => {
    try {
      await axios.delete(`http://localhost:3000/suppliers/${id}`); // ใช้ API soft delete
      const updatedSuppliers = suppliers.filter((s) => s.id !== id); // อัปเดต state ด้านหน้า
      setSuppliers(updatedSuppliers);
    } catch (error) {
      console.error("❌ ลบ Supplier ล้มเหลว:", error);
    }
  };

  // ✅ บันทึกข้อมูล Supplier (เพิ่ม/แก้ไข)
  const handleSaveSupplier = async (supplier: any) => {
    try {
      if (supplier.id) {
        // ✅ PUT: ประกอบ payload ให้มี supplier_code เสมอ
        const payload = {
          ...supplier,
          supplier_code:
            (supplier.supplier_code && supplier.supplier_code.trim()) ||
            selectedSupplier?.supplier_code ||   // ค่าจากรายการเดิม
            getNextCode(),                       // กันเผื่อ
        };

        await axios.put(
          `http://localhost:3000/suppliers/${supplier.id}`,
          payload,
          { headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        // ✅ POST: ใส่ supplier_code ให้แน่ใจ
        const payload = {
          ...supplier,
          supplier_code:
            (supplier.supplier_code && supplier.supplier_code.trim()) ||
            getNextCode(),
        };

        await axios.post('http://localhost:3000/suppliers', payload, {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      await fetchSuppliers();   // โหลดใหม่จาก API
      setModalShow(false);
    } catch (error: any) {
      console.error(
        '❌ บันทึก Supplier ล้มเหลว:',
        error?.response?.status,
        error?.response?.data || error?.message
      );
    }
  };






  // ✅ ค้นหา Supplier
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  return (
    <Container>
      <Row className="mt-4 mb-3">
        <Col>
          <h1 className="text-primary">🏢 Supplier Management</h1>
        </Col>
        <Col className="text-end">
          <Button variant="primary" onClick={handleAddSupplier}>
            เพิ่ม Supplier
          </Button>
        </Col>
      </Row>
      <Row className="mb-3">
        <Col md={4}>
          <Form.Control
            type="text"
            placeholder="ค้นหา Supplier..."
            value={search}
            onChange={handleSearchChange}
          />
        </Col>
      </Row>
      <SupplierTable
        suppliers={suppliers.filter((supplier) =>
          (supplier.name || '').toLowerCase().includes(search.toLowerCase()) ||
          (supplier.code || '').toLowerCase().includes(search.toLowerCase())
        )}
        onEdit={handleEditSupplier}
        onDelete={handleDeleteSupplier}
      />
      <SupplierModal
        show={modalShow}
        onHide={() => setModalShow(false)}
        onSave={handleSaveSupplier}
        nextCode={getNextCode()}  // ✅ ส่ง nextCode ไปที่ SupplierModal
        supplier={selectedSupplier}
      />
    </Container>
  );
};

export default SupplierManagement;
