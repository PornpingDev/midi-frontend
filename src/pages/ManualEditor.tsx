import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import AlertToast from "../components/common/AlertToast";
import AlertModal from "../components/common/AlertModal";
import CustomModal from "../components/common/CustomModal";



type DocKind = "A"|"B"|"QUOTATION"|"PO";

type ManualHeader = {
  id: number;
  doc_kind: DocKind;
  status: "DRAFT"|"APPROVED"|"VOID";
  display_no: string|null;
  quotation_no: string|null;
  po_no: string|null;
  mdn_no: string|null;
  inv_no: string|null;
  customer_id?: number | null;
  customer_no?: string | null;
  pair_id?: number|null;
  doc_date: string;
  note: string|null;
  party_name: string|null;
  party_address: string|null;
  party_tax_id: string|null;
  party_email: string|null;
  party_phone: string|null;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  grand_total: number;
  po_number?: string|null;     
  sales_order_no?: string|null;
};

type ManualItem = {
  id?: number;
  product_id?: number|null;
  product_no?: string | null;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  line_amount: number;
};

type ManualGetResp = {
  ok: boolean;
  header: ManualHeader;
  items: ManualItem[];
};



const fmtMoney = (n: number) =>
  (Number(n)||0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });



// ISO (YYYY-MM-DD หรือ ISO ที่ยาวกว่า) -> dd-MM-YYYY (ค.ศ.)
const isoToDMY = (iso?: string | null) => {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "";
  return `${d}-${m}-${y}`;
};




const ManualEditor: React.FC = () => {
  const { id } = useParams<{id:string}>();
  const manualId = Number(id || 0);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [hdr, setHdr] = useState<ManualHeader | null>(null);
  const [rows, setRows] = useState<ManualItem[]>([]);
  const [toast, setToast] = useState({ show:false, message:"", variant:"success" as any });
  const [confirm, setConfirm] = useState<{show:boolean; mode:null|"APPROVE"|"VOID"|"DUP"}>({show:false, mode:null});
  const [dateEditMode, setDateEditMode] = useState(false); 

  type ProductLite = { id:number; product_no:string; name:string; unit?:string|null };

  async function fetchProductByNo(pno: string): Promise<ProductLite | null> {
    const no = (pno || "").trim();
    if (!no) return null;

    try {
      // ลองรูปแบบ 1: endpoint เฉพาะ by-no (ถ้ามี)
      const r1 = await axios.get(`/products/by-no/${encodeURIComponent(no)}`, { withCredentials:true });
      const p1 = (r1.data?.item ?? r1.data) as any;
      if (p1?.id) return { id:p1.id, product_no:p1.product_no||no, name:p1.name||"", unit:p1.unit||null };
    } catch {}

    try {
      // รูปแบบ 2: ค้นหาแล้วเลือก exact match ตาม product_no
      const r2 = await axios.get(`/products`, { params:{ search:no }, withCredentials:true });
      const list = (r2.data?.items ?? r2.data ?? []) as any[];
      const exact = list.find(x => String(x.product_no).trim() === no);
      const p = exact ?? list[0];
      if (!p?.id) return null;
      return { id:p.id, product_no:p.product_no||no, name:p.name||"", unit:p.unit||null };
    } catch {
      return null;
    }
  }

  // เวลา “กดค้น” หรือกด Enter ที่ช่อง Product No.
  async function applyProductNoToRow(idx: number) {
    const no = (rows[idx]?.product_no ?? "").trim();
    if (!no) {
      setToast({ show:true, message:"โปรดกรอกรหัสสินค้า (Product No.)", variant:"warning" as any });
      return;
    }

    const p = await fetchProductByNo(no);
    if (!p) {
      setToast({ show:true, message:"ไม่พบสินค้าในระบบตามรหัสที่ระบุ", variant:"danger" as any });
      return;
    }

    setRows(list => {
      const copy = [...list];
      const row  = { ...copy[idx] };

      row.product_id = p.id;           // ← ใช้ id ตัวนี้บันทึกลง manual_items
      row.product_no = p.product_no;   // เก็บไว้แสดงผล
      // ถ้า description ยังว่าง เติม “ชื่อสินค้า” ให้ (ตามที่ขอ)
      if (!row.description || row.description.trim() === "") {
        if (p.name && p.name.trim() !== "") {
          row.description = p.name;           // ← ใช้ชื่อสินค้าเท่านั้น
        }
        // ถ้า p.name ว่าง ก็ไม่ใส่อะไร (ไม่ใช้ product_no)
      }
      if (!row.unit || row.unit.trim() === "") {
        row.unit = p.unit || "ชิ้น";
      }

      copy[idx] = row;
      recalc(copy, hdr?.vat_rate || 7);
      return copy;
    });

    setToast({ show:true, message:"ดึงข้อมูลสินค้าสำเร็จ", variant:"success" as any });
  }



  const recalc = (list: ManualItem[], vat_rate: number) => {
    const subtotal = list.reduce((s,it)=> s + (Number(it.quantity||0)*Number(it.unit_price||0)), 0);
    const vat = Math.round(subtotal * (Number(vat_rate||0)/100) * 100)/100;
    const grand = subtotal + vat;
    setHdr(h => h ? ({...h, subtotal, vat_rate:Number(vat_rate||0), vat_amount:vat, grand_total:grand}) : h);
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get<ManualGetResp>(`/api/manual/${manualId}`, { withCredentials:true });
      setHdr(data.header);
      setRows(data.items);
    } catch (e:any) {
      console.error(e);
      setToast({show:true,message:"โหลดเอกสารไม่สำเร็จ",variant:"danger"});
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [manualId]);

  const onHdrChange = (k: keyof ManualHeader, v:any) => {
    setHdr(h => h ? ({...h, [k]: v}) : h);
    if (k === "vat_rate") recalc(rows, Number(v));
  };

  const onRowChange = (idx:number, k: keyof ManualItem, v:any) => {
    setRows(list => {
      const copy = [...list];
      const row = {...copy[idx], [k]: v};
      const qty = Number(row.quantity||0);
      const price = Number(row.unit_price||0);
      row.line_amount = qty*price;
      copy[idx] = row;
      recalc(copy, hdr?.vat_rate||7);
      return copy;
    });
  };

  const addRow = () => setRows(list => [...list, { description:"", unit:"ชิ้น", quantity:0, unit_price:0, line_amount:0 }]);
  const delRow = (idx:number) => setRows(list => { const c=[...list]; c.splice(idx,1); recalc(c, hdr?.vat_rate||7); return c; });


  const saveHeader = async () => {
    if (!hdr) return;

    // ปรับรูปแบบวันที่ให้แน่ใจว่าเป็น YYYY-MM-DD
    const docDate =
      typeof hdr.doc_date === "string"
        ? hdr.doc_date.slice(0, 10)              // กรณีเป็น ISO string
        : new Date().toISOString().slice(0, 10); // กันพัง

    const payload = {
      customer_id: hdr.customer_id ?? null,
      customer_no: (hdr.customer_no ?? "").trim() || null, 
      doc_date: docDate,
      note: hdr.note ?? null,
      party_name: hdr.party_name ?? null,
      party_address: hdr.party_address ?? null,
      party_tax_id: hdr.party_tax_id ?? null,
      party_email: hdr.party_email ?? null,
      party_phone: hdr.party_phone ?? null,
      vat_rate: hdr.vat_rate ?? null,
      subtotal: hdr.subtotal ?? null,
      vat_amount: hdr.vat_amount ?? null,
      grand_total: hdr.grand_total ?? null,
      po_number: hdr.po_number ?? null, 
    };

    try {
      await axios.put(`/api/manual/${manualId}`, payload, { withCredentials: true });
      setToast({ show: true, message: "บันทึกหัวเอกสารแล้ว", variant: "success" });
    } catch (e: any) {
      console.error("saveHeader error:", e?.response?.data || e);
      setToast({ show: true, message: "บันทึกหัวเอกสารไม่สำเร็จ", variant: "danger" });
    }
  };



  const saveItems = async () => {
    try {
      await axios.put(`/api/manual/${manualId}/items`, { items: rows }, { withCredentials:true });
      setToast({show:true,message:"บันทึกรายการแล้ว",variant:"success"});
      await load();
    } catch (e) {
      console.error(e);
      setToast({show:true,message:"บันทึกรายการไม่สำเร็จ",variant:"danger"});
    }
  };

  const doAction = async () => {
    if (!hdr) return;
    try {
      if (confirm.mode === "APPROVE") {
        await axios.post(`/api/manual/${manualId}/approve`, {}, { withCredentials:true });
        setToast({show:true,message:"อนุมัติเรียบร้อย",variant:"success"});
      } else if (confirm.mode === "VOID") {
        await axios.post(`/api/manual/${manualId}/void`, {}, { withCredentials:true });
        setToast({show:true,message:"VOID เรียบร้อย",variant:"success"});
      } else if (confirm.mode === "DUP") {
        const { data } = await axios.post(`/api/manual/${manualId}/duplicate`, {}, { withCredentials:true });
        setToast({show:true,message:"ทำสำเนาเรียบร้อย",variant:"success"});
        if (data?.id) navigate(`/manual/${data.id}`);
      }
      await load();
    } catch (e) {
      console.error(e);
      setToast({show:true,message:"ทำรายการไม่สำเร็จ",variant:"danger"});
    } finally {
      setConfirm({show:false,mode:null});
    }
  };

  const onPrint = async () => {
    if (!hdr) return;
    try {
      // ใช้ form ตามชนิดเอกสาร (QUOTATION หรือ PO)
      const { data: payloadObj } = await axios.get(
        `/api/manual/${manualId}/print`,
        { params: { form: hdr.doc_kind }, withCredentials: true }
      );

      // ส่ง payload ไปหน้า /print (วิธีเดียวกับ A/B)
      const key = `PRINT_PAYLOAD_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(payloadObj));
      window.open(`/print?key=${encodeURIComponent(key)}`, "_blank");
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: "❌ เปิดหน้าพิมพ์ไม่สำเร็จ", variant: "danger" as any });
    }
  };



  // ── A form chooser ─────────────────────────
  const [printA, setPrintA] = useState<{ show: boolean; labels: { DN: boolean; INV: boolean; BILL: boolean } }>({
    show: false, labels: { DN: true, INV: true, BILL: true }
  });

  // ใช้ตอน DRAFT (manual route)
  const doPrintA_Manual = async () => {
    if (!hdr) return;
    try {
      const selected = (["DN","INV","BILL"] as const).filter(k => printA.labels[k]);
      const { data: payloadObj } = await axios.get(
        `/api/manual/${manualId}/print`,
        {
          params: {
            form: "A",
            // ถ้าไม่ได้ติ๊กอะไรไว้จะไม่ส่งพารามิเตอร์ labels ไปเลย
            ...(selected.length ? { labels: selected.join(",") } : {})
          },
          withCredentials: true
        }
      );

      const key = `PRINT_PAYLOAD_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(payloadObj));
      window.open(`/print?key=${encodeURIComponent(key)}`, "_blank");
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: "❌ เปิดหน้าพิมพ์ไม่สำเร็จ", variant: "danger" as any });
    } finally {
      setPrintA(p => ({ ...p, show:false }));
    }
  };

  // ใช้ตอน APPROVED (pair route)
  const doPrintA_Pair = async () => {
    if (!hdr?.pair_id) return;
    try {
      const selected = (["DN","INV","BILL"] as const).filter(k => printA.labels[k]);
      const { data: payloadObj } = await axios.get(
        `/api/documents/pairs/${hdr.pair_id}/print`,
        {
          params: {
            form: "A",
            ...(selected.length ? { labels: selected.join(",") } : {})
          },
          withCredentials: true
        }
      );

      const key = `PRINT_PAYLOAD_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(payloadObj));
      window.open(`/print?key=${encodeURIComponent(key)}`, "_blank");
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: "❌ เปิดหน้าพิมพ์ไม่สำเร็จ", variant: "danger" as any });
    } finally {
      setPrintA(p => ({ ...p, show:false }));
    }
  };

  // ── B form chooser ─────────────────────────
  const [printB, setPrintB] = useState<{ show: boolean; labels: { TAX: boolean; RCPT: boolean } }>({
    show: false, labels: { TAX: true, RCPT: true }
  });

  const doPrintB_Manual = async () => {
    if (!hdr) return;
    try {
      const selected = (["TAX","RCPT"] as const).filter(k => printB.labels[k]);
      const { data: payloadObj } = await axios.get(
        `/api/manual/${manualId}/print`,
        { params: { form: "B", labels: selected.join(",") }, withCredentials: true }
      );
      const key = `PRINT_PAYLOAD_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(payloadObj));
      window.open(`/print?key=${encodeURIComponent(key)}`, "_blank");
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: "❌ เปิดหน้าพิมพ์ไม่สำเร็จ", variant: "danger" });
    } finally {
      setPrintB(p => ({ ...p, show:false }));
    }
  };

  const doPrintB_Pair = async () => {
    if (!hdr?.pair_id) return;
    try {
      const selected = (["TAX","RCPT"] as const).filter(k => printB.labels[k]);
      const { data: payloadObj } = await axios.get(
        `/api/documents/pairs/${hdr.pair_id}/print`,
        { params: { form: "B", labels: selected.join(",") }, withCredentials: true }
      );
      const key = `PRINT_PAYLOAD_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(payloadObj));
      window.open(`/print?key=${encodeURIComponent(key)}`, "_blank");
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: "❌ เปิดหน้าพิมพ์ไม่สำเร็จ", variant: "danger" });
    } finally {
      setPrintB(p => ({ ...p, show:false }));
    }
  };




  if (loading || !hdr) return <div className="container mt-4">กำลังโหลด...</div>;

  const displayNo =
  hdr.display_no || hdr.quotation_no || hdr.po_no || hdr.mdn_no || hdr.inv_no || hdr.id;



  const getPrettyKind = (h: ManualHeader): string => {
    switch (h.doc_kind) {
      case "A":
        return "Delivery Note (Manual)";   // เอกสาร A
      case "B":
        return "Invoice (Manual)";         // เอกสาร B
      case "QUOTATION":
        return "Quotation";
      case "PO":
        return "Purchase Order";
      default:
        return "Manual Document";
    }
  };



  return (
    <div className="container mt-4">
      {/* Title + status badge */}
      <h2 className="text-primary">
        📝 {getPrettyKind(hdr)} <span className="text-muted">#{displayNo}</span>
        <span
          className={
            "ms-3 badge " +
            (hdr.status === "APPROVED"
              ? "bg-success"
              : hdr.status === "VOID"
              ? "bg-danger"
              : "bg-secondary")
          }
        >
          {hdr.status}
        </span>
      </h2>

      {/* Action bar เหมือนหน้า Auto */}
      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
        {/* ปุ่มกลับแบบสี่เหลี่ยมสีน้ำเงิน + ลูกศร */}
        <button
          type="button"
          className="btn btn-secondary d-inline-flex align-items-center px-3"
          onClick={() => navigate(-1)}
          disabled={loading}
        >
          <span
            className="bg-primary text-white d-inline-flex align-items-center justify-content-center rounded-1 me-2"
            style={{ width: 22, height: 22, lineHeight: 1, fontWeight: 700 }}
          >
            ⬅️
          </span>
          กลับ
        </button>


        {/* ปุ่มพิมพ์ */}
        {(hdr.doc_kind === "QUOTATION" || hdr.doc_kind === "PO") ? (
          // 👉 เอกสาร QUOTATION/PO = ปุ่ม "พิมพ์" เดียว (ไม่ต้องเลือก A/B)
          <button className="btn btn-info" onClick={onPrint} disabled={loading}>
            🖨️ พิมพ์
          </button>
        ) : (hdr.status === "APPROVED" && hdr.pair_id) ? (
          // 👉 เอกสาร A/B ที่ APPROVED แล้ว + มี pair_id = พิมพ์ได้ทั้ง A และ B
          <>
            <button className="btn btn-info" onClick={() => setPrintA(p => ({ ...p, show: true }))} disabled={loading}>
              🖨️ พิมพ์ A
            </button>
            <button className="btn btn-info" onClick={() => setPrintB(p => ({ ...p, show: true }))} disabled={loading}>
              🖨️ พิมพ์ B
            </button>
          </>
        ) : hdr.doc_kind === "A" ? (
          // 👉 DRAFT ชุด A = พิมพ์เฉพาะ A
          <button className="btn btn-info" onClick={() => setPrintA(p => ({ ...p, show: true }))} disabled={loading}>
            🖨️ พิมพ์ A
          </button>
        ) : (
          // 👉 DRAFT ชุด B = พิมพ์เฉพาะ B
          <button className="btn btn-info" onClick={() => setPrintB(p => ({ ...p, show: true }))} disabled={loading}>
            🖨️ พิมพ์ B
          </button>
        )}





        {/* ทำสำเนา / อนุมัติ / VOID ให้ขนาดเท่ากันกับ Auto (ไม่ใช้ -sm) */}
        <button
          className="btn btn-secondary"
          onClick={() => setConfirm({ show: true, mode: "DUP" })}
          disabled={loading}
        >
          ♻️ REPRINT
        </button>

        {hdr.status === "DRAFT" && (
          <button
            className="btn btn-success"
            onClick={() => setConfirm({ show: true, mode: "APPROVE" })}
            disabled={loading}
          >
            ✅ อนุมัติ
          </button>
        )}

        {hdr.status !== "VOID" && (
          <button
            className="btn btn-danger"
            onClick={() => setConfirm({ show: true, mode: "VOID" })}
            disabled={loading}
          >
            🚫 VOID
          </button>
        )}
      </div>


      {/* HEADER */}
      <div className="card mb-3">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div>หัวเอกสาร</div>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={()=>setConfirm({show:true, mode:"DUP"})}>ทำสำเนา</button>
            <button className="btn btn-primary btn-sm" onClick={saveHeader}>บันทึกหัวเอกสาร</button>
          </div>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">วันที่เอกสาร</label>
              <input
                // โหมดแสดงผล: text (โชว์ dd-MM-YYYY), โหมดแก้ไข: date (มีปฏิทิน)
                type={dateEditMode ? "date" : "text"}
                lang="th-TH"
                className="form-control"
                placeholder="dd-MM-yyyy"
                // แสดงค่า: ถ้าเป็นโหมดแก้ไข ใช้ ISO (YYYY-MM-DD) เพื่อให้ปฏิทินทำงาน
                // ถ้าไม่ใช่โหมดแก้ไข แปลงเป็น dd-MM-YYYY เพื่อโชว์
                value={dateEditMode ? (hdr.doc_date?.slice(0, 10) || "") : isoToDMY(hdr.doc_date)}
                // โฟกัสเมื่อเป็น DRAFT เท่านั้น (อนุมัติแล้วก็ให้เป็น read-only)
                onFocus={() => {
                  if (hdr.status === "DRAFT") setDateEditMode(true);
                }}
                onClick={() => {
                  if (hdr.status === "DRAFT") setDateEditMode(true);
                }}
                onBlur={() => {
                  // ออกจากโหมดแก้ไข → กลับมาเป็นข้อความ dd-MM-YYYY
                  setDateEditMode(false);
                }}
                // อัปเดต header เฉพาะตอนอยู่ในโหมด date (ค่าที่ได้เป็น YYYY-MM-DD)
                onChange={(e) => {
                  if (dateEditMode) {
                    onHdrChange("doc_date", e.target.value);
                  }
                }}
                readOnly={hdr.status !== "DRAFT" && !dateEditMode}
              />
            </div>
            <div className="col-md-9">
              <label className="form-label">หมายเหตุ</label>
              <input className="form-control" value={hdr.note||""} onChange={e=>onHdrChange("note", e.target.value)} />
            </div>

            <div className="col-md-6">
              <label className="form-label">ชื่อคู่ค้า</label>
              <input className="form-control" value={hdr.party_name||""} onChange={e=>onHdrChange("party_name", e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">เลขภาษี</label>
              <input className="form-control" value={hdr.party_tax_id||""} onChange={e=>onHdrChange("party_tax_id", e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">รหัสลูกค้า/รหัสผู้ขาย</label>
              <input
                className="form-control"
                value={hdr.customer_no || ""}                         
                onChange={(e) => onHdrChange("customer_no", e.target.value)}  
                placeholder=""
              />
            </div>
            <div className="col-md-12">
              <label className="form-label">ที่อยู่</label>
              <textarea className="form-control" value={hdr.party_address||""} onChange={e=>onHdrChange("party_address", e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label">อีเมล</label>
              <input className="form-control" value={hdr.party_email||""} onChange={e=>onHdrChange("party_email", e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">โทรศัพท์</label>
              <input className="form-control" value={hdr.party_phone||""} onChange={e=>onHdrChange("party_phone", e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">เลขที่เอกสารอ้างอิง/เลขที่ PO</label>
              <input
                className="form-control"
                value={hdr.po_number || ""}
                onChange={(e) => onHdrChange("po_number", e.target.value)}
                placeholder=""
              />
            </div>

          </div>
        </div>
      </div>

      {/* ITEMS */}
      <div className="card mb-3">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div>รายการสินค้า/บริการ</div>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={addRow}>+ เพิ่มแถว</button>
            <button className="btn btn-primary btn-sm" onClick={saveItems}>บันทึกรายการ</button>
          </div>
        </div>
        <div className="card-body p-0">
          <table className="table mb-0">
            <thead>
              <tr>
                <th style={{width:'5%'}}>#</th>
                <th style={{width:'16%'}}>Product No.</th> 
                <th style={{width:'40%'}}>รายละเอียด</th>
                <th style={{width:'10%'}}>หน่วย</th>
                <th style={{width:'10%'}}>จำนวน</th>
                <th style={{width:'10%'}}>ราคาต่อหน่วย</th>
                <th style={{width:'15%'}}>จำนวนเงิน</th>
                <th style={{width:'5%'}}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r,idx)=>(
                <tr key={idx}>
                  <td>{idx+1}</td>
                  <td>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="รหัสสินค้า (Product No.)"
                        value={r.product_no ?? ""}
                        onChange={(e) => onRowChange(idx, "product_no", e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") applyProductNoToRow(idx); }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        title="ดึงข้อมูลสินค้า"
                        onClick={() => applyProductNoToRow(idx)}
                      >
                        🔎
                      </button>
                    </div>
                  </td>
                  <td>
                    <input
                      type="text"
                      className="form-control"
                      value={r.description}
                      onChange={(e) => onRowChange(idx, "description", e.target.value)}
                      placeholder="รายละเอียดสินค้า/บริการ"
                    />
                  </td>
                  <td><input className="form-control" value={r.unit} onChange={e=>onRowChange(idx,'unit', e.target.value)} /></td>
                  <td><input type="number" className="form-control" value={r.quantity} onChange={e=>onRowChange(idx,'quantity', Number(e.target.value))} /></td>
                  <td><input type="number" className="form-control" value={r.unit_price} onChange={e=>onRowChange(idx,'unit_price', Number(e.target.value))} /></td>
                  <td className="text-end">{fmtMoney(r.line_amount)}</td>
                  <td><button className="btn btn-outline-danger btn-sm" onClick={()=>delRow(idx)}>ลบ</button></td>
                </tr>
              ))}
              {rows.length===0 && (
                <tr><td colSpan={7} className="text-center text-muted">ไม่มีรายการ</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TOTALS + Action */}
      <div className="d-flex justify-content-end align-items-center mb-5">
        <div className="text-end">
          <div>ยอดก่อนภาษี: <strong>{fmtMoney(hdr.subtotal)}</strong></div>
          <div className="d-flex justify-content-end align-items-center gap-2">
            ภาษี (%) <input type="number" style={{width:90}} className="form-control form-control-sm d-inline-block"
                      value={hdr.vat_rate} onChange={e=>onHdrChange('vat_rate', Number(e.target.value))}/>
            = <strong>{fmtMoney(hdr.vat_amount)}</strong>
          </div>
          <div>ยอดสุทธิ: <strong>{fmtMoney(hdr.grand_total)}</strong></div>
        </div>
      </div>


      <AlertModal
        show={confirm.show}
        onClose={()=>setConfirm({show:false,mode:null})}
        onConfirm={doAction}
        title={confirm.mode==="APPROVE"?"ยืนยันอนุมัติ":confirm.mode==="VOID"?"ยืนยัน VOID":"ยืนยันทำสำเนา"}
        body="ต้องการดำเนินการต่อหรือไม่?"
        variant={confirm.mode==="VOID"?"danger":"primary"}
      />

      <AlertToast show={toast.show} onClose={()=>setToast({...toast,show:false})} message={toast.message} variant={toast.variant}/>



      {/* A-Form chooser */}
      <CustomModal
        title="เลือกหัวเอกสาร A-Form"
        show={printA.show}
        onClose={() => setPrintA(p => ({ ...p, show:false }))}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setPrintA(p => ({ ...p, show:false }))}>ปิด</button>
            {hdr?.status === "APPROVED" && hdr?.pair_id ? (
              <button className="btn btn-primary" onClick={doPrintA_Pair}>พิมพ์ / เปิดดู</button>
            ) : (
              <button className="btn btn-primary" onClick={doPrintA_Manual}>พิมพ์ / เปิดดู</button>
            )}
          </>
        }
      >
        <div className="form-check">
          <input className="form-check-input" type="checkbox" id="lblA_DN"
            checked={printA.labels.DN}
            onChange={e => setPrintA(p => ({ ...p, labels:{...p.labels, DN:e.target.checked} }))} />
          <label className="form-check-label" htmlFor="lblA_DN">ใบส่งของ (DN)</label>
        </div>
        <div className="form-check">
          <input className="form-check-input" type="checkbox" id="lblA_INV"
            checked={printA.labels.INV}
            onChange={e => setPrintA(p => ({ ...p, labels:{...p.labels, INV:e.target.checked} }))} />
          <label className="form-check-label" htmlFor="lblA_INV">ใบแจ้งหนี้ (INV)</label>
        </div>
        <div className="form-check">
          <input className="form-check-input" type="checkbox" id="lblA_BILL"
            checked={printA.labels.BILL}
            onChange={e => setPrintA(p => ({ ...p, labels:{...p.labels, BILL:e.target.checked} }))} />
          <label className="form-check-label" htmlFor="lblA_BILL">ใบวางบิล (BILL)</label>
        </div>
        <div className="text-muted small mt-2">* เลือกหัวเอกสารที่จะพิมพ์</div>
      </CustomModal>

      {/* B-Form chooser */}
      <CustomModal
        title="เลือกหัวเอกสาร B-Form"
        show={printB.show}
        onClose={() => setPrintB(p => ({ ...p, show:false }))}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setPrintB(p => ({ ...p, show:false }))}>ปิด</button>
            {hdr?.status === "APPROVED" && hdr?.pair_id ? (
              <button className="btn btn-primary" onClick={doPrintB_Pair}>พิมพ์ / เปิดดู</button>
            ) : (
              <button className="btn btn-primary" onClick={doPrintB_Manual}>พิมพ์ / เปิดดู</button>
            )}
          </>
        }
      >
        <div className="form-check">
          <input className="form-check-input" type="checkbox" id="lblB_TAX"
            checked={printB.labels.TAX}
            onChange={e => setPrintB(p => ({ ...p, labels:{...p.labels, TAX:e.target.checked} }))} />
          <label className="form-check-label" htmlFor="lblB_TAX">ใบกำกับภาษี (TAX)</label>
        </div>
        <div className="form-check">
          <input className="form-check-input" type="checkbox" id="lblB_RCPT"
            checked={printB.labels.RCPT}
            onChange={e => setPrintB(p => ({ ...p, labels:{...p.labels, RCPT:e.target.checked} }))} />
          <label className="form-check-label" htmlFor="lblB_RCPT">ใบเสร็จรับเงิน (RCPT)</label>
        </div>
        <div className="text-muted small mt-2">* เลือกหัวเอกสารที่จะพิมพ์</div>
      </CustomModal>

        

    </div>
  );
};

export default ManualEditor;
