import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE;

/** เรียก API ครั้งเดียว แล้วกรอง/เรียงบนหน้าให้หมด เพื่อให้พฤติกรรมเหมือนหน้าส่วนอื่น */
async function loadAll() {
  const url = `${API_BASE}/api/reports/stock-balance`; // ไม่ส่งพารามิเตอร์แล้ว
  const { data } = await axios.get(url, { withCredentials: true });
  return data;
}

const riskRank = (r) => {
  if (r.available < r.reorder_point) return 0;                // 🔴 ต้องสั่ง
  const ratio = r.stock > 0 ? r.reserved / r.stock : 0;
  if (ratio >= 0.4) return 1;                                 // 🟠 ระวัง
  return 2;                                                   // 🟢 ปกติ
};

const statusText = (r) => {
  const rr = riskRank(r);
  if (rr === 0) return "🔴 ต้องสั่ง";
  if (rr === 1) return "🟠 ระวัง";
  return "🟢 ปกติ";
};

export default function StockBalanceReport() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");     // พิมพ์แล้วกรองทันที
  const [lowOnly, setLowOnly] = useState(false);
  const [sort, setSort] = useState("risk_default");
  const [loading, setLoading] = useState(false);
  const [sp] = useSearchParams();

  useEffect(() => {
    const firstLow = sp.get("low_only");
    if (firstLow === "1") setLowOnly(true);
    (async () => {
      setLoading(true);
      try {
        const data = await loadAll();
        setRows(data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** กรองตาม search & lowOnly แบบ client-side */
  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (lowOnly && !(r.available < r.reorder_point)) return false;
      if (!kw) return true;
      return (
        (r.product_no || "").toLowerCase().includes(kw) ||
        (r.product_name || "").toLowerCase().includes(kw)
      );
    });
  }, [rows, search, lowOnly]);

  /** เรียงลำดับบนหน้า */
  const list = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      if (sort === "risk_default") {
        const ra = riskRank(a) - riskRank(b);
        if (ra !== 0) return ra;                                // 🔴→🟠→🟢
        if (a.available !== b.available) return a.available - b.available;
        return (a.product_no || "").localeCompare(b.product_no || "");
      }
      if (sort === "available_asc") return a.available - b.available;
      if (sort === "available_desc") return b.available - a.available;
      if (sort === "product_no_asc") return (a.product_no || "").localeCompare(b.product_no || "");
      if (sort === "product_no_desc") return (b.product_no || "").localeCompare(a.product_no || "");
      if (sort === "product_name_asc") return (a.product_name || "").localeCompare(b.product_name || "");
      if (sort === "product_name_desc") return (b.product_name || "").localeCompare(a.product_name || "");
      return 0;
    });
    return arr;
  }, [filtered, sort]);

  return (
    <div className="container mt-4">
      <h2 className="text-primary">📑 Stock Balance Report</h2>

      <div className="row g-2 align-items-center mb-3">
        <div className="col-md-7">
          <input
            className="form-control"
            placeholder="🔍 ค้นหา (รหัส/ชื่อสินค้า)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md-2 form-check">
          <input
            id="lowOnly"
            className="form-check-input"
            type="checkbox"
            checked={lowOnly}
            onChange={(e) => setLowOnly(e.target.checked)}
          />
          <label className="form-check-label ms-2" htmlFor="lowOnly">
            แสดงเฉพาะที่ต้องสั่ง 
          </label>
        </div>
        <div className="col-md-3">
          <select
            className="form-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="risk_default">เรียงความเสี่ยง (🔴→🟠→🟢)</option>
            <option value="available_asc">เรียง available น้อย→มาก</option>
            <option value="available_desc">เรียง available มาก→น้อย</option>
            <option value="product_no_asc">รหัสสินค้า A→Z</option>
            <option value="product_no_desc">รหัสสินค้า Z→A</option>
            <option value="product_name_asc">ชื่อสินค้า A→Z</option>
            <option value="product_name_desc">ชื่อสินค้า Z→A</option>
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-striped align-middle">
          <thead className="table-light">
            <tr>
              <th style={{ width: "15%" }}>รหัสสินค้า</th>
              <th>ชื่อสินค้า</th>
              <th style={{ width: "10%", textAlign: "right" }}>Stock</th>
              <th style={{ width: "10%", textAlign: "right" }}>Reserved</th>
              <th style={{ width: "10%", textAlign: "right" }}>Available</th>
              <th style={{ width: "12%", textAlign: "right" }}>ROP</th>
              <th style={{ width: "10%" }}>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}>กำลังโหลด...</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={7}>ไม่พบข้อมูล</td></tr>
            ) : (
              list.map((r) => {
                const st = statusText(r);
                const rowClass =
                  st.startsWith("🔴") ? "table-danger" :
                  st.startsWith("🟠") ? "table-warning" : "";
                return (
                  <tr key={r.product_no} className={rowClass}>
                    <td>{r.product_no}</td>
                    <td>{r.product_name}</td>
                    <td style={{ textAlign: "right" }}>{r.stock}</td>
                    <td style={{ textAlign: "right" }}>{r.reserved}</td>
                    <td style={{ textAlign: "right" }}>{r.available}</td>
                    <td style={{ textAlign: "right" }}>{r.reorder_point}</td>
                    <td>{st}</td>
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
