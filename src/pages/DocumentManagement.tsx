import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AlertToast from "../components/common/AlertToast";
import AlertModal from "../components/common/AlertModal";
import CustomModal from "../components/common/CustomModal";

/** ---------- ชนิดข้อมูลเดิมของ AUTO ---------- */
type PairRowAuto = {
  pair_id: number;
  display_no: string;
  doc_status: "APPROVED" | "REPRINT" | "VOID" | "DRAFT" | "COMPLETED";
  customer_name: string | null;
  dn?: { id: number; no: string; date: string | null } | null;
  inv?: { id: number; no: string; date: string | null; status?: string } | null;
  grand_total?: number | null;
  po_number?: string | null;
};

type PairsResp = {
  ok: boolean;
  page: number;
  limit: number;
  total: number;
  items: PairRowAuto[];
};

/** ---------- ชนิดข้อมูลของ MANUAL/LIST ---------- */
type DocKind = "A" | "B" | "QUOTATION" | "PO";
type ManualItem = {
  id: number;
  doc_kind: DocKind;
  status: "DRAFT" | "APPROVED" | "VOID";
  display_no: string | null;    // YY/### (A/B) หรือ MQ/MPO สำหรับ QUOTATION/PO
  quotation_no: string | null;
  po_no: string | null;
  mdn_no: string | null;
  inv_no: string | null;
  doc_date: string;             // ISO
  grand_total: string;          // จาก DB เป็น string
  party_name: string | null;
  po_number?: string | null;
};
type ManualResp = {
  ok: boolean;
  page: number;
  limit: number;
  total: number;
  items: ManualItem[];
};



/** ---------- ชนิดข้อมูลของ PO (จาก GET /purchase-orders) ---------- */
type PurchaseOrderRow = {
  id: number;
  po_no: string;
  supplier_name: string;
  status: "draft" | "approved" | string;
  total_amount: number | string;
  order_date?: string | null;
};






/** ---------- แถวแบบรวม (AUTO + MANUAL) ---------- */
type UnifiedRow = {
  source: "AUTO" | "MANUAL" | "PO";
  id: number;                   // AUTO = pair_id, MANUAL = manual id
  display_no: string | null;
  doc_status: "APPROVED" | "REPRINT" | "VOID" | "DRAFT" | "COMPLETED";
  party_name: string | null;
  dn?: { no: string | null; date: string | null } | null;
  inv?: { no: string | null; date: string | null; status?: string } | null;
  grand_total?: number | null;
  doc_date?: string | null;
  po_number?: string | null;
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


const mapPOStatus = (s?: string | null): UnifiedRow["doc_status"] => {
  const v = String(s || "").toLowerCase();
  if (v === "approved") return "APPROVED";
  if (v === "completed") return "COMPLETED"; 
  if (v === "void") return "VOID";
  return "DRAFT"; // draft หรืออื่น ๆ ให้เป็น DRAFT
};




const DocumentManagement: React.FC = () => {
  const navigate = useNavigate();

  // ตาราง + ค้นหา
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<UnifiedRow[]>([]);
  const [total, setTotal] = useState(0);
  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  // toast + confirm
  const [toast, setToast] = useState<{ show: boolean; message: string; variant: any }>({
    show: false,
    message: "",
    variant: "success",
  });

  /** ---------- ตัวเลือกพิมพ์ A ---------- */
  const [printA, setPrintA] = useState<{
    show: boolean;
    pairId: number | null;
    labels: { DN: boolean; INV: boolean; BILL: boolean };
  }>({
    show: false,
    pairId: null,
    labels: { DN: true, INV: true, BILL: true },
  });

  /** ---------- ตัวเลือกพิมพ์ B ---------- */
  const [printB, setPrintB] = useState<{
    show: boolean;
    pairId: number | null;
    labels: { TAX: boolean; RCPT: boolean };
  }>({
    show: false,
    pairId: null,
    labels: { TAX: true, RCPT: true },
  });

  const openPrintBChooser = (pairId: number) => {
    setPrintB({ show: true, pairId, labels: { TAX: true, RCPT: true } });
  };

  const doPrintB = async () => {
    if (!printB.pairId) return;
    try {
      const selected = (["TAX","RCPT"] as const).filter(k => printB.labels[k]);
      const { data: payloadObj } = await axios.get(
        `/api/documents/pairs/${printB.pairId}/print`,
        { params: { form: "B", labels: selected.join(",") }, withCredentials: true }
      );
      const key = `PRINT_PAYLOAD_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(payloadObj));
      window.open(`/print?key=${encodeURIComponent(key)}`, "_blank");
    } catch (e) {
      console.error(e);
      showToast("❌ เปิดหน้าพิมพ์ไม่สำเร็จ", "danger");
    } finally {
      setPrintB({ show: false, pairId: null, labels: { TAX: true, RCPT: true } });
    }
  };

  const openPrintAChooser = (pairId: number) => {
    setPrintA({ show: true, pairId, labels: { DN: true, INV: true, BILL: true } });
  };

  const doPrintA = async () => {
    if (!printA.pairId) return;

    try {
      const selected = (["DN", "INV", "BILL"] as const).filter(k => printA.labels[k]);

      // ✅ ดึง payload จาก backend (route ที่คุณมีแล้ว)
      const { data: payloadObj } = await axios.get(
        `/api/documents/pairs/${printA.pairId}/print`,
        { params: { form: "A", labels: selected.join(",") }, withCredentials: true }
      );

      // ✅ เก็บไว้ชั่วคราวด้วย key แล้วเปิด /print?key=...
      const key = `PRINT_PAYLOAD_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(payloadObj));
      window.open(`/print?key=${encodeURIComponent(key)}`, "_blank");
    } catch (e) {
      console.error(e);
      showToast("❌ เปิดหน้าพิมพ์ไม่สำเร็จ", "danger");
    } finally {
      setPrintA({ show: false, pairId: null, labels: { DN: true, INV: true, BILL: true } });
    }
  };


  // ✅ พิมพ์ PO แบบเดียวกับหน้า POManagement (print-payload -> /print?key=...)
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






  /** ---------- Confirm REPRINT/VOID (AUTO เท่านั้น) ---------- */
  const [confirm, setConfirm] = useState<{
    show: boolean;
    mode: "VOID" | "REPRINT" | null;
    pairId: number | null;
  }>({ show: false, mode: null, pairId: null });

  const showToast = (message: string, variant: any = "success") =>
    setToast({ show: true, message, variant });

  /** ---------- แปลงข้อมูล AUTO → UnifiedRow ---------- */
  const normalizeAuto = (items: PairRowAuto[]): UnifiedRow[] =>
    items.map((r) => ({
      source: "AUTO",
      id: r.pair_id,
      display_no: r.display_no || null,
      doc_status: r.doc_status,
      party_name: r.customer_name || null,
      dn: r.dn ? { no: r.dn.no, date: r.dn.date } : null,
      inv: r.inv ? { no: r.inv.no, date: r.inv.date, status: r.inv.status } : null,
      grand_total: r.grand_total ?? null,
      doc_date: r.inv?.date || r.dn?.date || null,
      po_number: r.po_number ?? null,
    }));

  /** ---------- แปลงข้อมูล MANUAL → UnifiedRow ---------- */
  const normalizeManual = (items: ManualItem[]): UnifiedRow[] =>
    items.map((m) => ({
      source: "MANUAL",
      id: m.id,
      display_no: m.display_no || m.quotation_no || m.po_no || null,
      doc_status: m.status as UnifiedRow["doc_status"],
      party_name: m.party_name,
      // ตารางนี้เป็นภาพรวม: DN/INV ของ manual ยังไม่ได้แยกแสดงจริง → ขีดไว้ก่อน
      dn: null,
      inv: m.inv_no ? { no: m.inv_no, date: null } : null,
      grand_total: Number(m.grand_total ?? 0),
      doc_date: m.doc_date || null,
      po_number: m.po_number ?? null,
    }));


  /** ---------- แปลงข้อมูล PO → UnifiedRow ---------- */
  const normalizePO = (items: PurchaseOrderRow[]): UnifiedRow[] =>
    (items || []).map((po) => ({
      source: "PO" as any, // เดี๋ยวแก้ type ด้านล่าง
      id: po.id,
      display_no: po.po_no || null,
      doc_status: mapPOStatus(po.status),
      party_name: po.supplier_name || null,
      dn: null,
      inv: null,
      grand_total: Number(po.total_amount ?? 0),
      doc_date: po.order_date || null,
      po_number: null, // คอลัมน์ PO ของตารางเดิม เราไม่ใช้กับแถว PO
    }));
  




  /** ---------- โหลด AUTO + MANUAL แล้วรวม ---------- */
  const fetchAll = async (p: number = page, qArg: string = q) => {
    setLoading(true);
    try {
      const qParam = qArg.trim() || undefined;

      const [auto, manual, pos] = await Promise.all([
        axios.get<PairsResp>("/api/documents/pairs", {
          params: { page: 1, limit: 1000, q: qParam },
          withCredentials: true,
        }),
        axios.get<ManualResp>("/api/manual/list", {
          params: { page: 1, limit: 1000, q: qParam },
          withCredentials: true,
        }),
        // ✅ PO list
        axios.get<PurchaseOrderRow[]>("/purchase-orders", {
          withCredentials: true,
        }),
      ]);

      const autos = normalizeAuto(auto.data.items || []);
      const mans  = normalizeManual(manual.data.items || []);
      const poRows = normalizePO(pos.data || []);

      const merged = [...autos, ...mans, ...poRows];


      // คัดกรองเพิ่มฝั่ง client (กันพลาด)
      const ql = (qParam || "").toLowerCase();
      const filtered = ql
        ? merged.filter((r) => {
            const hay = `${r.display_no ?? ""} ${r.party_name ?? ""} ${r.dn?.no ?? ""} ${
              r.inv?.no ?? ""} ${r.po_number ?? "" 
            }`.toLowerCase();
            return hay.includes(ql);
          })
        : merged;

      // เรียง: doc_date ใหม่ก่อน → รองลงมาด้วย display_no
      filtered.sort((a, b) => {
        const da = a.doc_date ? new Date(a.doc_date).getTime() : 0;
        const db = b.doc_date ? new Date(b.doc_date).getTime() : 0;
        if (db !== da) return db - da;
        return String(b.display_no ?? "").localeCompare(String(a.display_no ?? ""));
      });

      // แบ่งหน้า
      setTotal(filtered.length);
      const start = (p - 1) * limit;
      setRows(filtered.slice(start, start + limit));
    } catch (e) {
      console.error(e);
      setRows([]);
      setTotal(0);
      showToast("❌ โหลดรายการเอกสารไม่สำเร็จ", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll(page, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchAll(1, q);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  
  /** ---------- ปุ่มจัดการ (AUTO เท่านั้น) ---------- */
  /*
  const openPrint = (pairId: number, form: "A" | "B") => {
    window.open(`/api/documents/pairs/${pairId}/print?form=${form}`, "_blank");
  };

  const goEdit = (pairId: number) => {
    navigate(`/documents/a/${pairId}`);
  };

  */

  // ยืนยันก่อนสร้างเอกสาร
  const [confirmCreate, setConfirmCreate] = useState<{
    show: boolean;
    kind: "A" | "B" | "QUOTATION" | "PO" | null;
  }>({ show: false, kind: null });

  const kindLabelMap: Record<"A"|"B"|"QUOTATION"|"PO", string> = {
    A: "ใบส่งของ/ใบแจ้งหนี้/วางบิล (A)",
    B: "ใบกำกับ/ใบเสร็จ (B)",
    QUOTATION: "ใบเสนอราคา (MQ)",
    PO: "ใบสั่งซื้อ (PO)",
  };

  const openCreateConfirm = (kind: "A" | "B" | "QUOTATION" | "PO") =>
    setConfirmCreate({ show: true, kind });

  const doCreateConfirmed = async () => {
    if (!confirmCreate.kind) return;
    await createManual(confirmCreate.kind);  // เรียกฟังก์ชันเดิม
    setConfirmCreate({ show: false, kind: null });
  };






  const confirmReprint = (pairId: number) =>
    setConfirm({ show: true, mode: "REPRINT", pairId });

  const confirmVoid = (pairId: number) =>
    setConfirm({ show: true, mode: "VOID", pairId });

  const doConfirm = async () => {
    if (!confirm.pairId || !confirm.mode) return;
    try {
      if (confirm.mode === "REPRINT") {
        await axios.post(`/api/documents/pairs/${confirm.pairId}/reprint`);
        showToast("♻️ ทำเครื่องหมาย REPRINT แล้ว", "success");
      } else if (confirm.mode === "VOID") {
        await axios.post(`/api/documents/pairs/${confirm.pairId}/void`);
        showToast("🚫 VOID เอกสารเรียบร้อย", "success");
      }
      await fetchAll(1, q);
      setPage(1);
    } catch (e) {
      console.error(e);
      showToast("❌ ทำรายการไม่สำเร็จ", "danger");
    } finally {
      setConfirm({ show: false, mode: null, pairId: null });
    }
  };



  // สร้าง Manual แบบ DRAFT แล้วพาไปแก้ไข
  const createManual = async (kind: "A" | "B" | "QUOTATION" | "PO") => {
    try {
      setLoading(true);
      const { data } = await axios.post(
        "/api/manual",
        { doc_kind: kind },
        { withCredentials: true }
      );
      if (data?.id) {
        navigate(`/manual/${data.id}`);
        return;
      }
      showToast("❌ สร้างเอกสารไม่สำเร็จ", "danger");
    } catch (e) {
      console.error(e);
      showToast("❌ สร้างเอกสารไม่สำเร็จ", "danger");
    } finally {
      setLoading(false);
    }
  };








  return (
    <div className="container mt-4">
      <h1 className="text-primary">📑 Document Management</h1>

      {/* ปุ่มหัวหน้า */}
      <div className="d-flex justify-content-between mb-3">
        <div className="d-flex gap-2">
        <button className="btn btn-success" onClick={() => openCreateConfirm("A")}>
          ➕ ออกใบส่งของ/แจ้งหนี้/วางบิล (A)
        </button>
        <button className="btn btn-success" onClick={() => openCreateConfirm("B")}>
          ➕ ออกใบกำกับ/ใบเสร็จ (B)
        </button>
        <button className="btn btn-primary" onClick={() => openCreateConfirm("QUOTATION")}>
          ➕ ออกใบเสนอราคา (MQ)
        </button>
        <button className="btn btn-primary" onClick={() => openCreateConfirm("PO")}>
          ➕ ออกใบสั่งซื้อ (PO)
        </button>
      </div>

        <div className="d-flex gap-2">
          <button className="btn btn-secondary" onClick={() => navigate("/settings/documents")}>
            ⚙️ ตั้งค่าเอกสาร
          </button>
        </div>
      </div>

      {/* ค้นหา */}
      <input
        type="text"
        className="form-control mb-3"
        placeholder="🔍 ค้นหาเลข YY/###, MQ/MPO, ลูกค้า, DN/INV..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {/* ตาราง */}
      <table className="table table-striped">
        <thead>
          <tr>
            <th style={{ width: "10%" }}>เลขที่</th>
            <th style={{ width: "12%" }}>PO</th> 
            <th style={{ width: "20%" }}>ลูกค้า</th>
            <th style={{ width: "10%" }}>DN</th>
            <th style={{ width: "10%" }}>INV</th>
            <th style={{ width: "10%" }} className="text-end">
              ยอดสุทธิ
            </th>
            <th style={{ width: "8%" }}>สถานะ</th>
            <th style={{ width: "42%", textAlign: "center" }}>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={7} className="text-center text-muted">
                กำลังโหลด...
              </td>
            </tr>
          )}

          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center text-danger">
                ❌ ไม่พบเอกสาร
              </td>
            </tr>
          )}

          {!loading &&
            rows.map((r) => {
              const isManual = r.source === "MANUAL";
              const isPO = r.source === "PO";        // PO จริงจาก purchase_orders
              const isAuto = r.source === "AUTO";


              return (
                <tr key={`${r.source}:${r.id}`}>
                  <td className="fw-semibold">{r.display_no ?? "-"}</td>
                  <td>{r.po_number || "-"}</td>
                  <td>{r.party_name || "-"}</td>
                  <td>
                    {r.dn?.no || "-"}
                    <div className="text-muted small">{fmtDate(r.dn?.date)}</div>
                  </td>
                  <td>
                    {r.inv?.no || "-"}
                    <div className="text-muted small">
                      {fmtDate(r.inv?.date)} {r.inv?.status ? `· ${r.inv.status}` : ""}
                    </div>
                  </td>
                  <td className="text-end">{fmtMoney(r.grand_total)}</td>
                  <td>
                    <span
                      className={
                        "badge " +
                        (r.doc_status === "APPROVED"
                          ? "bg-success"
                          : r.doc_status === "COMPLETED"
                          ? "bg-primary"
                          : r.doc_status === "REPRINT"
                          ? "bg-info"
                          : r.doc_status === "VOID"
                          ? "bg-danger"
                          : "bg-secondary")
                      }
                    >
                      {r.doc_status}
                    </span>
                  </td>
                  <td style={{ textAlign: "left" }}>
                    {/* ดู/พิมพ์: ปิดปุ่มเมื่อเป็น MANUAL (ตามโจทย์คง UI เดิม แต่ไม่ให้กด) */}
                    {isAuto && (
                      <>
                        <button
                          className="btn btn-info btn-sm me-1"
                          onClick={() => openPrintAChooser(r.id)}
                          title="ดู/พิมพ์ A-Form"
                        >
                          🖨️ A
                        </button>
                        <button
                          className="btn btn-info btn-sm me-2"
                          onClick={() => openPrintBChooser(r.id)}
                          title="ดู/พิมพ์ B-Form"
                        >
                          🖨️ B
                        </button>
                      </>
                    )}

                    {/* แก้ไข: ปิดปุ่มเมื่อเป็น MANUAL*/}
                    {isManual ? (
                      <button
                        className="btn btn-warning btn-sm me-2"
                        onClick={() => navigate(`/manual/${r.id}`)}
                        title="แก้ไขเอกสาร Manual"
                        style={{ minWidth: "70px" }}
                      >
                        ✏️ แก้ไข
                      </button>
                    ) : isPO ? (
                      <button
                        className="btn btn-primary btn-sm me-2"
                        onClick={() => navigate(`/po-management/${r.id}`)} // ✅ ถ้าหน้า detail ใช้ path อื่น เปลี่ยนตรงนี้
                        title="ดูใบสั่งซื้อ (PO)"
                        style={{ minWidth: "70px" }}
                      >
                        📄 ดู
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm me-2"
                        onClick={() => navigate(`/documents/a/${r.id}`)}
                        title="ดูเอกสาร Auto"
                        style={{ minWidth: "70px" }}
                      >
                        📄 ดู
                      </button>
                    )}


                    {/* REPRINT / VOID: สำหรับ basic เราให้เฉพาะ AUTO เท่านั้น (ป้องกันงง) */}
                    
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="d-flex justify-content-center align-items-center gap-2">
        <button
          className="btn btn-primary"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          ⬅️ ก่อนหน้า
        </button>
        <span className="mx-2">
          หน้า {page} / {pageCount}
        </span>
        <button
          className="btn btn-primary"
          disabled={page >= pageCount}
          onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
        >
          ถัดไป ➡️
        </button>
      </div>

      {/* A-Form chooser */}
      <CustomModal
        title="เลือกหัวเอกสาร A-Form"
        show={printA.show}
        onClose={() => setPrintA({ ...printA, show: false })}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setPrintA({ ...printA, show: false })}>
              ปิด
            </button>
            <button className="btn btn-primary" onClick={doPrintA}>
              พิมพ์ / เปิดดู
            </button>
          </>
        }
      >
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="lblDN"
            checked={printA.labels.DN}
            onChange={(e) => setPrintA((p) => ({ ...p, labels: { ...p.labels, DN: e.target.checked } }))}
          />
          <label className="form-check-label" htmlFor="lblDN">
            ใบส่งของ
          </label>
        </div>
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="lblINV"
            checked={printA.labels.INV}
            onChange={(e) => setPrintA((p) => ({ ...p, labels: { ...p.labels, INV: e.target.checked } }))}
          />
          <label className="form-check-label" htmlFor="lblINV">
            ใบแจ้งหนี้
          </label>
        </div>
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="lblBILL"
            checked={printA.labels.BILL}
            onChange={(e) => setPrintA((p) => ({ ...p, labels: { ...p.labels, BILL: e.target.checked } }))}
          />
          <label className="form-check-label" htmlFor="lblBILL">
            ใบวางบิล
          </label>
        </div>
        <div className="text-muted small mt-2">* เลือกเอกสารที่ต้องการ</div>
      </CustomModal>

      {/* B-Form chooser */}
      <CustomModal
        title="เลือกหัวเอกสาร B-Form"
        show={printB.show}
        onClose={() => setPrintB({ ...printB, show: false })}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setPrintB({ ...printB, show: false })}>
              ปิด
            </button>
            <button className="btn btn-primary" onClick={doPrintB}>
              พิมพ์ / เปิดดู
            </button>
          </>
        }
      >
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="lblTAX"
            checked={printB.labels.TAX}
            onChange={(e) => setPrintB((p) => ({ ...p, labels: { ...p.labels, TAX: e.target.checked } }))}
          />
          <label className="form-check-label" htmlFor="lblTAX">
            ใบกำกับภาษี
          </label>
        </div>
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="lblRCPT"
            checked={printB.labels.RCPT}
            onChange={(e) => setPrintB((p) => ({ ...p, labels: { ...p.labels, RCPT: e.target.checked } }))}
          />
          <label className="form-check-label" htmlFor="lblRCPT">
            ใบเสร็จรับเงิน
          </label>
        </div>
        <div className="text-muted small mt-2">* เลือกเอกสารที่ต้องการ</div>
      </CustomModal>

{/*}
      <CustomModal
        title={
          <div className="bg-primary text-white p-2 rounded-top">
            ยืนยันการสร้างเอกสาร
          </div>
        }
        show={confirmCreate.show}
        onClose={() => setConfirmCreate({ show: false, kind: null })}
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setConfirmCreate({ show: false, kind: null })}
            >
              ยกเลิก
            </button>
            <button className="btn btn-primary" onClick={doCreateConfirmed}>
              ยืนยัน
            </button>
          </>
        }
      >
        <div>
          คุณต้องการสร้างเอกสารใหม่
          {confirmCreate.kind ? (
            <>
              {" "}
              <strong>{kindLabelMap[confirmCreate.kind]}</strong>
            </>
          ) : null}
          ใช่หรือไม่?
        </div>
      </CustomModal>

*/ } 

      <AlertModal
        show={confirmCreate.show}
        onClose={() => setConfirmCreate({ show: false, kind: null })}
        onConfirm={doCreateConfirmed}
        title="ยืนยันการสร้างเอกสาร"
        body={
          <>
            คุณต้องการสร้างเอกสารใหม่{" "}
            {confirmCreate.kind ? (
              <strong>{kindLabelMap[confirmCreate.kind]}</strong>
            ) : null}{" "}
            ใช่หรือไม่?
          </>
        }
        variant="primary"   
      />






      {/* Confirm Modals */}
      <AlertModal
        show={confirm.show && confirm.mode === "REPRINT"}
        onClose={() => setConfirm({ show: false, mode: null, pairId: null })}
        onConfirm={doConfirm}
        title="♻️ ยืนยัน REPRINT"
        body="ต้องการทำเครื่องหมายเอกสารนี้เป็น REPRINT ใช่หรือไม่?"
        variant="secondary"
      />
      <AlertModal
        show={confirm.show && confirm.mode === "VOID"}
        onClose={() => setConfirm({ show: false, mode: null, pairId: null })}
        onConfirm={doConfirm}
        title="🚫 ยืนยัน VOID"
        body="ต้องการยกเลิก (VOID) เอกสารนี้ใช่หรือไม่?"
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

export default DocumentManagement;
