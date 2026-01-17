import React, { useEffect, useRef, useState } from "react";   // ← เพิ่ม useEffect
import DocumentPrint from "../components/documents/DocumentPrint";

// ===== layouts =====
import A_LAYOUT from "../components/documents/midi_form_A_layout.json";
import B_LAYOUT from "../components/documents/midi_form_B_layout.json";
import PO_LAYOUT from "../components/documents/midi_form_PO_layout.json";
import Q_LAYOUT  from "../components/documents/midi_form_QUOTATION_layout.json";

const LAYOUTS: Record<string, any> = {
  A: A_LAYOUT,
  B: B_LAYOUT,          
  PO: PO_LAYOUT,
  QUOTATION: Q_LAYOUT,
};

// ===== ตัวอย่างข้อมูล (ไว้กดทดสอบบนหน้านี้) =====
const SAMPLE_A = {
  ok: true,
  form: "A",
  header_title: "ใบส่งของ/ใบแจ้งหนี้/ใบวางบิล",
  header_labels: ["DN", "INV", "BILL"],
  display_no: "68/012",
  doc_status: "APPROVED",
  customer: {
    name: "หจก. เอ็นจิเนียริ่งเซ็นเตอร์",
    address: "456 ถนนรามคำแหง, กรุงเทพฯ",
    tax_id: "3210987654321",
    email: "contact@engcenter.com",
    phone: "0897654321",
  },
  document_no: "MDN68-012",
  document_date: "2025-09-01T17:00:00.000Z",
  totals: { subtotal: 150, vat_rate: 7, vat_amount: 10.5, grand_total: 160.5 },
  items: [
    {
      product_no: "PRO250300100004",
      name: "เพลทเหล็ก 5 มม.",
      description: "ส่งของภายใน 3 วัน / เครดิต 30 วัน",
      unit: "ชิ้น",
      quantity: 1,
      unit_price: 150,
      line_amount: 150,
    },
  ],
};

// ===== ยูทิล =====
/*
const ensureDMY = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear());
  return `${dd}/${mm}/${yy}`;
};
*/

const ensureDMY = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const thYear = String(d.getFullYear() + 543);   // ✅ พ.ศ.
  return `${dd}/${mm}/${thYear}`;
};




export default function PrintDemo() {
  const printRef = useRef<HTMLDivElement | null>(null);
  const [docState, setDocState] = useState<any>(null);
  const [layoutState, setLayoutState] = useState<any>(A_LAYOUT);

  // เลือก layout จาก form
  const pickLayout = (form?: string) => LAYOUTS[form || "A"] || A_LAYOUT;

  // เตรียม doc ให้พร้อม (เติม doc_date_dmy ถ้าไม่มี)
/*
  const prepareDoc = (d: any) => {
    if (!d) return d;

    if (!d?.doc_date_dmy && d?.document_date) {
      d = { ...d, doc_date_dmy: ensureDMY(d.document_date) };
    }

    // ✅ ใช้เลขเอกสารเป็น JOB No.
    return { ...d, job_no: d.document_no ?? "" };
  };
*/

  const prepareDoc = (d: any) => {
    if (!d) return d;

    const docDate = d.document_date || d.doc_date || d.documentDate;
    if (!d?.doc_date_dmy && docDate) {
      d = { ...d, doc_date_dmy: ensureDMY(docDate) };
    }

    // ✅ JOB No. ใช้เลขหลักที่ “มีจริง” ตามฟอร์ม
    const jobNo =
      d.document_no ||
      d.po_no ||
      d.po_number ||
      d.quotation_no ||
      d.display_no ||
      "";

    return { ...d, job_no: jobNo };
  };



  // พิมพ์ผ่าน iframe โดยใช้ layout ปัจจุบัน (หรือที่ส่งมา)
  const handleEdgeSafePrint = (layoutParam?: any) => {
    const layout = layoutParam || layoutState;
    if (!printRef.current || !layout?.page?.margins_mm) return;

    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "0",
      height: "0",
      border: "0",
    } as CSSStyleDeclaration);
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument!;
    const [mt, mr, mb, ml] = layout.page.margins_mm;
    const contentWidthMm = 210 - (mr + ml);

    doc.open();
    doc.write(`
      <html lang="th">
        <head>
          <meta charset="utf-8" />
          <style>
            @page { size: A4; margin: ${mt}mm ${mr}mm ${mb}mm ${ml}mm; }
            @media print {
              html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .print-area, .print-area *, .print-area *::before, .print-area *::after { box-sizing: border-box; }
              .print-area { width: ${contentWidthMm}mm; box-sizing: border-box; border: 0 !important; }
            }
            html, body { margin:0; }
            body { font-family: ${layout.page.base_font_family.join(",")};
                   font-size: ${layout.page.base_font_px}px; color:#111; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            table { page-break-inside: auto; border-collapse: collapse; }
            tr, td, th { page-break-inside: avoid; }
            .print-area { break-inside: avoid; }
          </style>
        </head>
        <body>${printRef.current!.outerHTML}</body>
      </html>
    `);
    doc.close();

    const cleanup = () => { try { document.body.removeChild(iframe); } catch {} };
    const doPrint = () => {
      const w = iframe.contentWindow;
      if (!w) return cleanup();
      const after = () => { w.removeEventListener("afterprint", after); cleanup(); };
      w.addEventListener("afterprint", after);
      w.focus(); w.print();
      setTimeout(after, 2000);
    };
    if (doc.readyState === "complete") setTimeout(doPrint, 50);
    else (iframe.onload = () => setTimeout(doPrint, 50));
  };

  // ฟังก์ชันเดียวจบ: รับ payload → เลือก layout → set state → พิมพ์
  const printDoc = async (payload: any) => {
    const layout = pickLayout(payload?.form);
    setDocState(prepareDoc(payload));
    setLayoutState(layout);
    await new Promise((r) => requestAnimationFrame(() => r(null))); // รอ DOM อัปเดต 1 เฟรม
    handleEdgeSafePrint(layout);
  };


  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const key = params.get("key");

      // รองรับทั้งแบบเปิดแท็บใหม่ (localStorage) และกรณีเก่าที่อาจใช้ sessionStorage
      let raw: string | null = null;
      if (key) {
        raw = localStorage.getItem(key);
        if (raw) localStorage.removeItem(key);
        sessionStorage.removeItem("PRINT_PAYLOAD");
      } else {
        raw = sessionStorage.getItem("PRINT_PAYLOAD");
      }
      if (!raw) return;

      const payload = JSON.parse(raw);
      const layout = pickLayout(payload?.form);
      setDocState(prepareDoc(payload));
      setLayoutState(layout);

      requestAnimationFrame(() => handleEdgeSafePrint(layout));
    } catch (err) {
      console.error("PRINT load error:", err);
    }
  }, []);


  if (!docState) {
    return <div style={{ padding: 16 }}>กำลังเตรียมเอกสาร…</div>;
  }



  // ขนาด preview ตาม layout ปัจจุบัน
  const [, mrMm, , mlMm] = layoutState.page.margins_mm;
  const contentWidthMm = 210 - (mrMm + mlMm);
  const baseFamily = layoutState.page.base_font_family.join(",");
  const basePx = layoutState.page.base_font_px;

  // ตัวอย่าง payload อื่น (ไว้ทดสอบ)
  const SAMPLE_B = { ...SAMPLE_A, form: "B", header_title: "ใบส่งของ/ใบกำกับภาษี" };
  const SAMPLE_PO = {
    ...SAMPLE_A,
    form: "PO",
    header_title: "ใบสั่งซื้อ (PURCHASE ORDER)",
    display_no: "PO-68/045",
    po_number: "PO-68-045",
  };
  const SAMPLE_QUO = {
    ...SAMPLE_A,
    form: "QUOTATION",
    header_title: "ใบเสนอราคา (QUOTATION)",
    display_no: "MQ-68/112",
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Print Preview</h2>

      {/* ปุ่มพิมพ์แบบตัวอย่าง (ยังใช้ทดสอบได้) */}
      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => handleEdgeSafePrint()} style={{ padding: "6px 12px" }}>
          🖨️ Print Document 
        </button>
      </div>

      {/* พรีวิว — เส้นประมีเฉพาะตอนพรีวิว (ตอนพิมพ์จะไม่ติด) */}
      <div
        ref={printRef}
        className="print-area"
        style={{
          background: "#fff",
          padding: 12,
          border: "1px dashed #ccc",
          width: `${contentWidthMm}mm`,
          boxSizing: "border-box",
          margin: "0 auto",
          fontFamily: baseFamily,
          fontSize: basePx,
        }}
      >
        <DocumentPrint doc={docState as any} layout={layoutState as any} />
      </div>
    </div>
  );
}
