import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

// const API_BASE = import.meta.env.VITE_API_BASE;

/* ---------- Helpers ---------- */
function toNum(x) {
  return typeof x === "number" ? x : parseFloat(x || "0");
}
function dateMsSafe(s) {
  if (!s) return Number.MAX_SAFE_INTEGER;
  const ten = String(s).slice(0, 10);
  if (ten === "0000-00-00") return Number.MAX_SAFE_INTEGER;
  const d = new Date(ten + "T00:00:00");
  return isNaN(d.getTime()) ? Number.MAX_SAFE_INTEGER : d.getTime();
}
function fmtDate(s) {
  if (!s) return "-";
  const ten = String(s).slice(0, 10);
  if (ten === "0000-00-00") return "-";
  const d = new Date(ten + "T00:00:00");
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("th-TH");
}

/** สถานะสรุประดับ SO */
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

export default function DeliveryProgressReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (onlyOpen) params.set("only_open", "1");
        const url = `/api/reports/delivery-progress?${params.toString()}`;
        const { data } = await axios.get(url);
        setRows(data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [onlyOpen]);

  // ค้นหา (ค้นจาก SO No. และชื่อลูกค้า ถ้ามี)
  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return rows;
    return rows.filter(r =>
      (r.sales_order_no || "").toLowerCase().includes(kw) ||
      (r.customer_no || "").toLowerCase().includes(kw) ||
      (r.customer_name || "").toLowerCase().includes(kw)
    );
  }, [rows, search]);

  // ✅ รวมเป็นระดับ SO
  const orders = useMemo(() => {
    const m = new Map();
    for (const r of filtered) {
      const soId = r.so_id;
      const remain = toNum(r.remaining_qty);
      const reserv = toNum(r.reserved_qty);

      if (!m.has(soId)) {
        m.set(soId, {
          so_id: soId,
          sales_order_no: r.sales_order_no,
          customer_no: r.customer_no || "-",
          customer_name: r.customer_name || "-",
          required_date: r.required_date,
          total_remaining: 0,
          total_reserved: 0,
          status: "",
        });
      }
      const o = m.get(soId);
      o.total_remaining += remain;
      o.total_reserved  += reserv;
      o.required_date = r.required_date; // ใช้ของ SO เดียวกัน
    }

    for (const o of m.values()) {
      o.status = badgeFrom(o.total_remaining, o.total_reserved, o.required_date);
    }

    // เรียง: สถานะ (แดง>ส้ม>เหลือง>เขียว), วันที่ต้องการ, SO No.
    const rank = (s) => s.startsWith("🔴") ? 0 : s.startsWith("🟠") ? 1 : s.startsWith("🟡") ? 2 : 3;
    return [...m.values()].sort((a, b) => {
      const r = rank(a.status) - rank(b.status);
      if (r !== 0) return r;
      const ad = dateMsSafe(a.required_date), bd = dateMsSafe(b.required_date);
      if (ad !== bd) return ad - bd;
      return (a.sales_order_no || "").localeCompare(b.sales_order_no || "");
    });
  }, [filtered]);

  return (
    <div className="container mt-4">
      <div className="row mt-2 mb-3">
        <div className="col">
          <h2 className="text-primary">🚚 Delivery Progress</h2>
        </div>
      </div>

      <div className="row g-2 align-items-center mb-3">
        <div className="col-md-10">
          <input
            className="form-control"
            placeholder="🔍 ค้นหา (SO No. / รหัสลูกค้า / ชื่อลูกค้า)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md-2 form-check">
          <input
            id="onlyOpen"
            className="form-check-input"
            type="checkbox"
            checked={onlyOpen}
            onChange={(e) => setOnlyOpen(e.target.checked)}
          />
          <label className="form-check-label ms-2" htmlFor="onlyOpen">
            แสดงเฉพาะที่ยังส่งไม่ครบ
          </label>
        </div>
      </div>

      {/* ตารางสรุปต่อ SO */}
      <div className="table-responsive">
        <table className="table table-striped align-middle">
          <thead className="table-light">
            <tr>
              <th style={{width:"16%"}}>SO No.</th>
              <th style={{width:"16%"}}>รหัสลูกค้า</th>
              <th>ชื่อลูกค้า</th>
              <th style={{width:"18%"}}>วันที่ต้องการ</th>
              <th style={{width:"16%"}}>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}>กำลังโหลด...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={5}>ไม่พบข้อมูล</td></tr>
            ) : (
              orders.map(o => {
                const rowClass =
                  o.status.startsWith("🔴") ? "table-danger" :
                  o.status.startsWith("🟠") ? "table-warning" : "";
                return (
                  <tr key={o.so_id} className={rowClass}>
                    <td>{o.sales_order_no}</td>
                    <td>{o.customer_no}</td>
                    <td>{o.customer_name}</td>
                    <td>{fmtDate(o.required_date)}</td>
                    <td title={`ค้างส่งรวม ${o.total_remaining.toFixed(3)} | จองแล้ว ${o.total_reserved.toFixed(3)}`}>
                      {o.status}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
