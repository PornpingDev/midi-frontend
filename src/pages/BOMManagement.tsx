import React, { useState, useEffect } from "react";
import { Button, Table, Form, Modal } from "react-bootstrap";
import Select from "react-select";
import axios from "axios";
import AlertModal from "../components/common/AlertModal";
import CustomModal from "../components/common/CustomModal";
import AlertToast from "../components/common/AlertToast";
import ProduceModal from "../components/bom/ProduceModal";


const BOMManagement = () => {
  const [selectedBOM, setSelectedBOM] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  
  const [toast, setToast] = useState({ show: false, message: "", variant: "success" });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBOM, setNewBOM] = useState({
    name: "",
    components: [
      { part: null, quantity: 1 },
      { part: null, quantity: 1 }
    ],
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bomToDelete, setBomToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [boms, setBoms] = useState([]);
    useEffect(() => {
      axios.get("http://localhost:3000/boms")
        .then((res) => {
          const transformed = res.data.map((bom) => ({
            id: bom.id,               // ✅ ใช้ ID จริง (INT)
            code: bom.bom_code,       // ✅ ใช้สำหรับแสดงในตาราง
            name: bom.bom_name,
            available: bom.bom_available ?? 0,
            components: []
          }));
          setBoms(transformed);
        })
        .catch((err) => {
          console.error("❌ โหลด BOM ล้มเหลว:", err);
        });
    }, []);

    const filteredBOMs = boms.filter(
      (bom) =>
        bom.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bom.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentBOMs = filteredBOMs.slice(indexOfFirstItem, indexOfLastItem);

    const [produceModal, setProduceModal] = useState({ show: false, bom: null });
    const openProduceModal = (bom) => setProduceModal({ show: true, bom });
    const closeProduceModal = () => setProduceModal({ show: false, bom: null });

    


    
    const [stockParts, setStockParts] = useState([]);

    useEffect(() => {
      const fetchStockParts = async () => {
        try {
          const res = await axios.get("http://localhost:3000/products");
          const formatted = res.data.map((item) => ({
            value: item.id,
            label: `${item.product_name} (เหลือ: ${item.available})`,
            name: item.product_name,
            available: item.available,
          }));
          setStockParts(formatted);
        } catch (error) {
          console.error("❌ โหลดสินค้าไม่สำเร็จ:", error);
        }
      };
    
      fetchStockParts();
    }, []);


    const handleAddBOM = async () => {
      try {
        // ✅ ตรวจสอบชื่อ BOM และ component
        if (!newBOM.name.trim()) {
          alert("❌ กรุณาระบุชื่อ BOM");
          return;
        }
    
        const validComponents = newBOM.components
          .map((c) => (c.part && c.quantity ? {
            product_id: Number(c.part),
            quantity_required: Number(c.quantity)
          } : null))
          .filter((c) => c !== null);
    
        if (validComponents.length === 0) {
          alert("❌ กรุณาเลือกส่วนประกอบอย่างน้อย 1 รายการ");
          return;
        }
    
        // 📦 สร้าง payload และส่งไปที่ backend
        const payload = {
          bom_name: newBOM.name,
          components: validComponents,
        };
    
        await axios.post("http://localhost:3000/boms/full", payload);
    
        // ♻️ โหลด BOM ใหม่
        const res = await axios.get("http://localhost:3000/boms");
        const transformed = res.data.map((bom) => ({
          id: bom.id,
          code: bom.bom_code,
          name: bom.bom_name,
          stock: bom.stock,
          components: [],
        }));
        setBoms(transformed);
    
        // 🔄 reset state
        setNewBOM({
          name: "",
          components: [
            { part: "", quantity: 1 },
            { part: "", quantity: 1 },
          ],
        });
        setShowAddModal(false);
        alert("✅ เพิ่ม BOM พร้อม Component สำเร็จแล้ว");
      } catch (error) {
        console.error("❌ เพิ่ม BOM ล้มเหลว:", error);
        alert("❌ เกิดข้อผิดพลาดในการเพิ่ม BOM");
      }
    };
        
  

  

  const handleAddComponent = () => {
    setNewBOM((prev) => ({
      ...prev,
      components: [...prev.components, { part: "", quantity: 1 }],
    }));
  };

  const handleRemoveComponent = (index) => {
    const updated = newBOM.components.filter((_, i) => i !== index);
    setNewBOM({ ...newBOM, components: updated });
  };


  const handleViewBOM = async (bom) => {
    try {
      const res = await axios.get(`http://localhost:3000/bom-components?bom_id=${bom.id}`);
      
      const components = res.data.map((comp) => ({
        name: comp.name,
        quantity: comp.quantity_required,
        stock: comp.stock
      }));
  
      setSelectedBOM({ ...bom, components });
      setShowViewModal(true);
    } catch (error) {
      console.error("❌ โหลด component ล้มเหลว:", error);
    }
  };

  const handleEditBOM = async (bom) => {
    try {
      const res = await axios.get(`http://localhost:3000/bom-components?bom_id=${bom.id}`);
      const components = res.data.map((comp) => ({
        part: Number(comp.product_id),
        quantity: comp.quantity_required,
      }));
  
      setSelectedBOM({ ...bom, components });
      setShowEditModal(true);
    } catch (err) {
      console.error("❌ โหลด component ไม่สำเร็จ:", err);
    }
  };
  

  const handleSaveEditBOM = async () => {
    try {
      // 1️⃣ ตรวจสอบข้อมูลก่อนส่ง
      if (!selectedBOM?.name.trim()) {
        setToast({
          show: true,
          message: "❌ กรุณาระบุชื่อ BOM",
          variant: "danger",
        });

        return;
      }
  
      const validComponents = selectedBOM.components
      .map((c) => (c.part && c.quantity ? {
        product_id: Number(c.part),
        quantity_required: Number(c.quantity)
      } : null))
      
        .filter((c) => c !== null);
  
      if (validComponents.length === 0) {
        setToast({
          show: true,
          message: "❌ กรุณาเลือกส่วนประกอบอย่างน้อย 1 รายการ",
          variant: "danger",
        });

        return;
      }
  
      // 2️⃣ เตรียม payload
      const payload = {
        bom_name: selectedBOM.name,
        components: validComponents,
      };
  
      // 3️⃣ ส่ง PUT ไปยัง backend
      await axios.put(`http://localhost:3000/boms/full/${selectedBOM.id}`, payload);
  
      // 4️⃣ โหลด BOM ใหม่หลังบันทึก
      const res = await axios.get("http://localhost:3000/boms");
      const transformed = res.data.map((bom) => ({
        id: bom.id,
        code: bom.bom_code,
        name: bom.bom_name,
        stock: bom.stock,
        components: [],
      }));
      setBoms(transformed);
  
      // 5️⃣ ปิด modal
      setShowEditModal(false);
      setToast({
        show: true,
        message: "✅ แก้ไข BOM สำเร็จแล้ว",
        variant: "success",
      });

    } catch (error) {
      console.error("❌ แก้ไข BOM ล้มเหลว:", error);
      alert("❌ เกิดข้อผิดพลาดในการแก้ไข BOM");
    }
  };
  


  const handleRemoveBOM = async (id) => {
    if (!window.confirm("คุณแน่ใจว่าต้องการลบ BOM นี้หรือไม่?")) return;
  
    try {
      await axios.delete(`http://localhost:3000/boms/${id}`);
      
      // โหลด BOM ใหม่หลังลบ
      const res = await axios.get("http://localhost:3000/boms");
      const transformed = res.data.map((bom) => ({
        id: bom.id,
        code: bom.bom_code,
        name: bom.bom_name,
        stock: bom.stock,
        components: []
      }));
      setBoms(transformed);
    } catch (err) {
      console.error("❌ ลบ BOM ไม่สำเร็จ:", err);
    }
  };


  const confirmDeleteBOM = async () => {
    if (!bomToDelete || !bomToDelete.id) return;
  
    try {
      await axios.delete(`http://localhost:3000/boms/${bomToDelete.id}`);
  
      const res = await axios.get("http://localhost:3000/boms");
      const transformed = res.data.map((bom) => ({
        id: bom.id,
        code: bom.bom_code,
        name: bom.bom_name,
        stock: bom.stock,
        components: []
      }));
      setBoms(transformed);
  
      setShowDeleteModal(false);
      setBomToDelete(null);
    } catch (err) {
      console.error("❌ ลบ BOM ไม่สำเร็จ:", err);
    }
  };


  
  




  return (
    <div className="container mt-4">
      <h1 className="text-primary">🛠️ BOM Management</h1>
      <Button className="mb-3" variant="success" onClick={() => setShowAddModal(true)}>➕ เพิ่ม BOM</Button>
      <Form.Control
        type="text"
        className="mb-3"
        placeholder="🔍 ค้นหา BOM..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <Table striped bordered hover>
        <thead>
          <tr>
            <th>รหัส BOM</th>
            <th>ชื่อ BOM</th>
            <th>คงเหลือ (FG)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentBOMs.map((bom, index) => (
            <tr key={index}>
              <td>{bom.code}</td>
              <td>{bom.name}</td>
              <td>{bom.available}</td>
              <td>
                <Button variant="info" className="me-2" onClick={() => handleViewBOM(bom)}>🔍 ดู</Button>
                <Button variant="warning" className="me-2" onClick={() => handleEditBOM(bom)}>✏️ แก้ไข</Button>
                <Button variant="success" className="me-2" onClick={() => openProduceModal(bom)}>🏭 สั่งผลิต</Button>
                <Button variant="danger" onClick={() => {
                  setBomToDelete(bom);        // bom คือ object ทั้งตัว
                  setShowDeleteModal(true);
                }}>
                  ❌ ลบ
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>


      <CustomModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onClose={() => setShowAddModal(false)}
        title="➕ เพิ่ม BOM ใหม่"
        
      >
        <Form.Group className="mb-3">
          <Form.Label>ชื่อ BOM</Form.Label>
          <Form.Control
            type="text"
            value={newBOM.name}
            onChange={(e) => setNewBOM({ ...newBOM, name: e.target.value })}
          />
        </Form.Group>

        <h5 className="mt-3">📋 รายการ Component</h5>
        <Table bordered>
          <thead>
            <tr>
              <th>สินค้า</th>
              <th style={{ width: "20%" }}>จำนวน</th>
              <th style={{ width: "10%" }}></th>
            </tr>
          </thead>
          <tbody>
            {newBOM.components.map((comp, index) => (
              <tr key={index}>
                <td>
                  <Select
                    options={stockParts}
                    placeholder="เลือกส่วนประกอบ"
                    value={stockParts.find((p) => p.value === comp.part) || null}
                    onChange={(selected) => {
                      const updated = [...newBOM.components];
                      updated[index].part = selected?.value ?? null; // product_id
                      setNewBOM({ ...newBOM, components: updated });
                    }}
                  />
                </td>
                <td>
                  <Form.Control
                    type="number"
                    min={1}
                    value={comp.quantity}
                    onChange={(e) => {
                      const updated = [...newBOM.components];
                      updated[index].quantity = Number(e.target.value);
                      setNewBOM({ ...newBOM, components: updated });
                    }}
                  />
                </td>
                <td className="text-center">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveComponent(index)}
                    disabled={newBOM.components.length <= 1}
                  >
                    🗑️
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

        <Button variant="outline-success" onClick={handleAddComponent}>
          ➕ เพิ่ม Component
        </Button>

        <div className="d-flex justify-content-end mt-3">
          <Button variant="secondary" className="me-2" onClick={() => setShowAddModal(false)}>
            ปิด
          </Button>
          <Button variant="success" onClick={handleAddBOM}>
            บันทึก
          </Button>
        </div>
    

      </CustomModal>


      <Modal show={showViewModal} onHide={() => setShowViewModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>🔍 ข้อมูล BOM</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedBOM && (
            <div>
              <p><strong>ชื่อ BOM:</strong> {selectedBOM.name}</p>
              <p><strong>จำนวนคงเหลือ (FG):</strong> {selectedBOM.available}</p>
              <h5>📋 รายการ Component:</h5>
              <ul>
                {selectedBOM.components.map((comp, index) => (
                  <li key={index}>
                    {comp.name} ({comp.quantity} ชิ้น) – คงเหลือ: {comp.stock}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>ปิด</Button>
        </Modal.Footer>
      </Modal>


      <CustomModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        onClose={() => setShowEditModal(false)}
        title="✏️ แก้ไข BOM"
      >
        {selectedBOM && (
          <>
            <Form.Group className="mb-3">
              <Form.Label>ชื่อ BOM</Form.Label>
              <Form.Control
                type="text"
                value={selectedBOM.name}
                onChange={(e) =>
                  setSelectedBOM({ ...selectedBOM, name: e.target.value })
                }
              />
            </Form.Group>

            <h5 className="mt-3">📋 รายการ Component</h5>
            <Table bordered>
              <thead>
                <tr>
                  <th>สินค้า</th>
                  <th style={{ width: "20%" }}>จำนวน</th>
                  <th style={{ width: "10%" }}></th>
                </tr>
              </thead>
              <tbody>
                {selectedBOM.components.map((comp, index) => (
                  <tr key={index}>
                    <td>
                      <Select
                        options={stockParts}
                        placeholder="เลือกส่วนประกอบ"
                        value={stockParts.find((p) => p.value === comp.part) || null}
                        onChange={(selected) => {
                          const updated = [...selectedBOM.components];
                          updated[index].part = selected?.value ?? null;
                          setSelectedBOM({ ...selectedBOM, components: updated });
                        }}
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        min={1}
                        value={comp.quantity}
                        onChange={(e) => {
                          const updated = [...selectedBOM.components];
                          updated[index].quantity = Number(e.target.value);
                          setSelectedBOM({ ...selectedBOM, components: updated });
                        }}
                      />
                    </td>
                    <td className="text-center">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          const updated = selectedBOM.components.filter((_, i) => i !== index);
                          setSelectedBOM({ ...selectedBOM, components: updated });
                        }}
                        disabled={selectedBOM.components.length <= 1}
                      >
                        🗑️
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <Button
              variant="outline-success"
              onClick={() =>
                setSelectedBOM({
                  ...selectedBOM,
                  components: [...selectedBOM.components, { part: "", quantity: 1 }],
                })
              }
            >
              ➕ เพิ่ม Component
            </Button>

            <div className="d-flex justify-content-end mt-3">
              <Button variant="secondary" className="me-2" onClick={() => setShowEditModal(false)}>
                ปิด
              </Button>
              <Button variant="success" onClick={handleSaveEditBOM}>
                บันทึก
              </Button>
            </div>
          </>
        )}
      </CustomModal>


      <ProduceModal
        show={produceModal.show}
        onClose={closeProduceModal}
        bom={produceModal.bom}
        onAfterAction={async () => {
          const res = await axios.get("http://localhost:3000/boms");
          const transformed = res.data.map((bom) => ({
            id: bom.id, code: bom.bom_code, name: bom.bom_name,
            available: bom.bom_available ?? 0, components: []
          }));
          setBoms(transformed);
        }}
      />
  

    
      <AlertModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)} // ✅ ใช้ onClose ให้ตรง
        onConfirm={confirmDeleteBOM}
        title="ยืนยันการลบ BOM"
        body={`คุณแน่ใจหรือไม่ว่าต้องการลบ "${bomToDelete?.code}" (${bomToDelete?.name})?`}
        confirmText="ยืนยันลบ"
        cancelText="ยกเลิก"
      />    

      <AlertToast
        show={toast.show}
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast({ ...toast, show: false })}
      />       

      <div className="d-flex justify-content-center mt-3">
        <button
          className="btn btn-primary me-2"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          ⬅️ ก่อนหน้า
        </button>
        <span className="align-self-center">หน้า {currentPage}</span>
        <button
          className="btn btn-primary ms-2"
          disabled={indexOfLastItem >= filteredBOMs.length}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          ถัดไป ➡️
        </button>
      </div>
                                         




    </div>

    
  );
};

export default BOMManagement;
