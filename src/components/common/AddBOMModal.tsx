import React, { useState, useEffect } from "react";
import { Button, Form } from "react-bootstrap";
import axios from "axios";
import Select from "react-select";
import CustomModal from "./CustomModal";
import AlertToast from "./AlertToast";

const AddBOMModal = ({ show, onClose, onSuccess }) => {
  const [bomName, setBOMName] = useState("");
  const [components, setComponents] = useState([{ product_id: "", quantity: 1 }]);
  const [productOptions, setProductOptions] = useState([]);
  const [toast, setToast] = useState({ show: false, message: "", variant: "success" });

  useEffect(() => {
    axios.get("/products")
      .then((res) => {
        if (!Array.isArray(res.data)) {
          throw new Error("ข้อมูลที่ได้ไม่ใช่ array");
        }
        
        const options = res.data.map((p) => ({
          value: p.id,
          label: `${p.product_no} - ${p.name}`,
        }));
  
        setProductOptions(options);
      })
      .catch((err) => {
        console.error("❌ โหลด products ล้มเหลว:", err);
      });
  }, []);

  const handleAddComponent = () => {
    setComponents([...components, { product_id: "", quantity: 1 }]);
  };

  const handleRemoveComponent = (index) => {
    const updated = [...components];
    updated.splice(index, 1);
    setComponents(updated);
  };

  const handleSave = async () => {
    if (!bomName || components.length === 0 || components.some(c => !c.product_id || !c.quantity)) {
      setToast({ show: true, message: "กรุณากรอกข้อมูลให้ครบ", variant: "warning" });
      return;
    }

    try {
      // 1. POST /boms
      const res = await axios.post("/boms", { bom_name: bomName });
      const bom_id = res.data.id;

      // 2. POST components
      for (const c of components) {
        await axios.post("/bom-components", {
          bom_id,
          product_id: c.product_id,
          quantity_required: c.quantity,
        });
      }

      setToast({ show: true, message: "✅ เพิ่ม BOM สำเร็จ", variant: "success" });
      onSuccess();
      onClose();

      // reset
      setBOMName("");
      setComponents([{ product_id: "", quantity: 1 }]);
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: "❌ เพิ่ม BOM ไม่สำเร็จ", variant: "danger" });
    }
  };

  return (
    <>
      <CustomModal
        show={show}
        onClose={onClose}
        title="➕ เพิ่ม BOM ใหม่"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>ปิด</Button>
            <Button variant="success" onClick={handleSave}>บันทึก</Button>
          </>
        }
      >
        <Form.Group className="mb-3">
          <Form.Label>ชื่อ BOM</Form.Label>
          <Form.Control value={bomName} onChange={(e) => setBOMName(e.target.value)} />
        </Form.Group>

        <h5>📋 รายการ Component</h5>
        {components.map((c, i) => (
          <div key={i} className="d-flex gap-2 mb-2">
            <Select
              options={productOptions}
              value={productOptions.find(o => o.value === c.product_id)}
              onChange={(selected) => {
                const updated = [...components];
                updated[i].product_id = selected.value;
                setComponents(updated);
              }}
              className="flex-grow-1"
            />
            <Form.Control
              type="number"
              value={c.quantity}
              style={{ width: "80px" }}
              onChange={(e) => {
                const updated = [...components];
                updated[i].quantity = Number(e.target.value);
                setComponents(updated);
              }}
            />
            <Button variant="danger" onClick={() => handleRemoveComponent(i)}>❌</Button>
          </div>
        ))}

        <Button className="mt-2" onClick={handleAddComponent}>➕ เพิ่ม Component</Button>
      </CustomModal>

      <AlertToast
        show={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
        message={toast.message}
        variant={toast.variant}
      />
    </>
  );
};

export default AddBOMModal;
