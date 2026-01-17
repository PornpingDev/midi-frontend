import React from "react";
import { useNavigate } from "react-router-dom";

type TileProps = {
  title: string;
  desc: string;
  onClick: () => void;
  emoji?: string;
};

function ReportTile({ title, desc, onClick, emoji = "📄" }: TileProps) {
  return (
    <div className="card shadow-sm h-100" role="button" onClick={onClick}>
      <div className="card-body">
        <div style={{ fontSize: 28, lineHeight: 1 }}>{emoji}</div>
        <h5 className="card-title mt-2 mb-1">{title}</h5>
        <p className="card-text text-muted mb-0">{desc}</p>
      </div>
    </div>
  );
}

export default function Reports() {
  const nav = useNavigate();
  return (
    <div className="container mt-4">
      <h1 className="text-primary">📊 Reports & Notifications</h1>

      <div className="row g-3">
        <div className="col-md-4">
          <ReportTile
            emoji="📦"
            title="Stock Summary"
            desc="ภาพรวมสต๊อก"
            onClick={() => nav("/reports/stock-balance")}
          />
        </div>

        <div className="col-md-4">
          <ReportTile
            emoji="🔔"
            title="Reorder Alert"
            desc="แสดงสินค้าที่ต้องสั่งซื้อ"
            onClick={() => nav("/reports/stock-balance?low_only=1")}
          />
        </div>

        <div className="col-md-4">
          <ReportTile
            emoji="🚚"
            title="Delivery Progress"
            desc="Sale Order ที่ส่งของไม่ครบ"
            onClick={() => nav("/reports/delivery-progress")}
          />
        </div>

        <div className="col-md-4">
          <ReportTile
            emoji="📈"
            title="Monthly Sales & Purchases"
            desc="ยอดขาย ยอดสั่งซื้อ"
            onClick={() => nav("/reports/monthly-sales-purchases")}
          />
        </div>

        <div className="col-md-4">
          <ReportTile
            emoji="🧮"
            title="Units Sold by Product"
            desc="รายงานยอดขายตามสินค้า"
            onClick={() => nav("/reports/product-sales")}
          />
        </div>

        <div className="col-md-4">
          <ReportTile
            emoji="🧊"
            title="Non-moving Products"
            desc="สินค้าที่ไม่มียอดขายตามช่วงเวลา"
            onClick={() => nav("/reports/nonmoving-products")}
          />
        </div>
        <div className="col-md-4">
          <ReportTile
            emoji="💰"
            title="Stock Value (Cost)"
            desc="มูลค่าสต๊อกตามราคาทุน"
            onClick={() => nav("/reports/stock-value")}
          />
        </div>

      </div>
    </div>
  );
}
