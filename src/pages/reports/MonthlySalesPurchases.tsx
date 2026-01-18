import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE;

/* ---------- Helpers ---------- */
function toNum(x) { return typeof x === "number" ? x : parseFloat(x || "0"); }
function fmt2(n) { return toNum(n).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

// ---- helpers สำหรับจัดการช่วงเดือนให้อยู่ในปีที่เลือก ----
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
// ------------------------------------------------------------

export default function MonthlySalesPurchases() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // ตัวกรองหน้ารายงาน (เหมือนหน้ารายงานอื่น ๆ)
  const currentYear = String(new Date().getFullYear());
  const [year, setYear] = useState(currentYear);            // e.g. "2025"
  const [from, setFrom] = useState(`${currentYear}-01`);    // YYYY-MM
  const [to, setTo]     = useState(`${currentYear}-12`);
  const [mode, setMode] = useState("exvat");                // "exvat" | "vat" | "incvat"

  // เมื่อปีเปลี่ยน: คง "เดือนเดิม" แต่เปลี่ยนปี และบีบช่วงให้อยู่ในปีนั้น
  useEffect(() => {
    const f = sameYear(from, year, "01");
    const t = sameYear(to,   year, "12");
    const [f2, t2] = clampRangeToYear(year, f, t);
    setFrom(f2);
    setTo(t2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      // ส่งช่วงที่เลือก (แต่บีบให้อยู่ในปีที่เลือกเสมอ)
      const [f2, t2] = clampRangeToYear(
        year,
        from || `${year}-01`,
        to   || `${year}-12`
      );
      params.set("from", f2);
      params.set("to",   t2);

      const url = `${API_BASE}/api/reports/monthly-sales-purchases?${params.toString()}`;
      const { data } = await axios.get(url, { withCredentials: true });
      setRows(data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []); // โหลดครั้งแรก

  // รวมสรุปท้ายตาราง
  const totals = useMemo(() => {
    return rows.reduce((a, r) => {
      a.sales_exvat  += toNum(r.sales_exvat);
      a.sales_vat    += toNum(r.sales_vat);
      a.sales_incvat += toNum(r.sales_incvat);
      a.purch_exvat  += toNum(r.purch_exvat);
      a.purch_vat    += toNum(r.purch_vat);
      a.purch_incvat += toNum(r.purch_incvat);
      return a;
    }, { sales_exvat:0, sales_vat:0, sales_incvat:0, purch_exvat:0, purch_vat:0, purch_incvat:0 });
  }, [rows]);

  // map field ตาม mode ที่เลือก
  const colSales = mode === "exvat" ? "sales_exvat" : mode === "vat" ? "sales_vat" : "sales_incvat";
  const colPurch = mode === "exvat" ? "purch_exvat" : mode === "vat" ? "purch_vat" : "purch_incvat";
  const colLabel = mode === "exvat" ? "ไม่รวม VAT" : mode === "vat" ? "VAT" : "รวม VAT";

  return (
    <div className="container mt-4">
      {/* หัวรายงาน แบบเดียวกับหน้าอื่น */}
      <div className="row mt-2 mb-3">
        <div className="col">
          <h2 className="text-primary">📈 Monthly Sales & Purchases</h2>
        </div>
      </div>

      {/* Toolbar */}
      <div className="row row-cols-1 row-cols-md-5 g-2 align-items-stretch mb-3">
        {/* ✅ ตัวเลือกปี (default = ปีปัจจุบัน) */}
        <div className="col">
          <label className="form-label">ปี</label>
          <select
            className="form-select"
            value={year}
            onChange={(e)=>setYear(e.target.value)}
          >
            {Array.from({length: 11}, (_,i) => (new Date().getFullYear() + i)).map(y => (
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
          <label className="form-label">เลือกยอดรวม</label>
          <select
            className="form-select"
            value={mode}
            onChange={(e)=>setMode(e.target.value)}
          >
            <option value="exvat">ไม่รวม VAT</option>
            <option value="vat">VAT</option>
            <option value="incvat">รวม VAT</option>
          </select>
        </div>

        {/* ปุ่มสูงเท่าช่องอื่น */}
        <div className="col d-grid">
          <label className="form-label opacity-0">ดึงข้อมูล</label>
          <button className="btn btn-primary h-100 w-100" onClick={fetchData}>
            แสดงข้อมูล
          </button>
        </div>
      </div>

      {/* ตาราง */}
      <div className="table-responsive">
        <table className="table table-striped align-middle">
          <thead className="table-light">
            <tr>
              <th style={{width:"12%"}}>เดือน</th>
              <th style={{textAlign:"right"}}>ยอดขาย {colLabel}</th>
              <th style={{textAlign:"right"}}>ยอดซื้อ {colLabel}</th>
              <th style={{textAlign:"right"}}>ส่วนต่าง {colLabel}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4}>กำลังโหลด...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4}>ไม่พบข้อมูล</td></tr>
            ) : (
              rows.map((r) => {
                const sales = toNum(r[colSales]);
                const purch = toNum(r[colPurch]);
                const net   = sales - purch;
                return (
                  <tr key={r.month}>
                    <td>{r.month}</td>
                    <td style={{textAlign:"right"}}>{fmt2(sales)}</td>
                    <td style={{textAlign:"right"}}>{fmt2(purch)}</td>
                    <td style={{textAlign:"right"}}>{fmt2(net)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="table-light">
            <tr>
              <th style={{textAlign:"right"}}>รวม</th>
              <th style={{textAlign:"right"}}>{fmt2(totals[colSales])}</th>
              <th style={{textAlign:"right"}}>{fmt2(totals[colPurch])}</th>
              <th style={{textAlign:"right"}}>{fmt2(totals[colSales] - totals[colPurch])}</th>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
