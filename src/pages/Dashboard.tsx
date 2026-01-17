import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

/* ---------- Charts ---------- */
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement, 
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Title as ChartTitle,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Bar } from "react-chartjs-2"; 
import { Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,                
  ChartTooltip,
  ChartLegend,
  ChartTitle
);

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

/* ---------- Helpers ---------- */
const toNum = (x) => (typeof x === "number" ? x : parseFloat(x || "0"));
const fmt2  = (n) => toNum(n).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const today = new Date();
const yyyy = today.getFullYear();
const mm = today.getMonth() + 1;
const currentYM = `${yyyy}-${String(mm).padStart(2, "0")}`;
const pad2 = (n) => String(n).padStart(2, "0");

function threeMonthsWindow() {
  const d = new Date(); d.setDate(1);
  const end = new Date(d.getFullYear(), d.getMonth()+1, 1); // exclusive
  const start = new Date(d.getFullYear(), d.getMonth()-2, 1);
  return {
    from: `${start.getFullYear()}-${pad2(start.getMonth()+1)}-01`,
    to:   `${end.getFullYear()}-${pad2(end.getMonth()+1)}-01`,
  };
}
function safeDateMs(s) {
  if (!s) return Number.MAX_SAFE_INTEGER;
  const ten = String(s).slice(0,10);
  if (ten === "0000-00-00") return Number.MAX_SAFE_INTEGER;
  const t = new Date(ten+"T00:00:00").getTime();
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
}
function thMonthShort(ym) {
  const [y, m] = String(ym).split("-");
  const d = new Date(Number(y), Number(m)-1, 1);
  return d.toLocaleDateString("th-TH", { month: "short" });
}

function monthsFromJanToCurrent(y, m) {
  const out = [];
  for (let i = 1; i <= m; i++) {
    out.push(`${y}-${String(i).padStart(2,"0")}`);
  }
  return out;
}

function lastNMonthsYMs(n) {
  const arr = [];
  const d = new Date(); d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const t = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const ym = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
    arr.push(ym);
  }
  return arr; // เช่น ["2025-08","2025-09","2025-10"]
}



/* ---------- Component ---------- */
export default function Dashboard() {
  const nav = useNavigate();

  // R2
  const [stock, setStock] = useState(null);
  const [loadingR2, setLoadingR2] = useState(false);
  const [r2View, setR2View] = useState("data");

  // R3
  const [delivery, setDelivery] = useState(null);
  const [loadingR3, setLoadingR3] = useState(false);
  const [deliveryAll, setDeliveryAll] = useState(null);
  const [loadingR3All, setLoadingR3All] = useState(false);
  const [r3View, setR3View] = useState("data");

  // R4
  const [monthly, setMonthly] = useState(null);
  const [loadingR4, setLoadingR4] = useState(false);
  // โหมดช่วงเวลา: month | year (default = month)
  const [r4Mode, setR4Mode] = useState("month");
  // โหมดมุมมอง: data | chart (default = data)
  const [r4View, setR4View] = useState("data");

  // R5
  const [r5items, setR5Items] = useState(null);
  const [loadingR5, setLoadingR5] = useState(false);
  const [r5View, setR5View] = useState("table"); 
  const [r5TopN, setR5TopN] = useState(5);
  const fmt0 = (n) =>
    toNum(n).toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  /* ---- fetch R2 ---- */
  useEffect(() => {
    (async () => {
      try {
        setLoadingR2(true);
        const url = `${API_BASE}/api/reports/stock-balance`;
        const { data } = await axios.get(url, { withCredentials: true });
        setStock(data || []);
      } finally { setLoadingR2(false); }
    })();
  }, []);

  /* ---- fetch R3 (only_open=1) ---- */
  useEffect(() => {
    (async () => {
      try {
        setLoadingR3(true);
        const url = `${API_BASE}/api/reports/delivery-progress?only_open=1`;
        const { data } = await axios.get(url, { withCredentials: true });
        setDelivery(data || []);
      } finally { setLoadingR3(false); }
    })();
  }, []);


  useEffect(() => {
    (async () => {
      try {
        setLoadingR3All(true);
        const url = `${API_BASE}/api/reports/delivery-progress?only_open=0`;
        const { data } = await axios.get(url, { withCredentials: true });
        setDeliveryAll(Array.isArray(data) ? data : []);
      } finally { setLoadingR3All(false); }
    })();
  }, []);




  /* ---- fetch R4 (ทั้งปีนี้) ---- */
  useEffect(() => {
    (async () => {
      try {
        setLoadingR4(true);
        const params = new URLSearchParams();
        params.set("from", `${yyyy}-01`);
        params.set("to",   `${yyyy}-12`);
        const url = `${API_BASE}/api/reports/monthly-sales-purchases?${params.toString()}`;
        const { data } = await axios.get(url, { withCredentials: true });
        setMonthly(Array.isArray(data) ? data : (data && data.result) || []);
      } finally { setLoadingR4(false); }
    })();
  }, []);

  /* ---- fetch R5 (3 เดือนล่าสุด) ---- */
  useEffect(() => {
    (async () => {
      try {
        setLoadingR5(true);
        const { from, to } = threeMonthsWindow();
        const params = new URLSearchParams();
        params.set("from", from);
        params.set("to",   to);
        params.set("granularity", "month");
        const url = `${API_BASE}/api/reports/product-sales?${params.toString()}`;
        const { data } = await axios.get(url, { withCredentials: true });
        setR5Items((data && data.items) || []);
      } finally { setLoadingR5(false); }
    })();
  }, []);

  /* ---------- R2 summary ---------- */
  const riskRank = (r) => {
    const available = toNum(r.available);
    const rop       = toNum(r.reorder_point);
    const stock     = toNum(r.stock);
    const reserved  = toNum(r.reserved);
    if (available < rop) return "RED";                 // 🔴 ต้องสั่ง
    const ratio = stock > 0 ? reserved / stock : 0;
    if (ratio >= 0.4) return "ORANGE";                 // 🟠 ระวัง
    return "GREEN";                                    // 🟢 ปกติ
  };

  const r2 = useMemo(() => {
    if (!stock) return null;
    let red = 0, orange = 0, green = 0;
    for (const r of stock) {
      const k = riskRank(r);
      if (k === "RED") red++;
      else if (k === "ORANGE") orange++;
      else green++;
    }
    return { red, orange, green, total: stock.length };
  }, [stock]);


  const r2Bar = useMemo(() => {
    if (!r2) return null;
    const labels = ["🔴 ต้องสั่ง", "🟠 ระวัง", "🟢 ปกติ"];
    const counts = [r2.red, r2.orange, r2.green];
    const total = counts.reduce((a, b) => a + b, 0);

    return {
      total,
      data: {
        labels,
        datasets: [
          {
            label: "รายการ",
            data: counts,
            backgroundColor: ["#ef4444", "#f97316", "#22c55e"],
            borderColor: ["#ef4444", "#f97316", "#22c55e"],
            borderWidth: 1,
          },
        ],
      },
    };
  }, [r2]);

  const r2BarOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",                 // ← แนวนอน
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed.x ?? 0;
            const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = sum ? Math.round((v * 100) / sum) : 0;
            return `${v.toLocaleString("th-TH")} รายการ (${pct}%)`;
          },
        },
      },
    },
    scales: {
      x: {
      title: { display: true, text: "จำนวน (รายการ)" },  // ← ชื่อแกน
      ticks: { callback: (val) => Number(val).toLocaleString("th-TH") },
      beginAtZero: true,
      precision: 0,
    },
    },
  }), []);

  /* ---------- R3 summary (aggregate by SO) ---------- */
  function dateMsSafe(s) {
    if (!s) return Number.MAX_SAFE_INTEGER;
    const ten = String(s).slice(0, 10);
    if (ten === "0000-00-00") return Number.MAX_SAFE_INTEGER;
    const d = new Date(ten + "T00:00:00");
    return isNaN(d.getTime()) ? Number.MAX_SAFE_INTEGER : d.getTime();
  }
  // สถานะสรุประดับ SO (เหมือนหน้า Report)
  function badgeFrom(totalRemaining, totalReserved, requiredDate) {
    const today = new Date(); today.setHours(0,0,0,0);
    if (totalRemaining <= 0) return "✅ ส่งครบแล้ว";
    const dueMs = dateMsSafe(requiredDate);
    if (dueMs !== Number.MAX_SAFE_INTEGER) {
      const diffDays = Math.ceil((dueMs - today.getTime()) / 86400000);
      if (diffDays < 0) return "🔴 เกินกำหนด";
      if (diffDays <= 3) return "🟠 ใกล้กำหนด";
    } else {
      return "🟠 ไม่มีวันที่ต้องการ";
    }
    if (totalReserved <= 0) return "🟠 ยังไม่จอง";
    return "🟡 รอส่ง";
  }

  const r3 = useMemo(() => {
    if (!delivery) return null;

    // รวมระดับ SO
    const map = new Map();
    for (const it of delivery) {
      const id = it.so_id;
      if (!map.has(id)) {
        map.set(id, {
          so_id: id,
          sales_order_no: it.sales_order_no,
          required_date: it.required_date,
          total_remaining: 0,
          total_reserved: 0,
          statusText: "",
        });
      }
      const agg = map.get(id);
      agg.total_remaining += toNum(it.remaining_qty);
      agg.total_reserved  += toNum(it.reserved_qty);
      // ใช้ required_date ที่เร็วที่สุด
      const cur = dateMsSafe(agg.required_date);
      const nxt = dateMsSafe(it.required_date);
      if (nxt < cur) agg.required_date = it.required_date;
    }

    // คำนวณสถานะ
    for (const a of map.values()) {
      a.statusText = badgeFrom(a.total_remaining, a.total_reserved, a.required_date);
    }

    // จัดอันดับแบบเดียวกับ Report
    const rank = (s) => s.startsWith("🔴") ? 0 : s.startsWith("🟠") ? 1 : s.startsWith("🟡") ? 2 : 3;

    const top = [...map.values()]
      .sort((a, b) => {
        const r = rank(a.statusText) - rank(b.statusText);
        if (r !== 0) return r;
        const ad = dateMsSafe(a.required_date), bd = dateMsSafe(b.required_date);
        if (ad !== bd) return ad - bd;
        return (a.sales_order_no || "").localeCompare(b.sales_order_no || "");
      })
      .slice(0, 5);

    return { top };
  }, [delivery]);


  const r3Pie = useMemo(() => {
    if (!Array.isArray(deliveryAll)) return null;

    // รวมระดับ SO
    const map = new Map();
    for (const it of deliveryAll) {
      const id = it.so_id;
      if (!map.has(id)) {
        map.set(id, {
          required_date: it.required_date,
          total_remaining: 0,
          total_reserved: 0,
        });
      }
      const agg = map.get(id);
      agg.total_remaining += toNum(it.remaining_qty);
      agg.total_reserved  += toNum(it.reserved_qty);

      const cur = safeDateMs(agg.required_date);
      const nxt = safeDateMs(it.required_date);
      if (nxt < cur) agg.required_date = it.required_date;
    }

    // กลุ่มตามที่คุยกัน: ✅ ส่งครบแล้ว, 🟡 รอส่ง, 🟠 (ยังไม่จอง/ใกล้กำหนด/ไม่มีวันที่ต้องการ), 🔴 เกินกำหนด
    let done = 0, wait = 0, warn = 0, late = 0;
    for (const a of map.values()) {
      const t = badgeFrom(a.total_remaining, a.total_reserved, a.required_date);
      if (t.startsWith("✅")) done++;
      else if (t.startsWith("🟡")) wait++;
      else if (t.startsWith("🔴")) late++;
      else warn++; // 🟠
    }

    const labels = ["ส่งครบแล้ว", "รอส่ง", "ต้องระวัง", "เกินกำหนด"];
    const counts = [done, wait, warn, late];
    const total = counts.reduce((a,b)=>a+b, 0);
    const colors = ["#22c55e", "#eab308", "#f97316", "#ef4444"];

    return {
      total,
      chartData: {
        labels,
        datasets: [{
          data: counts,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1,
        }]
      }
    };
  }, [deliveryAll]);

  const r3PieOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 10 },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed || 0;
            const sum = ctx.dataset.data.reduce((a,b)=>a+b,0);
            const pct = sum ? Math.round((v*100)/sum) : 0;
            return `${ctx.label}: ${v.toLocaleString("th-TH")} (${pct}%)`;
          }
        }
      }
    }
  }), []);





  /* ---------- R4: month vs year (ตัวเลขด้านซ้ายดีฟอลต์) ---------- */
  const r4Month = useMemo(() => {
    if (!monthly) return null;
    const row = monthly.find?.(m => m.month === currentYM);
    const sales = toNum(row?.sales_incvat || 0);
    const purch = toNum(row?.purch_incvat || 0);
    return { sales, purch, net: sales - purch };
  }, [monthly]);

  const r4Year = useMemo(() => {
    if (!monthly) return null;
    const tot = monthly.reduce((a, r) => {
      a.sales += toNum(r.sales_incvat);
      a.purch += toNum(r.purch_incvat);
      return a;
    }, { sales:0, purch:0 });
    return { sales: tot.sales, purch: tot.purch, net: tot.sales - tot.purch };
  }, [monthly]);

  const r4Selected = r4Mode === "month" ? r4Month : r4Year;

  /* ---------- R4: ข้อมูลสำหรับ Line Chart ---------- */
  // ป้ายกำกับแกน X
  const r4Labels = useMemo(() => {
    const fullYear = monthsFromJanToCurrent(yyyy, mm); // ["2025-01", ..., "2025-10"]
    if (r4Mode === "year") return fullYear;            // ม.ค. → เดือนปัจจุบัน
    return [currentYM];                                // เดือนนี้ = เดือนเดียว (ให้สอดคล้องกับตัวเลขด้านซ้าย)
  }, [r4Mode]);

  // ---- datasets ของกราฟ (เดือนไหนไม่มีข้อมูล ให้เป็น 0) ----
  const r4LineData = useMemo(() => {
    if (!monthly || r4Labels.length === 0) return null;
    const byYM = new Map(monthly.map(m => [m.month, m]));

    const sales = r4Labels.map(ym => toNum(byYM.get(ym)?.sales_incvat || 0));
    const purch = r4Labels.map(ym => toNum(byYM.get(ym)?.purch_incvat || 0));

    return {
      labels: r4Labels.map(thMonthShort),
      datasets: [
        {
          label: "Sales",
          data: sales,
          borderColor: "#2563eb",
          backgroundColor: "#2563eb",        // ⬅️ ให้ legend เป็นจุดสีทึบ
          tension: 0.25,
          pointRadius: 4,
          pointStyle: "circle",
        },
        {
          label: "Purchases",
          data: purch,
          borderColor: "#16a34a",
          backgroundColor: "#16a34a",        // ⬅️ ให้ legend เป็นจุดสีทึบ
          tension: 0.25,
          pointRadius: 4,
          pointStyle: "circle",
        },
      ],
    };
  }, [monthly, r4Labels]);

  const r4LineOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,     // ✅ ให้เป็นวงกลม
          pointStyle: "circle",
          boxWidth: 10,
        },
      },
//      title: { display: true, text: "Sales vs Purchases" },
      title: { display: false }, 
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed.y ?? 0;
            return `${ctx.dataset.label}: ${toNum(v).toLocaleString("th-TH", {
              minimumFractionDigits: 2, maximumFractionDigits: 2
            })} บาท`;
          }
        }
      }
    },
    scales: {
    y: {
      title: { display: true, text: "บาท" },   // ← เพิ่มชื่อแกน Y
      ticks: { callback: (val) => toNum(val).toLocaleString("th-TH") }
    },
    x: { title: { display: false } }
  }
  }), []);

  /* ---------- R5 summary (last 3 months top products by qty/amount) ---------- */
  const [r5Mode, setR5Mode] = useState("qty"); // "qty" | "amount"

  const r5 = useMemo(() => {
    if (!r5items) return null;
    const byProd = new Map();
    for (const it of r5items) {
      const cur = byProd.get(it.product_id) || {
        product_id: it.product_id,
        product_name: it.product_name,
        qty: 0,
        amount_incvat: 0,
      };
      cur.qty += toNum(it.qty);
      cur.amount_incvat += toNum(it.sales_incvat || 0);
      byProd.set(it.product_id, cur);
    }
    const metric = r5Mode === "amount" ? "amount_incvat" : "qty";
    const top = [...byProd.values()]
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 5);
    return { top, metric };
  }, [r5items, r5Mode]);


  // ===== R5: Bar chart data (3 เดือนล่าสุด) =====
  const r5Bar = useMemo(() => {
    if (!Array.isArray(r5items) || r5items.length === 0) return null;

    const months = lastNMonthsYMs(3); // ["YYYY-MM","YYYY-MM","YYYY-MM"]
    const keyName = r5Mode === "amount" ? "sales_incvat" : "qty";

    // รวมยอดต่อ product ต่อเดือน
    const byProd = new Map();
    for (const it of r5items) {
      const ym = String(it.period || "").slice(0, 7); // period จาก API เป็นตาม granularity=month
      if (!months.includes(ym)) continue;

      const cur = byProd.get(it.product_id) || {
        product_id: it.product_id,
        product_name: it.product_name || it.product_no || `ID#${it.product_id}`,
        byMonth: new Map(months.map(m => [m, 0])), // เตรียมค่า 0 ทุกเดือน
        total: 0,
      };
      const val = toNum(it[keyName] || 0);
      cur.byMonth.set(ym, toNum(cur.byMonth.get(ym) || 0) + val);
      cur.total += val;
      byProd.set(it.product_id, cur);
    }

    // เลือก Top N ตามยอดรวม 3 เดือน
    const topProds = [...byProd.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, r5TopN);

    // เตรียม datasets (legend = ชื่อสินค้า)
    const datasets = topProds.map((p, idx) => ({
      label: p.product_name,
      data: months.map(m => toNum(p.byMonth.get(m) || 0)),
      borderWidth: 1,
      backgroundColor: `hsl(${(idx * 57) % 360} 65% 45%)`,      // สีต่างกันอัตโนมัติ
      borderColor: `hsl(${(idx * 57) % 360} 65% 35%)`,
    }));

    return {
      data: {
        labels: months.map(thMonthShort),
        datasets,
      },
      months,
      unitText: r5Mode === "amount" ? "บาท" : "หน่วย",
    };
  }, [r5items, r5Mode, r5TopN]);

  const r5BarOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 10 },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed.y ?? 0;
            const num = r5Mode === "amount" ? fmt2(v) : fmt0(v);
            return `${ctx.dataset.label}: ${num}`;
          }
        }
      }
    },
    scales: {
      y: {
      title: { display: true, text: r5Mode === "amount" ? "บาท" : "หน่วย" }, // ← ชื่อแกนตามโหมด
      ticks: { callback: (val) => (r5Mode === "amount" ? fmt2(val) : fmt0(val)) }
    },
    }
  }), [r5Mode]);




  return (
    <div className="container mt-4">
      <h1 className="text-primary">📊 Dashboard Overview</h1>

      {/* แถวบน: Sales vs Purchases + Stock Summary */}
      <div className="row row-cols-1 row-cols-lg-2 g-3 align-items-stretch mb-4">
        {/* Card: Sales vs Purchases */}
        <div className="col d-flex">
          <div className="card shadow w-100 h-100">
            <div className="card-body d-flex flex-column">
              {/* แถวหัวการ์ด: ซ้าย=ข้อมูล/กราฟ, ขว=เดือนนี้/ปีนี้ */}
              <div className="d-flex justify-content-between align-items-center">
                <div className="btn-group btn-group-sm" role="group" aria-label="r4-view">
                  <button
                    className={`btn btn-${r4View==='data' ? 'primary' : 'outline-primary'}`}
                    onClick={()=>setR4View('data')}
                    type="button"
                  >
                    ข้อมูล
                  </button>
                  <button
                    className={`btn btn-${r4View==='chart' ? 'primary' : 'outline-primary'}`}
                    onClick={()=>setR4View('chart')}
                    type="button"
                  >
                    กราฟ
                  </button>
                </div>

                <h5 className="card-title mb-0">📈 Sales vs Purchases</h5>

                {/* โหมดช่วงเวลา: เดือนนี้ / ปีนี้ */}
                <div className="btn-group btn-group-sm" role="group" aria-label="r4-mode">
                  <button
                    className={`btn btn-${r4Mode==='month' ? 'primary' : 'outline-primary'}`}
                    onClick={()=>setR4Mode('month')}
                    type="button"
                  >
                    เดือนนี้
                  </button>
                  <button
                    className={`btn btn-${r4Mode==='year' ? 'primary' : 'outline-primary'}`}
                    onClick={()=>setR4Mode('year')}
                    type="button"
                  >
                    ปีนี้
                  </button>
                </div>
              </div>

              {/* คำอธิบายช่วง */}
              <div className="text-muted mt-1">
                {r4Mode === 'month'
                  ? `ช่วง: ${today.toLocaleDateString('th-TH', { month:'long', year:'numeric' })}`
                  : `ช่วง: ปี ${yyyy}`}
              </div>

              {loadingR4 ? (
                <div className="mt-3">กำลังโหลด...</div>
              ) : (
                <>
                  {r4View === "data" ? (
                    r4Selected ? (
                      <>
                        <ul className="mb-3 mt-3">
                          <li>ยอดขาย: <strong>{fmt2(r4Selected.sales)}</strong> บาท</li>
                          <li>ยอดซื้อ: <strong>{fmt2(r4Selected.purch)}</strong> บาท</li>
                          <li>สุทธิ: <strong>{fmt2(r4Selected.net)}</strong> บาท</li>
                        </ul>
                      </>
                    ) : <div className="mt-3">—</div>
                  ) : (
                    r4LineData && r4LineData.labels.length > 0 ? (
                      <div style={{ height: 260 }} className="mt-3">
                        {/* ✅ key จะเปลี่ยนเมื่อสลับ month/year หรือ data/chart ทำให้กราฟ re-render */}
                        <Line key={`${r4Mode}-${r4View}-${r4LineData.labels.join(",")}`} data={r4LineData} options={r4LineOptions} />
                      </div>
                    ) : <div className="mt-3">—</div>
                  )}

                  <div className="mt-auto pt-2">
                    <button
                      className="btn btn-primary w-100"
                      onClick={()=>nav("/reports/monthly-sales-purchases")}
                    >
                      📜 ดูรายละเอียดทั้งหมด
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Card: Stock Summary (เดิม) */}
        <div className="col d-flex">
          <div className="card shadow w-100 h-100">
            <div className="card-body d-flex flex-column">
              {/* แถวหัว: ซ้าย=ข้อมูล/กราฟ, กลาง=ชื่อการ์ด */}
              <div className="d-flex justify-content-between align-items-center">
                <div className="btn-group btn-group-sm" role="group" aria-label="r2-view">
                  <button
                    type="button"
                    className={`btn btn-${r2View === "data" ? "primary" : "outline-primary"}`}
                    onClick={() => setR2View("data")}
                  >
                    ข้อมูล
                  </button>
                  <button
                    type="button"
                    className={`btn btn-${r2View === "chart" ? "primary" : "outline-primary"}`}
                    onClick={() => setR2View("chart")}
                  >
                    กราฟ
                  </button>
                </div>

                <h5 className="card-title mb-0">📦 Stock Summary</h5>

                {/* เว้นที่ด้านขวาให้สมดุล (ถ้าอยากวางปุ่มอื่นค่อยเติมทีหลัง) */}
                <div style={{ width: 90 }} />
              </div>

              {loadingR2 ? (
                <div className="mt-3">กำลังโหลด...</div>
              ) : !r2 ? (
                <div className="mt-3">—</div>
              ) : (
                <>
                  {r2View === "data" ? (
                    <>
                      <ul className="mb-3 mt-3">
                        <li>🔴 ต้องสั่ง: <strong>{r2.red}</strong> รายการ</li>
                        <li>🟠 ระวัง: <strong>{r2.orange}</strong> รายการ</li>
                        <li>🟢 ปกติ: <strong>{r2.green}</strong> รายการ</li>
                      </ul>
                    </>
                  ) : (
                    r2Bar && (
                      <div style={{ height: 220 }} className="mt-3">
                        <Bar
                          key={`r2-${r2.red}-${r2.orange}-${r2.green}`}
                          data={r2Bar.data}
                          options={r2BarOptions}
                        />
                      </div>
                    )
                  )}

                  <div className="mt-auto pt-2">
                    <button
                      className="btn btn-primary w-100"
                      onClick={() => nav("/reports/stock-balance")}
                    >
                      📜 ดูรายละเอียดทั้งหมด
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* แถวถัดมา: SO ค้างส่ง (Top 5) + ยอดขาย 3 เดือนล่าสุด */}
      <div className="row row-cols-1 row-cols-lg-2 g-3 align-items-stretch mb-5">
        {/* Card: SO ค้างส่ง (Top 5) — เพิ่มปุ่ม ข้อมูล/กราฟ + คงตารางเดิม */}
        <div className="col d-flex">
          <div className="card shadow w-100 h-100">
            <div className="card-body d-flex flex-column">
              {/* แถวหัว: ปุ่มซ้าย/ขวาเหมือนการ์ดอื่น */}
              <div className="d-flex justify-content-between align-items-center">
                <div className="btn-group btn-group-sm" role="group" aria-label="r3-view">
                  <button
                    type="button"
                    className={`btn btn-${r3View==='data' ? 'primary' : 'outline-primary'}`}
                    onClick={()=>setR3View('data')}
                  >ข้อมูล</button>
                  <button
                    type="button"
                    className={`btn btn-${r3View==='chart' ? 'primary' : 'outline-primary'}`}
                    onClick={()=>setR3View('chart')}
                  >กราฟ</button>
                </div>

                <h5 className="card-title mb-0">🚚 SO ค้างส่ง</h5>

                {/* เว้นพื้นที่ให้สมดุลฝั่งขวา (เหมือน R4) */}
                <div style={{ width: 120 }} />
              </div>

              {/* เนื้อหา */}
              {(loadingR3 && r3View==='data') || (loadingR3All && r3View==='chart') ? (
                <div className="mt-3">กำลังโหลด...</div>
              ) : (
                <>
                  {r3View === "data" ? (
                    r3 ? (
                      <>
                        {/* ✅ ตารางเดิม เก็บไว้เหมือนเดิมทุกอย่าง */}
                        <table className="table mb-3 mt-3">
                          <thead>
                            <tr>
                              <th style={{width:"28%"}}>SO No.</th>
                              <th style={{width:"28%"}}>Required</th>
                              <th>สถานะ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r3.top.length === 0 ? (
                              <tr><td colSpan={3}>ไม่พบรายการค้างส่ง</td></tr>
                            ) : r3.top.map((r) => (
                              <tr key={r.so_id}>
                                <td>{r.sales_order_no}</td>
                                <td>{safeDateMs(r.required_date)===Number.MAX_SAFE_INTEGER ? "-" :
                                    new Date(String(r.required_date).slice(0,10)+"T00:00:00").toLocaleDateString("th-TH")}</td>
                                <td>{r.statusText}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    ) : <div className="mt-3">—</div>
                  ) : (
                    r3Pie && r3Pie.total >= 0 ? (
                      <div style={{ height: 280 }} className="mt-3">
                        <Doughnut data={r3Pie.chartData} options={r3PieOptions} />
                      </div>
                    ) : <div className="mt-3">—</div>
                  )}
                </>
              )}

              {/* ปุ่มล่าง: คงเดิม แสดงเสมอ */}
              <div className="mt-auto pt-2">
                <button className="btn btn-primary w-100" onClick={()=>nav("/reports/delivery-progress")}>
                  📜 ดูรายละเอียดทั้งหมด
                </button>
              </div>
            </div>
          </div>
        </div>


        {/* Card: ยอดขายสินค้า 3 เดือนล่าสุด */}
        <div className="col d-flex">
          <div className="card shadow w-100 h-100">
            <div className="card-body d-flex flex-column">
              

              {/* แถวปุ่ม: ตาราง/กราฟ , จำนวน/มูลค่าขาย , Top 5 */}
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                              

                {/* ตาราง / กราฟ */}
                <div className="btn-group btn-group-sm" role="group" aria-label="r5-view">
                  <button
                    type="button"
                    className={`btn btn-${r5View==='table' ? 'primary' : 'outline-primary'}`}
                    onClick={()=>setR5View('table')}
                  >ข้อมูล</button>
                  <button
                    type="button"
                    className={`btn btn-${r5View==='chart' ? 'primary' : 'outline-primary'}`}
                    onClick={()=>setR5View('chart')}
                  >กราฟ</button>
                </div>

                {/* Top N */}
                <select
                  className="form-select form-select-sm"
                  style={{ width: 65 }}
                  value={r5TopN}
                  onChange={(e)=>setR5TopN(Number(e.target.value))}
                  title="จำนวนสินค้าในกราฟ"
                >
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                </select>

                <h5 className="card-title mb-0 flex-grow-1 text-center">
                   📦 ยอดขายสินค้า 3 เดือนล่าสุด
                </h5>


                {/* จำนวน / มูลค่าขาย */}
                <div className="btn-group btn-group-sm ms-auto" role="group" aria-label="r5-mode">
                  <button
                    type="button"
                    className={`btn btn-${r5Mode==='qty' ? 'primary' : 'outline-primary'}`}
                    onClick={()=>setR5Mode('qty')}
                  >จำนวน</button>
                  <button
                    type="button"
                    className={`btn btn-${r5Mode==='amount' ? 'primary' : 'outline-primary'}`}
                    onClick={()=>setR5Mode('amount')}
                  >มูลค่าขาย</button>
                </div>



              </div>

              {/* เนื้อหา: ตารางหรือกราฟ */}
              {loadingR5 ? (
                <div className="mt-3">กำลังโหลด...</div>
              ) : r5View === "table" ? (
                r5 ? (
                  <table className="table mb-3 mt-2">
                    <thead>
                      <tr>
                        <th>ชื่อสินค้า</th>
                        <th style={{width:"24%", textAlign:"right"}}>
                          {r5.metric === "amount_incvat" ? "Sales (บาท)" : "Units"}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {r5.top.length === 0 ? (
                        <tr><td colSpan={2}>ไม่พบข้อมูล</td></tr>
                      ) : r5.top.map(p => (
                        <tr key={p.product_id}>
                          <td>{p.product_name || "-"}</td>
                          <td style={{textAlign:"right"}}>
                            {r5.metric === "amount_incvat" ? fmt2(p.amount_incvat) : fmt0(p.qty)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <div className="mt-3">—</div>
              ) : (
                r5Bar && r5Bar.data?.datasets?.length > 0 ? (
                  <div style={{ height: 300 }} className="mt-2">
                    <Bar
                      key={`r5-${r5Mode}-${r5TopN}-${r5Bar.data.labels.join(",")}`}
                      data={r5Bar.data}
                      options={r5BarOptions}
                    />
                  </div>
                ) : <div className="mt-3">—</div>
              )}

              {/* ปุ่มล่าง: แสดงเสมอทั้งตารางและกราฟ */}
              <div className="mt-auto pt-2">
                <button className="btn btn-primary w-100" onClick={()=>nav("/reports/product-sales")}>
                  📜 ดูรายละเอียดทั้งหมด
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
