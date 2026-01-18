import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE;

/** ---------------- Helpers ---------------- */
const toNum = (x) => (typeof x === "number" ? x : parseFloat(x || "0"));
const fmt2  = (n) => toNum(n).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt0  = (n) => toNum(n).toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });


/** ให้ month string (YYYY-MM) อยู่ในปีที่เลือก */
function sameYear(ym, year, fallbackMM) {
  if (!ym || ym.length < 7) return `${year}-${fallbackMM}`;
  const mm = ym.slice(5, 7);
  return `${year}-${mm}`;
}
/** บีบช่วง month ให้อยู่ในปีที่เลือก */
function clampRangeToYear(year, a, b) {
  const min = `${year}-01`, max = `${year}-12`;
  const A = a < min ? min : a > max ? max : a;
  const B = b < min ? min : b > max ? max : b;
  return A <= B ? [A, B] : [B, A];
}
/** แปลง 'YYYY-MM' เป็น Date ที่เป็นวันแรกของเดือน */
function monthStart(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1);
}
/** รับ 'YYYY-MM' → คืน ISO 'YYYY-MM-DD' ของวันแรกเดือนถัดไป (ใช้เป็น to แบบ exclusive) */
function nextMonthISO(ym) {
  const d = monthStart(ym);
  const nd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return nd.toISOString().slice(0, 10);
}
/** 'YYYY-MM' → 'YYYY-MM-01' */
function firstDayISO(ym) {
  const d = monthStart(ym);
  return d.toISOString().slice(0, 10);
}

/** ---------------- Component ---------------- */
export default function ProductSalesReport() {
  const currentYear = String(new Date().getFullYear());

  const [items, setItems] = useState([]);             // เดิม: Item[]
  const [loading, setLoading] = useState(false);

  // ฟิลเตอร์เหมือนหน้าเดิม
  const [year, setYear] = useState(currentYear);
  const [from, setFrom] = useState(`${currentYear}-01`); // YYYY-MM
  const [to, setTo]     = useState(`${currentYear}-12`); // YYYY-MM
  const [mode, setMode] = useState("exvat");             // "exvat" | "vat" | "incvat"
  const [gran, setGran] = useState("month");             // "day" | "month" | "quarter" | "year"

  // ตัวกรองสินค้า (อย่างใดอย่างหนึ่งพอ)
  const [productName, setProductName] = useState("");
  const [productNo, setProductNo] = useState("");

  // เปลี่ยนปี → คงเดือนเดิม/บีบให้อยู่ในปี
  useEffect(() => {
    const f = sameYear(from, year, "01");
    const t = sameYear(to,   year, "12");
    const [f2, t2] = clampRangeToYear(year, f, t);
    setFrom(f2);
    setTo(t2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  async function fetchData(override) {
    setLoading(true);
    try {
      // backend ของ product-sales ใช้ date จริง (from รวม, to ไม่รวม)
      const [f2, t2] = clampRangeToYear(year, from || `${year}-01`, to || `${year}-12`);
      const fromISO = firstDayISO(f2);
      const toISO   = nextMonthISO(t2); // exclusive

      const params = new URLSearchParams();
      params.set("from", fromISO);
      params.set("to",   toISO);
      params.set("granularity", gran);

      // ส่ง filter สินค้า (ให้ id มาก่อน ถ้ามี)
      const pname = (override && override.productName != null ? override.productName : productName).trim();
      const pno   = (override && override.productNo   != null ? override.productNo   : productNo).trim();
      if (pname)  params.set("product_name", pname);
      else if (pno) params.set("product_no", pno);

      const url = `${API_BASE}/api/reports/product-sales?${params.toString()}`;
      const { data } = await axios.get(url, { withCredentials: true });
      setItems((data && data.items) || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); /* โหลดรอบแรก */ }, []);

  // รวมยอดท้ายตาราง (ตาม mode)
  const totals = useMemo(() => {
    return items.reduce(
      (a, r) => {
        a.qty           += toNum(r.qty);
        a.sales_exvat   += toNum(r.sales_exvat);
        a.sales_vat     += toNum(r.sales_vat);
        a.sales_incvat  += toNum(r.sales_incvat);
        return a;
      },
      { qty: 0, sales_exvat: 0, sales_vat: 0, sales_incvat: 0 }
    );
  }, [items]);

  const colSales =
    mode === "exvat" ? "sales_exvat" :
    mode === "vat"   ? "sales_vat"   :
                       "sales_incvat";
  const colLabel = mode === "exvat" ? "ไม่รวม VAT" : mode === "vat" ? "VAT" : "รวม VAT";

  return (
    <div className="container mt-4">
      <div className="row mt-2 mb-3">
        <div className="col">
          <h2 className="text-primary">📦 Units sold</h2>
        </div>
      </div>

      {/* Toolbar: layout เดียวกับฟอร์มเดิม */}
      <div className="row row-cols-1 row-cols-md-6 g-2 align-items-stretch mb-3">
        <div className="col">
          <label className="form-label">ปี</label>
          <select className="form-select" value={year} onChange={(e)=>setYear(e.target.value)}>
            {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() + i).map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>

        <div className="col">
          <label className="form-label">จากเดือน</label>
          <input
            type="month"
            className="form-control"
            value={from}
            min={`${year}-01`}
            max={`${year}-12`}
            onChange={(e)=>{
              const v = e.target.value;
              const [f2, t2] = clampRangeToYear(year, v, to);
              setFrom(f2); setTo(t2);
            }}
          />
        </div>

        <div className="col">
          <label className="form-label">ถึงเดือน</label>
          <input
            type="month"
            className="form-control"
            value={to}
            min={`${year}-01`}
            max={`${year}-12`}
            onChange={(e)=>{
              const v = e.target.value;
              const [f2, t2] = clampRangeToYear(year, from, v);
              setFrom(f2); setTo(t2);
            }}
          />
        </div>

        <div className="col">
          <label className="form-label">ความละเอียด</label>
          <select className="form-select" value={gran} onChange={(e)=>setGran(e.target.value)}>
            <option value="day">รายวัน</option>
            <option value="month">รายเดือน</option>
            <option value="quarter">รายไตรมาส</option>
            <option value="year">รายปี</option>
          </select>
        </div>

        <div className="col">
          <label className="form-label">ยอดที่แสดง</label>
          <select className="form-select" value={mode} onChange={(e)=>setMode(e.target.value)}>
            <option value="exvat">ไม่รวม VAT</option>
            <option value="vat">VAT</option>
            <option value="incvat">รวม VAT</option>
          </select>
        </div>

        <div className="col d-grid">
          <label className="form-label opacity-0">ค้นหา</label>
          <button className="btn btn-primary h-100 w-100" onClick={fetchData}>แสดงข้อมูล</button>
        </div>
      </div>

      {/* ตัวกรองสินค้า (เลือกอย่างใดอย่างหนึ่ง) */}
      <div className="row row-cols-1 row-cols-md-3 g-2 mb-3">
        <div className="col">
          <label className="form-label">Product No.</label>
          <input
            type="text"
            className="form-control"
            value={productNo}
            onChange={(e)=>setProductNo(e.target.value)}
            placeholder=""
          />
        </div>
        <div className="col">
          <label className="form-label">Product name</label>
          <input
            type="text"
            className="form-control"
            value={productName}
            onChange={(e)=>setProductName(e.target.value)}
            placeholder=""
            onKeyDown={(e)=>{ if (e.key === "Enter") fetchData(); }}
          />
        </div>

        <div className="col d-grid">
          <label className="form-label opacity-0">รีเซ็ต</label>
          <button
            className="btn btn-outline-secondary"
            disabled={loading}
            onClick={() => {
              setProductName("");
              setProductNo("");
              // โหลดข้อมูลค่า default ทันที โดยไม่รอ state
              fetchData({ productName: "", productNo: "" });
            }}
          >
            ลบคำค้นหา
          </button>
        </div>
      </div>

      {/* ตารางผลลัพธ์ */}
      <div className="table-responsive">
        <table className="table table-striped align-middle">
          <thead className="table-light">
            <tr>
              <th style={{width:"14%"}}>ช่วงเวลา</th>
              <th style={{width:"14%"}}>Product No.</th>
              <th>ชื่อสินค้า</th>
              <th style={{width:"10%", textAlign:"right"}}>จำนวน</th>
              <th style={{width:"16%", textAlign:"right"}}>ยอดขาย {colLabel}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}>กำลังโหลด...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5}>ไม่พบข้อมูล</td></tr>
            ) : (
              items.map((r, i) => (
                <tr key={`${r.period}-${r.product_id}-${i}`}>
                  <td>{r.period}</td>
                  <td>{r.product_no || "-"}</td>
                  <td>{r.product_name || "-"}</td>
                  <td style={{textAlign:"right"}}>{fmt0(r.qty)}</td>
                  <td style={{textAlign:"right"}}>{fmt2(r[colSales])}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="table-light">
            <tr>
              <th colSpan={3} style={{textAlign:"right"}}>รวม</th>
              <th style={{textAlign:"right"}}>{fmt0(totals.qty)}</th>
              <th style={{textAlign:"right"}}>{fmt2(totals[colSales])}</th>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
