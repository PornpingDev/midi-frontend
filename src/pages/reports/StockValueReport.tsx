import React, { useEffect, useState } from "react";
import axios from "axios";

const fmtMoney = (n: number) =>
  Number(n || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function StockValueReport() {
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get("/api/reports/stock-value", {
          withCredentials: true,
        });
        setItems(data.items || []);
        setSummary(data.summary || null);
      } catch (e) {
        console.error("❌ load stock value report error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="container mt-4">กำลังโหลด...</div>;

  return (
    <div className="container mt-4">
      <h2 className="text-primary">💰 Stock Value Report</h2>

      {summary && (
        <div className="alert alert-info mt-3">
          <b>มูลค่าสต๊อกรวม:</b>{" "}
          {fmtMoney(summary.total_stock_value)} บาท
          <br />
          <small>จำนวนสินค้า: {summary.total_items} รายการ</small>
        </div>
      )}

      <table className="table table-striped mt-3">
        <thead>
          <tr>
            <th>รหัสสินค้า</th>
            <th>ชื่อสินค้า</th>
            <th className="text-end">คงเหลือ</th>
            <th className="text-end">ราคาทุน</th>
            <th className="text-end">มูลค่า</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={idx}>
              <td>{it.product_no}</td>
              <td>{it.product_name}</td>
              <td className="text-end">{it.stock}</td>
              <td className="text-end">{fmtMoney(it.cost)}</td>
              <td className="text-end fw-bold">
                {fmtMoney(it.stock_value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
