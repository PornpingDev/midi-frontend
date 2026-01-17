import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AlertToast from "../components/common/AlertToast";

const fmtDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH");
};

const fmtMoney = (n) =>
  Number(n || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const PODetailView = () => {
  const { id } = useParams(); // ✅ ไม่ใส่ generic กันพังใน .jsx
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [po, setPo] = useState(null);

  const [toast, setToast] = useState({
    show: false,
    message: "",
    variant: "success",
  });

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await axios.get(
        `http://localhost:3000/purchase-orders/${id}`
      );
      setPo(data);
    } catch (e) {
      console.error("❌ load PO error:", e);
      setToast({
        show: true,
        message:
          "❌ โหลดรายละเอียด PO ไม่สำเร็จ: " +
          (e?.response?.data?.message || e?.message || "unknown"),
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ✅ คำนวณยอดรวม + VAT (วางตรงนี้คือถูกต้อง: ก่อน return)
  const subtotal = (po?.items || []).reduce((sum, it) => {
    const qty = Number(it.quantity_ordered || 0);
    const price = Number(it.unit_price || 0);
    return sum + qty * price;
  }, 0);

  const vatRate = Number(po?.vat_rate ?? 7) || 0;
  const vatAmount = (subtotal * vatRate) / 100;
  const grandTotal = subtotal + vatAmount;

  const handlePrintPO = async () => {
    if (!id) return;
    try {
      const { data: payloadObj } = await axios.get(
        `/purchase-orders/${id}/print-payload`,
        { withCredentials: true }
      );

      const key = `PRINT_PO_${id}_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(payloadObj));
      window.open(`/print?key=${encodeURIComponent(key)}`, "_blank");
    } catch (e) {
      console.error("❌ เปิดหน้าพิมพ์ PO ไม่สำเร็จ:", e);
      setToast({
        show: true,
        message: "❌ เปิดหน้าพิมพ์ PO ไม่สำเร็จ",
        variant: "danger",
      });
    }
  };


  return (
    <div className="container mt-4">
      <h2 className="text-primary">
        🧾 Purchase Order Detail{" "}
        <span className="text-muted">#{po?.po_no || "-"}</span>
        {po?.status ? (
          <span
            className={
              "ms-3 badge " +
              (po.status === "approved" ? "bg-success" : "bg-secondary")
            }
          >
            {(po.status || "").toUpperCase()}
          </span>
        ) : null}
      </h2>

      <div className="d-flex gap-2 mb-3">
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          ⬅️ กลับ
        </button>
        <button
          className="btn btn-outline-dark"
          onClick={handlePrintPO}
          disabled={!po}
        >
          🖨️ พิมพ์ PO
        </button>
      </div>

      {loading && <div className="text-muted">กำลังโหลด...</div>}

      {!loading && po && (
        <>
          <div className="card mb-3">
            <div className="card-body">
              <h5 className="card-title">หัวเอกสาร</h5>
              <div>
                เลขที่ PO: <b>{po.po_no}</b>
              </div>
              <div>
                ผู้ขาย: <b>{po.supplier_name || "-"}</b>
              </div>
              <div className="text-muted small">
                วันที่สั่งซื้อ: {fmtDate(po.order_date)} · คาดว่าจะเข้า:{" "}
                {fmtDate(po.expected_date)}
              </div>
              <div className="mt-2">หมายเหตุ: {po.note || "-"}</div>

              {/* ✅ สรุปยอดแบบมี VAT */}
              <div className="mt-3" style={{ maxWidth: 420 }}>
                <div className="d-flex justify-content-between">
                  <div className="text-muted">ก่อนภาษี:</div>
                  <div>
                    <b>{fmtMoney(subtotal)}</b>
                  </div>
                </div>

                <div className="d-flex justify-content-between mt-1">
                  <div className="text-muted">VAT {vatRate}%:</div>
                  <div>
                    <b>{fmtMoney(vatAmount)}</b>
                  </div>
                </div>

                <div className="d-flex justify-content-between mt-1">
                  <div className="text-muted fw-bold">รวมสุทธิ:</div>
                  <div className="fw-bold">{fmtMoney(grandTotal)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h5 className="card-title">รายการสินค้า</h5>

              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>รหัสสินค้า</th>
                    <th>ชื่อสินค้า</th>
                    <th className="text-end">จำนวนสั่งซื้อ</th>
                    <th className="text-end">รับแล้ว</th>
                    <th className="text-end">คงเหลือ</th>
                    <th className="text-end">ราคา/หน่วย</th>
                    <th className="text-end">จำนวนเงิน</th>
                  </tr>
                </thead>
                <tbody>
                  {(po.items || []).map((it, i) => {
                    const qty = Number(it.quantity_ordered || 0);
                    const price = Number(it.unit_price || 0);
                    const received = Number(it.quantity_received || 0);
                    const remaining = Number(it.remaining ?? qty - received);
                    return (
                      <tr key={it.id || i}>
                        <td>{i + 1}</td>
                        <td>{it.product_no || "-"}</td>
                        <td>{it.product_name || "-"}</td>
                        <td className="text-end">{qty}</td>
                        <td className="text-end">{received}</td>
                        <td className="text-end">{remaining}</td>
                        <td className="text-end">{fmtMoney(price)}</td>
                        <td className="text-end">{fmtMoney(qty * price)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={7} className="text-end">
                      ก่อนภาษี
                    </td>
                    <td className="text-end">{fmtMoney(subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={7} className="text-end">
                      VAT {vatRate}%
                    </td>
                    <td className="text-end">{fmtMoney(vatAmount)}</td>
                  </tr>
                  <tr>
                    <td colSpan={7} className="text-end fw-bold">
                      รวมสุทธิ
                    </td>
                    <td className="text-end fw-bold">{fmtMoney(grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      <AlertToast
        show={toast.show}
        onClose={() => setToast((p) => ({ ...p, show: false }))}
        message={toast.message}
        variant={toast.variant}
      />
    </div>
  );
};

export default PODetailView;
