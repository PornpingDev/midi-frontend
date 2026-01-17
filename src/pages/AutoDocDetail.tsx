import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AlertToast from "../components/common/AlertToast";
import AlertModal from "../components/common/AlertModal";
import CustomModal from "../components/common/CustomModal";

type PairDetail = {
  ok: boolean;
  header: {
    pair_id: number;
    display_no: string;
    doc_status: "DRAFT" | "APPROVED" | "REPRINT" | "VOID";
    po_number?: string | null;
    sales_order_no?: string | null;
    customer: {
      id: number | null;
      name: string | null;
      address: string | null;
      tax_id: string | null;
      email: string | null;
      phone: string | null;
    };
    dn: { id: number | null; no: string | null; date: string | null; subtotal: number; vat_rate: number; vat_amount: number; grand_total: number; };
    inv: { id: number | null; no: string | null; date: string | null; status?: string; subtotal: number; vat_rate: number; vat_amount: number; grand_total: number; };
  };
  items: {
    dn: Array<{ id: number; product_id: number | null; product_no: string | null; name: string | null; description: string | null; unit: string | null; quantity: number; unit_price: number; line_amount: number; }>;
    inv: Array<{ id: number; product_id: number | null; product_no: string | null; name: string | null; description: string | null; unit: string | null; quantity: number; unit_price: number; line_amount: number; }>;
  };
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  const thYear = d.getFullYear() + 543;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${thYear}`;
};

const fmtMoney = (n?: number | null) =>
  typeof n === "number"
    ? n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "-";

const AutoDocDetail: React.FC = () => {
  const { pairId } = useParams<{ pairId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<PairDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState({ show: false, message: "", variant: "success" as any });

  const [confirm, setConfirm] = useState<{ show: boolean; mode: "REPRINT" | "VOID" | null }>({
    show: false,
    mode: null,
  });

  const [printA, setPrintA] = useState({
    show: false,
    labels: { DN: true, INV: true, BILL: true },
  });
  const [printB, setPrintB] = useState({
    show: false,
    labels: { TAX: true, RCPT: true },
  });

  const load = async () => {
    if (!pairId) return;
    setLoading(true);
    try {
      const { data } = await axios.get<PairDetail>(`/api/documents/pairs/${pairId}`, {
        withCredentials: true,
      });
      setData(data);
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: "❌ โหลดเอกสารไม่สำเร็จ", variant: "danger" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairId]);

  const doReprint = async () => {
    if (!pairId) return;
    try {
      await axios.post(`/api/documents/pairs/${pairId}/reprint`, {}, { withCredentials: true });
      setToast({ show: true, message: "♻️ ทำเครื่องหมาย REPRINT แล้ว", variant: "success" });
      load();
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: "❌ ทำรายการไม่สำเร็จ", variant: "danger" });
    } finally {
      setConfirm({ show: false, mode: null });
    }
  };

  const doVoid = async () => {
    if (!pairId) return;
    try {
      await axios.post(`/api/documents/pairs/${pairId}/void`, {}, { withCredentials: true });
      setToast({ show: true, message: "🚫 VOID เรียบร้อย", variant: "success" });
      load();
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: "❌ ทำรายการไม่สำเร็จ", variant: "danger" });
    } finally {
      setConfirm({ show: false, mode: null });
    }
  };

  const openPrintAChooser = () => setPrintA({ show: true, labels: { DN: true, INV: true, BILL: true } });
  const openPrintBChooser = () => setPrintB({ show: true, labels: { TAX: true, RCPT: true } });

  const doPrintA = async () => {
    if (!pairId) return;
    try {
      const selected = (["DN","INV","BILL"] as const).filter(k => printA.labels[k]);
      const { data: payload } = await axios.get(
        `/api/documents/pairs/${pairId}/print`,
        { params: { form: "A", labels: selected.join(",") }, withCredentials: true }
      );
      const key = `PRINT_PAYLOAD_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(payload));
      window.open(`/print?key=${encodeURIComponent(key)}`, "_blank");
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: "❌ เปิดหน้าพิมพ์ไม่สำเร็จ", variant: "danger" as any });
    } finally {
      setPrintA({ show: false, labels: { DN: true, INV: true, BILL: true } });
    }
  };

  const doPrintB = async () => {
    if (!pairId) return;
    try {
      const selected = (["TAX","RCPT"] as const).filter(k => printB.labels[k]);
      const { data: payload } = await axios.get(
        `/api/documents/pairs/${pairId}/print`,
        { params: { form: "B", labels: selected.join(",") }, withCredentials: true }
      );
      const key = `PRINT_PAYLOAD_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(payload));
      window.open(`/print?key=${encodeURIComponent(key)}`, "_blank");
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: "❌ เปิดหน้าพิมพ์ไม่สำเร็จ", variant: "danger" as any });
    } finally {
      setPrintB({ show: false, labels: { TAX: true, RCPT: true } });
    }
  };

  const h = data?.header;

  return (
    <div className="container mt-4">
      
      
      <h2 className="text-primary">
        📄 Auto Document <span className="text-muted">#{h?.display_no}</span>
        {h && (
          <span
            className={
              "ms-3 badge " +
              (h.doc_status === "APPROVED"
                ? "bg-success"
                : h.doc_status === "REPRINT"
                ? "bg-info"
                : h.doc_status === "VOID"
                ? "bg-danger"
                : "bg-secondary")
            }
          >
            {h.doc_status}
          </span>
        )}
      </h2>

      <div className="d-flex gap-2 mb-3">
        <button className="btn btn-secondary" onClick={()=>navigate(-1)}>⬅️ กลับ</button>
        <button className="btn btn-info btn-sm" onClick={openPrintAChooser} disabled={!h}>🖨️ พิมพ์ A</button>
        <button className="btn btn-info btn-sm" onClick={openPrintBChooser} disabled={!h}>🖨️ พิมพ์ B</button>
        <button className="btn btn-secondary btn-sm" onClick={() => setConfirm({ show: true, mode: "REPRINT" })} disabled={h?.doc_status === "VOID"}>
          ♻️ REPRINT
        </button>
        <button className="btn btn-danger btn-sm" onClick={() => setConfirm({ show: true, mode: "VOID" })} disabled={h?.doc_status === "VOID"}>
          🚫 VOID
        </button>
      </div>

      {loading && <div className="text-muted">กำลังโหลด...</div>}

      {!loading && data && (
        <>
          <div className="card mb-3">
            <div className="card-body">
              <h5 className="card-title">หัวเอกสาร</h5>
              <div>ลูกค้า: <b>{h?.customer.name || "-"}</b></div>
              <div className="text-muted small">
                ที่อยู่: {h?.customer.address || "-"} · เลขภาษี: {h?.customer.tax_id || "-"} · โทร: {h?.customer.phone || "-"}
              </div>
              <div className="mt-2">
                เลขที่ PO : <b>{h?.po_number || "-"}</b>
                {h?.sales_order_no ? <span className="ms-3">SO: <b>{h.sales_order_no}</b></span> : null}
              </div>


              <div className="row mt-3">
                <div className="col-md-4">
                  <div className="fw-semibold">DN</div>
                  <div>{h?.dn.no || "-"}</div>
                  <div className="text-muted small">{fmtDate(h?.dn.date)}</div>
                </div>
                <div className="col-md-4">
                  <div className="fw-semibold">INV</div>
                  <div>{h?.inv.no || "-"}</div>
                  <div className="text-muted small">{fmtDate(h?.inv.date)}</div>
                </div>
                <div className="col-md-4">
                  <div className="fw-semibold">รวมสุทธิ (จาก INV)</div>
                  <div className="fs-5">{fmtMoney(h?.inv.grand_total ?? h?.dn.grand_total)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* ตารางรายการจาก INV */}
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">รายการ (จาก INV)</h5>
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>รหัส/สินค้า</th>
                    <th>รายละเอียด</th>
                    <th>หน่วย</th>
                    <th className="text-end">จำนวน</th>
                    <th className="text-end">ราคา/หน่วย</th>
                    <th className="text-end">จำนวนเงิน</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.inv.map((it, i) => (
                    <tr key={it.id}>
                      <td>{i + 1}</td>
                      <td>{it.product_no || "-"}</td>
                      <td style={{ whiteSpace: "pre-line" }}>{it.description || it.name || "-"}</td>
                      <td>{it.unit || "-"}</td>
                      <td className="text-end">{it.quantity}</td>
                      <td className="text-end">{fmtMoney(it.unit_price)}</td>
                      <td className="text-end">{fmtMoney(it.line_amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5}></td>
                    <td className="text-end">ก่อนภาษี</td>
                    <td className="text-end">{fmtMoney(h?.inv.subtotal ?? 0)}</td>
                  </tr>
                  <tr>
                    <td colSpan={5}></td>
                    <td className="text-end">VAT {h?.inv.vat_rate ?? 0}%</td>
                    <td className="text-end">{fmtMoney(h?.inv.vat_amount ?? 0)}</td>
                  </tr>
                  <tr>
                    <td colSpan={5}></td>
                    <td className="text-end fw-bold">รวมสุทธิ</td>
                    <td className="text-end fw-bold">{fmtMoney(h?.inv.grand_total ?? 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Print A chooser */}
      <CustomModal
        title="เลือกหัวเอกสาร A-Form"
        show={printA.show}
        onClose={() => setPrintA({ ...printA, show: false })}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setPrintA({ ...printA, show: false })}>ปิด</button>
            <button className="btn btn-primary" onClick={doPrintA}>พิมพ์ / เปิดดู</button>
          </>
        }
      >
        <div className="form-check">
          <input className="form-check-input" type="checkbox" id="aDN" checked={printA.labels.DN}
            onChange={(e) => setPrintA(p => ({ ...p, labels: { ...p.labels, DN: e.target.checked } }))} />
          <label className="form-check-label" htmlFor="aDN">ใบส่งของ</label>
        </div>
        <div className="form-check">
          <input className="form-check-input" type="checkbox" id="aINV" checked={printA.labels.INV}
            onChange={(e) => setPrintA(p => ({ ...p, labels: { ...p.labels, INV: e.target.checked } }))} />
          <label className="form-check-label" htmlFor="aINV">ใบแจ้งหนี้</label>
        </div>
        <div className="form-check">
          <input className="form-check-input" type="checkbox" id="aBILL" checked={printA.labels.BILL}
            onChange={(e) => setPrintA(p => ({ ...p, labels: { ...p.labels, BILL: e.target.checked } }))} />
          <label className="form-check-label" htmlFor="aBILL">ใบวางบิล</label>
        </div>
      </CustomModal>

      {/* Print B chooser */}
      <CustomModal
        title="เลือกหัวเอกสาร B-Form"
        show={printB.show}
        onClose={() => setPrintB({ ...printB, show: false })}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setPrintB({ ...printB, show: false })}>ปิด</button>
            <button className="btn btn-primary" onClick={doPrintB}>พิมพ์ / เปิดดู</button>
          </>
        }
      >
        <div className="form-check">
          <input className="form-check-input" type="checkbox" id="bTAX" checked={printB.labels.TAX}
            onChange={(e) => setPrintB(p => ({ ...p, labels: { ...p.labels, TAX: e.target.checked } }))} />
          <label className="form-check-label" htmlFor="bTAX">ใบกำกับภาษี</label>
        </div>
        <div className="form-check">
          <input className="form-check-input" type="checkbox" id="bRCPT" checked={printB.labels.RCPT}
            onChange={(e) => setPrintB(p => ({ ...p, labels: { ...p.labels, RCPT: e.target.checked } }))} />
          <label className="form-check-label" htmlFor="bRCPT">ใบเสร็จรับเงิน</label>
        </div>
      </CustomModal>

      {/* Confirm */}
      <AlertModal
        show={confirm.show && confirm.mode === "REPRINT"}
        onClose={() => setConfirm({ show: false, mode: null })}
        onConfirm={doReprint}
        title="♻️ ยืนยัน REPRINT"
        body="ต้องการทำเครื่องหมายเอกสารนี้เป็น REPRINT ใช่หรือไม่?"
        variant="secondary"
      />
      <AlertModal
        show={confirm.show && confirm.mode === "VOID"}
        onClose={() => setConfirm({ show: false, mode: null })}
        onConfirm={doVoid}
        title="🚫 ยืนยัน VOID"
        body="ต้องการ VOID เอกสารนี้ใช่หรือไม่?"
        variant="danger"
      />

      <AlertToast
        show={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
        message={toast.message}
        variant={toast.variant}
      />
    </div>
  );
};

export default AutoDocDetail;
