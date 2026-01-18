import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Table, Alert, Spinner } from "react-bootstrap";
import axios from "axios";
import AlertToast from "../common/AlertToast";

export default function ProduceModal({ show, onClose, bom, onAfterAction }) {
  // ใช้จำนวนเดียวกับทุก action
  const [qty, setQty] = useState(1);

  const [maxBuildable, setMaxBuildable] = useState(0);
  const [rows, setRows] = useState([]); // [{ product_id, product_no, name, unit, quantity_required, required, reserved, available, shortage }]
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState(null); // "reserve" | "produce" | "cancel" | null

  const [toast, setToast] = useState({
    show: false,
    message: "",
    variant: "success",
  });
  const notify = (message, variant = "success") =>
    setToast({ show: true, message, variant });



  const canBuild = rows.length > 0 && rows.every(r => Number(r.shortage) === 0);

  useEffect(() => {
    if (!show || !bom) return;
    setQty(1);
    refreshAll(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, bom?.id]);

  const refreshAll = async (q) => {
    if (!bom) return;
    setLoading(true);
    try {
      const [b, p] = await Promise.all([
        axios.get(`/boms/${bom.id}/buildability`),
        axios.get(`/boms/${bom.id}/preview`, { params: { qty: q } }),
      ]);
      setMaxBuildable(Number(b.data?.max_buildable ?? 0));
      setRows(p.data?.components ?? []);
    } catch (e) {
      console.error("preview/buildability error:", e);
      notify("❌ โหลดข้อมูลสั่งผลิตไม่สำเร็จ", "danger");
    } finally {
      setLoading(false);
    }
  };

  const onChangeQty = (v) => {
    const q = Math.max(1, Math.floor(Number(v) || 1));
    setQty(q);
  };

  // ===== Actions (ใช้ qty เดียวกัน) =====
  const doReserve = async () => {
    if (!bom) return;
    setBusyAction("reserve");
    try {
      await axios.post(`/boms/${bom.id}/reserve`, { qty });
      notify("✅ จองวัตถุดิบสำเร็จ", "success");
      await refreshAll(qty);
      await onAfterAction?.();
    } catch (e) {
      console.error("reserve error:", e);
      notify(e?.response?.data?.message || "❌ จองวัตถุดิบไม่สำเร็จ", "danger");
    } finally {
      setBusyAction(null);
    }
  };

  const doProduce = async () => {
    if (!bom) return;
    setBusyAction("produce");
    try {
      await axios.post(`/boms/${bom.id}/produce`, { qty });
      notify("✅ ผลิตสำเร็จ", "success");
      await refreshAll(qty);
      await onAfterAction?.();
    } catch (e) {
      console.error("produce error:", e);
      notify(e?.response?.data?.message || "❌ ผลิตไม่สำเร็จ", "danger");
    } finally {
      setBusyAction(null);
    }
  };

  const doCancelReserve = async () => {
    if (!bom) return;
    setBusyAction("cancel");
    try {
      await axios.post(`/boms/${bom.id}/cancel-reserve`, { qty });
      notify("✅ ยกเลิกการจองสำเร็จ", "success");
      await refreshAll(qty);
      await onAfterAction?.();
    } catch (e) {
      console.error("cancel error:", e);
      notify(e?.response?.data?.message || "❌ ยกเลิกการจองไม่สำเร็จ", "danger");
    } finally {
      setBusyAction(null);
    }
  };

  const overBuildable = qty > maxBuildable;

  return (
    <>
      <Modal show={show} onHide={onClose} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>🏭 สั่งผลิต — {bom?.code} | {bom?.name}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {/* อินพุตเดียว: จำนวนที่จะผลิต (ใช้กับทุก action) */}
          <div className="d-flex gap-3 align-items-end mb-3">
            <Form.Group style={{ maxWidth: 240 }}>
              <Form.Label>จำนวนที่จะผลิต</Form.Label>
              <Form.Control
                type="number"
                min={1}
                value={qty}
                onChange={(e) => onChangeQty(e.target.value)}
                onBlur={() => refreshAll(qty)}
                disabled={loading}
              />
              {overBuildable && (
                <div className="text-danger small mt-1">
                  เกินจำนวนที่ผลิตได้สูงสุดจากสต๊อก ({maxBuildable})
                </div>
              )}
            </Form.Group>

            <Button
              variant="outline-primary"
              onClick={() => refreshAll(qty)}
              disabled={loading}
              className="ms-auto"
            >
              {loading ? <Spinner size="sm" animation="border" /> : "🔄 พรีวิว"}
            </Button>
          </div>

          <Alert variant={canBuild ? "info" : "danger"}>
            สต๊อกปัจจุบัน ผลิตได้สูงสุด : <b>{maxBuildable}</b> ชุด
            {!canBuild && <span className="ms-2">— ปัจจุบัน <b>ขาด</b>วัตถุดิบบางรายการ</span>}
          </Alert>

          <Table bordered size="sm">
            <thead>
              <tr>
                <th style={{ width: "18%" }}>รหัสสินค้า</th>
                <th>ชื่อ</th>
                <th style={{ width: "10%" }} className="text-end">จำนวน/ชุด</th>
                <th style={{ width: "10%" }} className="text-end">จำนวนรวม</th>
                <th style={{ width: "10%" }} className="text-end">จองทั้งหมด</th>
                <th style={{ width: "10%" }} className="text-end">คงเหลือ</th>
                <th style={{ width: "10%" }} className="text-end text-danger">ขาด</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.product_id}>
                  <td>{r.product_no}</td>
                  <td>{r.name}</td>
                  <td className="text-end">{r.quantity_required}</td>
                  <td className="text-end">{r.required}</td>
                  <td className="text-end">{r.reserved ?? 0}</td>
                  <td className="text-end">{r.available}</td>
                  <td className="text-end text-danger">{r.shortage}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted">ไม่มีรายการวัตถุดิบ</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>ปิด</Button>

          <Button
            variant="outline-danger"
            onClick={doCancelReserve}
            disabled={busyAction !== null || qty < 1}
          >
            {busyAction === "cancel" ? <Spinner size="sm" animation="border" /> : "❌ ยกเลิกการจอง"}
          </Button>

          <Button
            variant="outline-success"
            onClick={doReserve}
            disabled={busyAction !== null || qty < 1 || overBuildable}
            title={overBuildable ? "เกินกว่าที่จองได้จากสต๊อก" : ""}
          >
            {busyAction === "reserve" ? <Spinner size="sm" animation="border" /> : "📦 จองวัตถุดิบ"}
          </Button>

          <Button
            variant="success"
            onClick={doProduce}
            disabled={busyAction !== null || qty < 1}
          >
            {busyAction === "produce" ? <Spinner size="sm" animation="border" /> : "🏭 ผลิต"}
          </Button>
        </Modal.Footer>
      </Modal>
          
      {/* ✅ Toast แบบเดียวกับหน้า Sales/Delivery */}
      <AlertToast
        show={toast.show}
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />
  </>      

  );
}
