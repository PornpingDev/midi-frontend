import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button, Form, Spinner } from "react-bootstrap";
import AlertToast from "./AlertToast";
import AlertModal from "./AlertModal";

type Supplier = {
  id: number;
  code: string;
  name: string;
};

type ProductSupplier = {
  id: number;
  supplier_id: string;
  supplier_name: string;
  purchase_price: number;
  lead_time: number;
  minimum_order_qty: number;
  is_default: boolean;
  remarks: string;

  supplier_product_name?: string | null;
  supplier_product_code?: string | null;
};

type Props = {
  productId: string;
  showToast?: (message: string, variant?: string) => void;
};

const ProductSupplierSection: React.FC<Props> = ({ productId, showToast }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [productSuppliers, setProductSuppliers] = useState<ProductSupplier[]>([]);

  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const [minimumOrderQty, setMinimumOrderQty] = useState("1");
  const [remarks, setRemarks] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const [supplierProductName, setSupplierProductName] = useState("");
  const [supplierProductCode, setSupplierProductCode] = useState("");

  // ✅ โหมดแก้ไข
  const [editingId, setEditingId] = useState<number | null>(null);

  const [toast, setToast] = useState({ show: false, message: "", variant: "success" });
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; id: number | null }>({
    show: false,
    id: null,
  });

  const [loading, setLoading] = useState(false);

  const pushToast = (message: string, variant: string = "success") => {
    if (typeof showToast === "function") return showToast(message, variant);
    setToast({ show: true, message, variant });
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (productId) fetchProductSuppliers();
    // เปลี่ยนสินค้าแล้วให้กลับโหมดเพิ่ม
    resetForm();
  }, [productId]);

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get("/suppliers");
      setSuppliers(res.data);
    } catch (error) {
      console.error("Error fetching suppliers", error);
    }
  };

  const fetchProductSuppliers = async () => {
    try {
      const res = await axios.get(`/api/product-suppliers?product_id=${productId}`);
      setProductSuppliers(res.data);
    } catch (error) {
      console.error("Error fetching product suppliers", error);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setSelectedSupplierId("");
    setPurchasePrice("");
    setLeadTime("");
    setMinimumOrderQty("1");
    setRemarks("");
    setIsDefault(false);
    setSupplierProductName("");
    setSupplierProductCode("");
  };

  const handleStartEdit = (ps: ProductSupplier) => {
    setEditingId(ps.id);

    // ❗ supplier_id แก้ไม่ได้ (เพื่อไม่ปวดหัวเรื่อง unique)
    setSelectedSupplierId(ps.supplier_id);

    setPurchasePrice(ps.purchase_price != null ? String(ps.purchase_price) : "");
    setLeadTime(ps.lead_time != null ? String(ps.lead_time) : "");
    setMinimumOrderQty(ps.minimum_order_qty != null ? String(ps.minimum_order_qty) : "1");
    setRemarks(ps.remarks || "");
    setIsDefault(!!ps.is_default);

    setSupplierProductName(ps.supplier_product_name || "");
    setSupplierProductCode(ps.supplier_product_code || "");
  };

  const handleAddSupplier = async () => {
    if (!selectedSupplierId) return;

    try {
      setLoading(true);

      await axios.post("/api/product-suppliers", {
        product_id: productId,
        supplier_id: selectedSupplierId,
        purchase_price: purchasePrice ? Number(purchasePrice) : null,
        lead_time: leadTime ? Number(leadTime) : null,
        minimum_order_qty: minimumOrderQty ? Number(minimumOrderQty) : 1,
        remarks,
        is_default: isDefault,

        supplier_product_name: supplierProductName ? supplierProductName : null,
        supplier_product_code: supplierProductCode ? supplierProductCode : null,
      });

      pushToast("✅ เพิ่มผู้ผลิตเรียบร้อยแล้ว", "success");
      resetForm();
      fetchProductSuppliers();
    } catch (error: any) {
      console.error("Error adding supplier", error);
      const msg = error?.response?.data?.message || error?.message || "";
      if (String(msg).toLowerCase().includes("duplicate")) {
        pushToast("❌ รหัสสินค้าผู้ขายซ้ำในผู้ผลิตรายนี้", "danger");
      } else {
        pushToast("❌ เกิดข้อผิดพลาด", "danger");
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ บันทึกแก้ไข (PUT)
  const handleSaveEdit = async () => {
    if (!editingId) return;

    try {
      setLoading(true);

      await axios.put(`/api/product-suppliers/${editingId}`, {
        purchase_price: purchasePrice ? Number(purchasePrice) : null,
        lead_time: leadTime ? Number(leadTime) : null,
        minimum_order_qty: minimumOrderQty ? Number(minimumOrderQty) : 1,
        remarks,
        is_default: isDefault,

        supplier_product_name: supplierProductName ? supplierProductName : null,
        supplier_product_code: supplierProductCode ? supplierProductCode : null,
      });

      pushToast("✅ บันทึกการแก้ไขเรียบร้อยแล้ว", "success");
      resetForm();
      fetchProductSuppliers();
    } catch (error: any) {
      console.error("Error updating supplier", error);
      const msg = error?.response?.data?.message || "❌ แก้ไขไม่สำเร็จ";
      pushToast(msg, "danger");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete.id) return;

    try {
      await axios.delete(`/api/product-suppliers/${confirmDelete.id}`);
      pushToast("✅ ลบผู้ผลิตเรียบร้อยแล้ว", "success");

      // ถ้าลบตัวที่กำลังแก้ไขอยู่ ให้ reset
      if (editingId === confirmDelete.id) resetForm();

      fetchProductSuppliers();
    } catch (error) {
      pushToast("❌ ลบไม่สำเร็จ", "danger");
    } finally {
      setConfirmDelete({ show: false, id: null });
    }
  };

  return (
    <>
      <div className="mb-4">
        {productSuppliers.length > 0 ? (
          <table className="table table-sm table-bordered mb-3">
            <thead>
              <tr>
                <th>ชื่อผู้ผลิต</th>
                <th>ราคาซื้อ</th>
                <th>Lead Time</th>
                <th>ขั้นต่ำ</th>
                <th>ชื่อในใบสั่งซื้อ</th>
                <th>รหัสผู้ขาย</th>
                <th>หลัก</th>
                <th>หมายเหตุ</th>
                <th style={{ width: 110 }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {productSuppliers.map((ps) => (
                <tr key={ps.id}>
                  <td>{ps.supplier_name}</td>
                  <td>{ps.purchase_price ?? "-"}</td>
                  <td>{ps.lead_time ?? "-"} วัน</td>
                  <td>{ps.minimum_order_qty}</td>
                  <td>{ps.supplier_product_name || "-"}</td>
                  <td>{ps.supplier_product_code || "-"}</td>
                  <td className="text-center">{ps.is_default ? "✅" : ""}</td>
                  <td>{ps.remarks || "-"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <Button
                      className="me-1"
                      variant="outline-warning"
                      size="sm"
                      onClick={() => handleStartEdit(ps)}
                    >
                      ✏️
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => setConfirmDelete({ show: true, id: ps.id })}
                    >
                      🗑️
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted">ยังไม่มีข้อมูลผู้ผลิต</p>
        )}

        {/* 🔽 ฟอร์มเพิ่ม/แก้ไข */}
        <Form.Group className="mb-2">
          <Form.Label>เลือกผู้ผลิต</Form.Label>
          <Form.Select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            disabled={editingId !== null} // ✅ ตอนแก้ไข ล็อกผู้ผลิต ไม่ให้เปลี่ยน
          >
            <option value="">-- เลือกผู้ผลิต --</option>
            {Array.isArray(suppliers) &&
              suppliers.map((s) => (
                <option key={s.id} value={s.code}>
                  {s.name}
                </option>
              ))}
          </Form.Select>

          {editingId !== null && (
            <Form.Text className="text-muted">
              กำลังแก้ไขรายการเดิม (เปลี่ยนผู้ผลิตไม่ได้)
            </Form.Text>
          )}
        </Form.Group>

        <Form.Group className="mb-2">
          <Form.Label>ราคาซื้อ</Form.Label>
          <Form.Control type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
        </Form.Group>

        <Form.Group className="mb-2">
          <Form.Label>Lead Time (วัน)</Form.Label>
          <Form.Control type="number" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} />
        </Form.Group>

        <Form.Group className="mb-2">
          <Form.Label>ขั้นต่ำ</Form.Label>
          <Form.Control type="number" value={minimumOrderQty} onChange={(e) => setMinimumOrderQty(e.target.value)} />
        </Form.Group>

        <Form.Group className="mb-2">
          <Form.Label>ชื่อสินค้า/คำอธิบายในใบสั่งซื้อ (ผู้ขาย)</Form.Label>
          <Form.Control
            type="text"
            value={supplierProductName}
            onChange={(e) => setSupplierProductName(e.target.value)}
            placeholder="เช่น Bearing 6205 Japan"
          />
        </Form.Group>

        <Form.Group className="mb-2">
          <Form.Label>รหัสสินค้าของผู้ขาย</Form.Label>
          <Form.Control
            type="text"
            value={supplierProductCode}
            onChange={(e) => setSupplierProductCode(e.target.value)}
            placeholder="เช่น BRG-6205"
          />
        </Form.Group>

        <Form.Group className="mb-2">
          <Form.Check
            type="checkbox"
            label="ตั้งเป็นผู้ผลิตหลัก"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>หมายเหตุ</Form.Label>
          <Form.Control type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </Form.Group>

        {/* ปุ่มโหมด */}
        {editingId === null ? (
          <Button onClick={handleAddSupplier} disabled={!selectedSupplierId || loading}>
            {loading ? <Spinner animation="border" size="sm" /> : "➕ เพิ่ม"}
          </Button>
        ) : (
          <div className="d-flex gap-2">
            <Button variant="success" onClick={handleSaveEdit} disabled={loading}>
              {loading ? <Spinner animation="border" size="sm" /> : "💾 บันทึก"}
            </Button>
            <Button variant="secondary" onClick={resetForm} disabled={loading}>
              ยกเลิก
            </Button>
          </div>
        )}
      </div>

      <AlertToast
        show={toast.show}
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast({ ...toast, show: false })}
      />

      <AlertModal
        show={confirmDelete.show}
        title="ยืนยันการลบ"
        message="คุณแน่ใจว่าต้องการลบผู้ผลิตนี้ใช่หรือไม่?"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete({ show: false, id: null })}
      />
    </>
  );
};

export default ProductSupplierSection;
