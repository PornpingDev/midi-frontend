import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

/** ---------------- Helpers ---------------- */
const toNum = (x) => (typeof x === "number" ? x : parseFloat(x || "0"));
const fmt2  = (n) => toNum(n).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function sameYear(ym, year, fallbackMM) {
  if (!ym || ym.length < 7) return `${year}-${fallbackMM}`;
  const mm = ym.slice(5, 7);
  return `${year}-${mm}`;
}
function clampRangeToYear(year, a, b) {
  const min = `${year}-01`, max = `${year}-12`;
  const A = a < min ? min : a > max ? max : a;
  const B = b < min ? min : b > max ? max : b;
  return A <= B ? [A, B] : [B, A];
}
function monthStart(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1);
}
function nextMonthISO(ym) {
  const d = monthStart(ym);
  const nd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return nd.toISOString().slice(0, 10);
}
function firstDayISO(ym) {
  const d = monthStart(ym);
  return d.toISOString().slice(0, 10);
}

/** ---------------- Component ---------------- */
export default function NonMovingProductsReport() {
  const currentYear = String(new Date().getFullYear());

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // ฟิลเตอร์เหมือนหน้าเดิม (คงทั้งหมด)
  const [year, setYear] = useState(currentYear);
  const [from, setFrom] = useState(`${currentYear}-01`); // YYYY-MM
  const [to, setTo]     = useState(`${currentYear}-12`); // YYYY-MM
  const [mode, setMode] = useState("exvat");             // คงไว้เพื่อฟอร์มเดียวกัน
  const [gran, setGran] = useState("month");

  // ตัวกรองสินค้า
  const [productName, setProductName] = useState("");
  const [productNo, setProductNo]     = useState("");

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
      // แปลงช่วงเดือน -> ช่วงวันที่ backend ใช้ (from รวม, to ไม่รวม)
      const [f2, t2] = clampRangeToYear(year, from || `${year}-01`, to || `${year}-12`);
      const fromISO = firstDayISO(f2);
      const toISO   = nextMonthISO(t2); // exclusive

      const params = new URLSearchParams();
      params.set("from", fromISO);
      params.set("to",   toISO);
      params.set("granularity", gran);

      // ส่ง filter สินค้า (name ก่อน, ไม่งั้นใช้ product_no)
      const pname = (override && override.productName != null ? override.productName : productName).trim();
      const pno   = (override && override.productNo   != null ? override.productNo   : productNo).trim();
      if (pname)  params.set("product_name", pname);
      else if (pno) params.set("product_no", pno);

      // ✅ เรียก endpoint R6
      const url = `${API_BASE}/api/reports/product-nonmovement?${params.toString()}`;
      const { data } = await axios.get(url, { withCredentials: true });
      setItems((data && data.items) || []);
    } finally {
      setLoading(false);
    }
  }

  // โหลดครั้งแรก
  useEffect(() => { fetchData(); }, []);

  // สรุปรวมท้ายตาราง: รวมคงเหลือ
  const totals = useMemo(() => {
    return items.reduce((a, r) => {
      a.available += toNum(r.available);
      return a;
    }, { available: 0 });
  }, [items]);

  return (
    <div className="container mt-4">
      <div className="row mt-2 mb-3">
        <div className="col">
          <h2 className="text-primary">🧊 Non-moving Products</h2>
          <div className="text-muted">แสดงเฉพาะสินค้าที่มีสต็อกและไม่มียอดจอง แต่ไม่มีความเคลื่อนไหวในช่วงเวลาที่กำหนด</div>
        </div>
      </div>

      {/* Toolbar: ใช้ฟอร์มเดียวกับหน้าเดิม */}
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

        <div className="col d-grid">
          <label className="form-label opacity-0">ค้นหา</label>
          <button className="btn btn-primary h-100 w-100" onClick={() => fetchData()}>
            แสดงข้อมูล
          </button>
        </div>
        <div className="col d-grid">
          <label className="form-label opacity-0">รีเซ็ต</label>
          <button
            className="btn btn-outline-secondary h-100 w-100"
            disabled={loading}
            onClick={() => {
              setProductName("");
              setProductNo("");
              // โหลดข้อมูล default ทันที
              fetchData({ productName: "", productNo: "" });
            }}
          >
            ลบคำค้นหา
          </button>
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
      </div>

      {/* ตารางผลลัพธ์ R6 */}
      <div className="table-responsive">
        <table className="table table-striped align-middle">
          <thead className="table-light">
            <tr>
              <th style={{width:"16%"}}>Product No.</th>
              <th>ชื่อสินค้า</th>
              <th style={{width:"12%", textAlign:"right"}}>คงเหลือ</th>
              <th style={{width:"20%"}}>ความเคลื่อนไหวล่าสุด</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4}>กำลังโหลด...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4}>ไม่พบข้อมูล</td></tr>
            ) : (
              items.map((r, i) => (
                <tr key={`${r.product_id}-${i}`}>
                  <td>{r.product_no || "-"}</td>
                  <td>{r.product_name || "-"}</td>
                  <td style={{textAlign:"right"}}>{fmt2(r.available)}</td>
                  <td>{(r.last_movement_at || r.last_sold_date || "").slice(0,10) || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="table-light">
            <tr>
              <th colSpan={2} style={{textAlign:"right"}}>รวมคงเหลือ</th>
              <th style={{textAlign:"right"}}>{fmt2(totals.available)}</th>
              <th></th>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
