import React, { useEffect, useState } from "react";
import { Table, Button, Form } from "react-bootstrap";
import axios from "axios";
import Select from "react-select";
import CustomModal from "../components/common/CustomModal";
import AlertToast from "../components/common/AlertToast";
import AlertModal from "../components/common/AlertModal";

const POManagement = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // ---------- ข้อมูลผู้ขาย + สินค้า ----------
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]); // สำหรับ dropdown สินค้า

  // ---------- Modal สร้าง PO ----------
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [savingPO, setSavingPO] = useState(false);
  const [newPO, setNewPO] = useState<any>({
    po_no: "",
    supplier_id: "",
    order_date: new Date().toISOString().split("T")[0],
    expected_date: "",
    note: "",
    vat_rate: 7.0,
    items: [] as any[],
  });

  // ---------- Modal รายการ / รับของ ----------
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [receivePreview, setReceivePreview] = useState<any | null>(null);
  const [loadingReceive, setLoadingReceive] = useState(false);
  const [receivingNow, setReceivingNow] = useState(false);
  const [receiveQty, setReceiveQty] = useState<Record<number, number>>({});
  const [approving, setApproving] = useState(false);

  // โหมดการแสดงใน CustomModal หลัก
  const [viewMode, setViewMode] = useState<"receive" | "history">("receive");


  // ---------- Modal ประวัติรับของ ----------
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any | null>(null);

  // ---------- Alert / Toast ----------
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    variant: "success" | "danger" | "warning";
  }>({
    show: false,
    message: "",
    variant: "success",
  });

  const [alertModal, setAlertModal] = useState<{
    show: boolean;
    title: string;
    body: string;
    variant?: "danger" | "warning" | "success";
    onConfirm: null | (() => void);
  }>({
    show: false,
    title: "",
    body: "",
    variant: "warning",
    onConfirm: null,
  });

  const openConfirm = (cfg: {
    title: string;
    body: string;
    variant?: "danger" | "warning" | "success";
    onConfirm: () => void;
  }) => setAlertModal({ show: true, ...cfg });

  const closeConfirm = () =>
    setAlertModal((prev) => ({ ...prev, show: false, onConfirm: null }));

  // ---------- Helper: เลข PO ต่อเนื่อง MPOYY-XXX ----------
  const getNextPONumber = () => {
    const currentYear = new Date().getFullYear(); // 2025
    const buddhistYear = currentYear + 543; // 2568
    const yearSuffix = buddhistYear.toString().slice(-2); // '68'
    const prefix = `MPO${yearSuffix}`; // MPO68

    const filtered = purchaseOrders.filter((po) =>
      (po.po_no || "").startsWith(prefix)
    );

    const lastNumber =
      filtered
        .map((po) => {
          const parts = (po.po_no || "").split("-");
          return parseInt(parts[1], 10);
        })
        .filter((n) => !isNaN(n))
        .sort((a, b) => b - a)[0] || 0;

    const nextNumber = String(lastNumber + 1).padStart(3, "0");
    return `${prefix}-${nextNumber}`;
  };

  // ---------- โหลดรายการ PO ----------
  const fetchPurchaseOrders = async () => {
    try {
      const res = await axios.get("http://localhost:3000/purchase-orders");
      setPurchaseOrders(res.data || []);
    } catch (e) {
      console.error("❌ โหลด PO ไม่สำเร็จ:", e);
      setToast({
        show: true,
        message: "❌ โหลดรายการใบสั่งซื้อไม่สำเร็จ",
        variant: "danger",
      });
    }
  };

  // ---------- โหลดผู้ขาย ----------
  const fetchSuppliers = async () => {
    try {
      const res = await axios.get("http://localhost:3000/suppliers");
      setSuppliers(res.data || []);
    } catch (e) {
      console.error("❌ โหลด suppliers ไม่สำเร็จ:", e);
    }
  };



  // ✅ helper คำนวณยอด (ตอนสร้าง PO)
  const calcNewPOTotals = () => {
    const subtotal = (newPO.items || []).reduce((sum: number, it: any) => {
      const qty = Number(it.quantity_ordered || 0);
      const price = Number(it.unit_price || 0);
      return sum + qty * price;
    }, 0);

    const rate = Number(newPO.vat_rate ?? 7) || 0;
    const vatAmount = (subtotal * rate) / 100;
    const grandTotal = subtotal + vatAmount;

    return { subtotal, vatRate: rate, vatAmount, grandTotal };
  };

  const formatMoney = (n: number) =>
    Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });


  const openPrintWithPayload = (payloadObj: any) => {
    const key = `PRINT_PAYLOAD_${Date.now()}`;
    localStorage.setItem(key, JSON.stringify(payloadObj));
    window.open(`/print?key=${encodeURIComponent(key)}`, "_blank");
  };





  // ✅ พิมพ์ PO (เปิดแท็บใหม่ด้วย /print?key=...)
  const handlePrintPO = async (poId: number) => {
    try {
      // 1) ขอ payload จาก backend
      const { data } = await axios.get(`http://localhost:3000/purchase-orders/${poId}/print-payload`, {
        withCredentials: true,
      });

      // 2) เก็บลง localStorage เป็น key
      const key = `PRINT_PO_${poId}_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(data));

      // 3) เปิดหน้า /print?key=...
      window.open(`${window.location.origin}/print?key=${encodeURIComponent(key)}`, "_blank");
    } catch (e: any) {
      console.error("❌ เปิดหน้าพิมพ์ PO ไม่สำเร็จ:", e);
      setToast({
        show: true,
        message: "❌ เปิดหน้าพิมพ์ PO ไม่สำเร็จ",
        variant: "danger",
      });
    }
  };



  // ✅ ใช้โชว์ใน UI
  const newPOTotals = calcNewPOTotals();









  // ---------- โหลดสินค้า ----------
  // ดึงสินค้าตามผู้ขายที่เลือก (ถ้าไม่ส่ง supplierCode จะใช้ราคาผู้ผลิตหลัก / cost)
  const fetchProducts = async (supplierCode) => {
    try {
      const res = await axios.get("http://localhost:3000/products/for-po", {
        params: supplierCode ? { supplier_id: supplierCode } : {},
      });

      const formatted = (res.data || [])
        .filter((p) => !(p.product_no || "").trim().toUpperCase().startsWith("BOM-"))
        .map((p) => {
          const supplierPrice =
            p.supplier_purchase_price != null ? Number(p.supplier_purchase_price) : null;

          const defaultPriceFromDefaultSupplier =
            p.default_purchase_price != null ? Number(p.default_purchase_price) : null;

          const costPrice = p.cost != null ? Number(p.cost) : 0;

          let defaultPrice;
          if (supplierCode) defaultPrice = supplierPrice ?? costPrice;
          else defaultPrice = defaultPriceFromDefaultSupplier ?? costPrice;

          // ✅ ชื่อ/รหัสฝั่งผู้ขาย (ถ้าเลือก supplier แล้ว backend ควรส่งของเจ้านั้นมา)
          const spName = p.supplier_product_name || "";   // <- จาก product_suppliers
          const spCode = p.supplier_product_code || "";   // <- จาก product_suppliers

          // ✅ MOQ / Lead time (ของ supplier)
          const moq = p.minimum_order_qty != null ? Number(p.minimum_order_qty) : 1;
          const sLead = p.supplier_lead_time != null ? Number(p.supplier_lead_time) : null;

          const labelBase = spName ? spName : p.product_name;
          const codeTag = spCode ? ` • ${spCode}` : "";

          return {
            value: p.id,
            label: `${labelBase}${codeTag} (เหลือ: ${p.available} ${p.unit || ""})`,

            product_name: p.product_name,
            product_no: p.product_no,

            product_price: defaultPrice,

            // ✅ ส่งต่อให้ row ตอนเลือกสินค้า
            supplier_product_name: spName,
            supplier_product_code: spCode,
            minimum_order_qty: moq,
            supplier_lead_time: sLead,
          };
        });

      setProducts(formatted);
    } catch (e) {
      console.error("❌ โหลด products ไม่สำเร็จ:", e);
    }
  };



  useEffect(() => {
    fetchPurchaseOrders();
    fetchSuppliers();
    fetchProducts();
  }, []);

  // ---------- ค้นหา + หน้า ----------
  const filteredOrders = purchaseOrders.filter((po) => {
    const s = searchTerm.toLowerCase();
    const supplierName = (po.supplier_name || "").toLowerCase();
    const poNo = (po.po_no || "").toLowerCase();
    const status = (po.status || "").toLowerCase();
    return poNo.includes(s) || supplierName.includes(s) || status.includes(s);
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // ---------- เปิด Modal สร้าง PO ----------
  const handleOpenCreateModal = () => {
    setNewPO({
      po_no: "", // ✅ ไม่ generate ฝั่งหน้าเว็บแล้ว
      supplier_id: "",
      order_date: new Date().toISOString().split("T")[0],
      expected_date: "",
      note: "",
      vat_rate: 7.0,
      items: [],
    });
    setShowCreateModal(true);
  };


  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  // เพิ่มแถวสินค้าใน PO ใหม่
  const handleAddPOItemRow = () => {
    setNewPO((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: "",
          product_name: "",

          supplier_product_name: "",   // ✅ new
          supplier_product_code: "",   // ✅ new
          minimum_order_qty: 1,        // ✅ new (optional)

          quantity_ordered: 1,
          unit_price: 0,
          remarks: "",
        },
      ],
    }));
  };


  const handleRemovePOItemRow = (index: number) => {
    setNewPO((prev: any) => ({
      ...prev,
      items: prev.items.filter((_: any, i: number) => i !== index),
    }));
  };

  const handleChangePOItemField = (
    index: number,
    field: string,
    value: any
  ) => {
    setNewPO((prev: any) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  // ---------- บันทึกสร้าง PO ----------
  const handleSaveNewPO = async () => {
    if (!newPO.supplier_id) {
      setToast({
        show: true,
        message: "⚠️ กรุณาเลือกผู้ขาย",
        variant: "warning",
      });
      return;
    }

    if (!newPO.items || newPO.items.length === 0) {
      setToast({
        show: true,
        message: "⚠️ กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ",
        variant: "warning",
      });
      return;
    }

    // ตรวจว่าทุกรายการมี product_id + quantity > 0
    const invalid = newPO.items.some(
      (it: any) =>
        !it.product_id || !it.quantity_ordered || it.quantity_ordered <= 0
    );
    if (invalid) {
      setToast({
        show: true,
        message: "⚠️ กรุณาเลือกสินค้าและระบุจำนวนให้ถูกต้องทุกแถว",
        variant: "warning",
      });
      return;
    }

    const payload = {
      supplier_id: newPO.supplier_id,
      order_date: newPO.order_date,
      expected_date: newPO.expected_date || null,
      note: newPO.note || "",
      vat_rate: Number(newPO.vat_rate ?? 7),
      items: newPO.items.map((it) => ({
        product_id: it.product_id,
        quantity_ordered: Number(it.quantity_ordered) || 0,
        unit_price: Number(it.unit_price) || 0,
        supplier_product_name: it.supplier_product_name || it.product_name || "",
        supplier_product_code: it.supplier_product_code || "",
        remarks: it.remarks || "",
      })),
    };

    try {
      setSavingPO(true);
      const res = await axios.post("http://localhost:3000/purchase-orders", payload, {
        headers: { "Content-Type": "application/json" },
      });

      setToast({
        show: true,
        message: `✅ บันทึกใบสั่งซื้อเรียบร้อยแล้ว • เลขที่ ${res.data?.po_no || "-"}`,
        variant: "success",
      });

      setShowCreateModal(false);
      await fetchPurchaseOrders();
    } catch (e: any) {
      console.error("❌ บันทึก PO ไม่สำเร็จ:", e);
      setToast({
        show: true,
        message:
          "❌ บันทึกใบสั่งซื้อไม่สำเร็จ: " +
          (e?.response?.data?.message || e.message),
        variant: "danger",
      });
    } finally {
      setSavingPO(false);
    }
  };

  // ---------- เปิด Modal รายการ / รับของ ----------
  const handleOpenReceiveModal = async (po: any) => {
    setSelectedPO(po);
    setViewMode("receive");          // ✅ ใช้โหมดรายการ/รับของ
    setShowReceiveModal(true);
    setLoadingReceive(true);
    setReceivePreview(null);
    setReceiveQty({});

    try {
      // backend: GET /purchase-orders/:id/for-receive
      const { data } = await axios.get(
        `http://localhost:3000/purchase-orders/${po.id}/for-receive`
      );
      setReceivePreview(data);

      const qtyMap: Record<number, number> = {};
      (data.items || []).forEach((it: any) => {
        const remaining = Number(it.remaining || 0);
        // ให้ user ใส่เอง
        qtyMap[it.id] = 0;
      });
      setReceiveQty(qtyMap);
    } catch (e: any) {
      console.error("❌ โหลดข้อมูลรับของไม่สำเร็จ:", e);
      setToast({
        show: true,
        message:
          "❌ โหลดข้อมูลสำหรับรับของไม่สำเร็จ: " +
          (e?.response?.data?.message || e.message),
        variant: "danger",
      });
      setShowReceiveModal(false);
    } finally {
      setLoadingReceive(false);
    }
  };

  const handleCloseReceiveModal = () => {
    setShowReceiveModal(false);
    setSelectedPO(null);
    setReceivePreview(null);
    setReceiveQty({});
    setApproving(false);
  };





  // ---------- เปิด / ปิด ประวัติรับของ ----------
  const handleOpenHistoryModal = async () => {
    if (!selectedPO) return;

    setHistoryLoading(true);
    setHistoryData(null);

    try {
      const { data } = await axios.get(
        `http://localhost:3000/purchase-orders/${selectedPO.id}/receive-history`
      );
      setHistoryData(data || null);
      setViewMode("history");      // ✅ เปลี่ยนมาโหมดประวัติใน modal เดิม
    } catch (e: any) {
      console.error("❌ โหลดประวัติรับของไม่สำเร็จ:", e);
      setToast({
        show: true,
        message:
          "❌ โหลดประวัติรับของไม่สำเร็จ: " +
          (e?.response?.data?.message || e.message),
        variant: "danger",
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  // เวลาจะกลับไปหน้ารายละเอียด
  const handleBackToReceive = () => {
    setViewMode("receive");
  };



  const handleCloseHistoryModal = () => {
    setShowHistoryModal(false);
    setHistoryData(null);
  };

  // จำนวนรวมที่จะรับ
  const totalReceiveQty = () => {
    return Object.values(receiveQty).reduce(
      (sum, v) => sum + (Number(v) || 0),
      0
    );
  };

  // ---------- อนุมัติ PO ----------
  const approveSelectedPO = async () => {
    if (!selectedPO) return;
    try {
      setApproving(true);

      await axios.post(
        `http://localhost:3000/purchase-orders/${selectedPO.id}/approve`
      );

      setToast({
        show: true,
        message: "✅ อนุมัติใบสั่งซื้อเรียบร้อยแล้ว",
        variant: "success",
      });

      // อัปเดตสถานะใน state ทั้ง selectedPO และ purchaseOrders
      setSelectedPO((prev: any) =>
        prev ? { ...prev, status: "approved" } : prev
      );
      setPurchaseOrders((prev) =>
        prev.map((po) =>
          po.id === selectedPO.id ? { ...po, status: "approved" } : po
        )
      );
    } catch (e: any) {
      console.error("❌ อนุมัติ PO ไม่สำเร็จ:", e);
      setToast({
        show: true,
        message:
          "❌ อนุมัติใบสั่งซื้อไม่สำเร็จ: " +
          (e?.response?.data?.message || e.message),
        variant: "danger",
      });
    } finally {
      setApproving(false);
    }
  };

  const handleClickApprove = () => {
    if (!selectedPO) return;
    openConfirm({
      title: "ยืนยันการอนุมัติใบสั่งซื้อ",
      body: `คุณต้องการอนุมัติใบสั่งซื้อเลขที่ ${selectedPO.po_no} หรือไม่?`,
      variant: "warning",
      onConfirm: () => {
        closeConfirm();
        approveSelectedPO();
      },
    });
  };

  // ---------- รับของ (GR) ----------
  const doReceiveNow = async () => {
    if (!selectedPO || !receivePreview) return;

    const itemsPayload = (receivePreview.items || [])
      .map((it: any) => {
        const q = Number(receiveQty[it.id] || 0);
        const remaining = Number(it.remaining || 0);
        if (!q || q <= 0) return null;
        const safeQty = q > remaining ? remaining : q;
        return {
          purchase_order_item_id: it.id,
          quantity_received: safeQty,
        };
      })
      .filter(Boolean) as any[];

    if (itemsPayload.length === 0) {
      setToast({
        show: true,
        message: "⚠️ กรุณาใส่จำนวนรับอย่างน้อย 1 รายการ",
        variant: "warning",
      });
      return;
    }

    setReceivingNow(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      const payload = {
        purchase_order_id: selectedPO.id,
        // gr_no: "", // ให้ backend ออกเลข MGRYY-### เอง
        received_date: today,
        note: `(PO ${selectedPO.po_no})`,
        items: itemsPayload,
      };

      const { data } = await axios.post(
        "http://localhost:3000/goods-receipts/receive-now",
        payload,
        { headers: { "Content-Type": "application/json" } }
      );

      setToast({
        show: true,
        message: `✅ รับของสำเร็จ • GR: ${data?.gr_no || "-"}`,
        variant: "success",
      });

      handleCloseReceiveModal();
      await fetchPurchaseOrders(); // รีโหลดสถานะ PO (partial / completed)
    } catch (e: any) {
      console.error("❌ รับของไม่สำเร็จ:", e);
      setToast({
        show: true,
        message:
          "❌ รับของไม่สำเร็จ: " +
          (e?.response?.data?.message || e.message),
        variant: "danger",
      });
    } finally {
      setReceivingNow(false);
    }
  };

  const handleClickReceive = () => {
    openConfirm({
      title: "ยืนยันการรับของ",
      body: "คุณต้องการบันทึกการรับของตามจำนวนที่ระบุหรือไม่?",
      variant: "warning",
      onConfirm: () => {
        closeConfirm();
        doReceiveNow();
      },
    });
  };

  // ใช้อนุญาตรับของเฉพาะเมื่อ PO อยู่ในสถานะ approved / partial
  const canReceiveOnSelectedPO =
    selectedPO &&
    (selectedPO.status === "approved" || selectedPO.status === "partial");

  return (
    <div className="container-fluid mt-4">
      <h1 className="text-primary">🧾 Purchase Order Management</h1>

      {/* ปุ่มสร้าง PO */}
      <Button
        variant="success"
        className="mb-3"
        onClick={handleOpenCreateModal}
      >
        ➕ สร้างใบสั่งซื้อ
      </Button>

      {/* ค้นหา */}
      <input
        type="text"
        className="form-control mb-3"
        placeholder="🔍 ค้นหาเลขที่ PO, ชื่อผู้ขาย หรือสถานะ..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setCurrentPage(1);
        }}
      />

      {/* ตาราง PO */}
      <Table striped bordered hover>
        <thead>
          <tr>
            <th style={{ width: "12%" }}>เลขที่ PO</th>
            <th style={{ width: "22%" }}>ผู้ขาย</th>
            <th style={{ width: "10%" }}>วันที่สั่งซื้อ</th>
            <th style={{ width: "10%" }}>คาดว่าจะเข้า</th>
            <th style={{ width: "10%" }}>สถานะ</th>
            <th style={{ width: "20%" }}>หมายเหตุ</th>
            <th style={{ width: "16%" }}>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {paginatedOrders.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center text-muted">
                ❌ ไม่พบใบสั่งซื้อ
              </td>
            </tr>
          ) : (
            paginatedOrders.map((po) => (
              <tr key={po.id}>
                <td>{po.po_no}</td>
                <td>{po.supplier_name || "-"}</td>
                <td>
                  {po.order_date
                    ? new Date(po.order_date).toLocaleDateString("th-TH")
                    : "-"}
                </td>
                <td>
                  {po.expected_date
                    ? new Date(po.expected_date).toLocaleDateString("th-TH")
                    : "-"}
                </td>
                <td>{po.status}</td>
                <td>{po.note || "-"}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <Button
                    variant="success"
                    size="sm"
                    style={{ marginRight: 4, width: 110 }}
                    onClick={() => handleOpenReceiveModal(po)}
                    disabled={po.status === "cancelled"}
                  >
                    📋 รายละเอียด
                  </Button>
                  <Button
                    variant="outline-dark"
                    size="sm"
                    style={{ width: 110 }}
                    onClick={() => handlePrintPO(po.id)}
                    disabled={po.status === "cancelled"}
                  >
                    🖨️ พิมพ์ PO
                  </Button>

                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* pagination */}
      <div className="d-flex justify-content-center align-items-center gap-2 mt-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
        >
          ◀️ ก่อนหน้า
        </Button>
        <span>
          หน้า {currentPage} / {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            setCurrentPage((p) => Math.min(p + 1, totalPages))
          }
          disabled={currentPage === totalPages}
        >
          ถัดไป ▶️
        </Button>
      </div>

      {/* Modal สร้างใบสั่งซื้อ */}
      <CustomModal
        show={showCreateModal}
        onClose={handleCloseCreateModal}
        title="➕ สร้างใบสั่งซื้อ"
        size="lg"
      >
        <Form>
          <Form.Group className="mb-2">
            <Form.Label>เลขที่ PO</Form.Label>
            
            <Form.Control type="text" value={newPO.po_no || "ระบบจะออกเลขให้อัตโนมัติ"} disabled />
            <Form.Text className="text-muted">
              ระบบจะออกเลข (MPOYY-XXX) ให้อัตโนมัติ 
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>ผู้ขาย</Form.Label>
            <Select
              options={suppliers.map((s: any) => ({
                value: s.id,              // ใช้ id ผูกกับ purchase_orders ตามเดิม
                label: s.name,
                supplier_code: s.code,    // ✅ ใช้ key ที่ backend ส่งมา
              }))}
              value={
                newPO.supplier_id
                  ? {
                      value: newPO.supplier_id,
                      label:
                        suppliers.find((s: any) => s.id === newPO.supplier_id)?.name ||
                        "",
                    }
                  : null
              }
              onChange={(selected: any) => {
                const supplierId   = selected ? selected.value : "";
                const supplierCode = selected ? selected.supplier_code : undefined;

                setNewPO((prev: any) => ({
                  ...prev,
                  supplier_id: supplierId,
                  items: [],
                }));

                fetchProducts(supplierCode);  // ส่ง SUP-001 / SUP-002 เข้าถูกแล้ว
              }}


              placeholder="เลือกผู้ขาย..."
            />
          </Form.Group>



          <div className="d-flex gap-3">
            <Form.Group className="mb-2">
              <Form.Label>วันที่สั่งซื้อ</Form.Label>
              <Form.Control
                type="date"
                value={newPO.order_date}
                onChange={(e) =>
                  setNewPO((prev: any) => ({
                    ...prev,
                    order_date: e.target.value,
                  }))
                }
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>คาดว่าจะเข้า</Form.Label>
              <Form.Control
                type="date"
                value={newPO.expected_date || ""}
                onChange={(e) =>
                  setNewPO((prev: any) => ({
                    ...prev,
                    expected_date: e.target.value,
                  }))
                }
              />
            </Form.Group>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>หมายเหตุ</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={newPO.note || ""}
              onChange={(e) =>
                setNewPO((prev: any) => ({ ...prev, note: e.target.value }))
              }
            />
          </Form.Group>

          <hr />
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0">📦 รายการสินค้าในใบสั่งซื้อ</h5>
            <Button
              variant="outline-success"
              size="sm"
              onClick={handleAddPOItemRow}
            >
              ➕ เพิ่มแถวสินค้า
            </Button>
          </div>

          {!newPO.items || newPO.items.length === 0 ? (
            <div className="text-muted mb-3">ยังไม่มีรายการสินค้า</div>
          ) : (
            <Table striped bordered hover size="sm">
              <thead>
                <tr>
                  <th style={{ width: "35%" }}>สินค้า</th>
                  <th style={{ width: "12%", textAlign: "center" }}>จำนวน</th>
                  <th style={{ width: "15%", textAlign: "center" }}>
                    ราคาต่อหน่วย
                  </th>
                  <th style={{ width: "25%" }}>หมายเหตุ</th>
                  <th style={{ width: "13%", textAlign: "center" }}>ลบ</th>
                </tr>
              </thead>
              <tbody>
                {newPO.items.map((it: any, idx: number) => (
                  <tr key={idx}>
                    <td>
                      <Select
                        options={products}
                        value={
                          it.product_id
                            ? products.find((p: any) => p.value === it.product_id) || null
                            : null
                        }
                        onChange={(selected) => {
                          if (!selected) {
                            handleChangePOItemField(idx, "product_id", "");
                            handleChangePOItemField(idx, "product_name", "");
                            handleChangePOItemField(idx, "supplier_product_name", "");
                            handleChangePOItemField(idx, "supplier_product_code", "");
                            handleChangePOItemField(idx, "minimum_order_qty", 1);
                            handleChangePOItemField(idx, "unit_price", 0);
                            return;
                          }

                          handleChangePOItemField(idx, "product_id", selected.value);
                          handleChangePOItemField(idx, "product_name", selected.product_name);

                          // ✅ auto-fill ฝั่งผู้ขาย
                          handleChangePOItemField(idx, "supplier_product_name", selected.supplier_product_name || "");
                          handleChangePOItemField(idx, "supplier_product_code", selected.supplier_product_code || "");
                          handleChangePOItemField(idx, "minimum_order_qty", selected.minimum_order_qty || 1);

                          // ✅ ตั้ง MOQ เป็นค่าเริ่มต้น ถ้า user ยังไม่ได้แก้จำนวน
                          const currentQty = Number(newPO.items?.[idx]?.quantity_ordered || 1);
                          if (!currentQty || currentQty === 1) {
                            handleChangePOItemField(idx, "quantity_ordered", selected.minimum_order_qty || 1);
                          }

                          // ✅ ตั้งราคา default
                          handleChangePOItemField(idx, "unit_price", selected.product_price ?? 0);
                        }}

                        placeholder="เลือกสินค้า..."
                      />

                      {/* ✅ ใส่ตรงนี้เลย: โชว์ชื่อ/รหัสผู้ขาย แบบอ่านอย่างเดียว */}
                      <div className="mt-1 text-muted" style={{ fontSize: 12 }}>
                        {it.supplier_product_name ? (
                          <>
                            ชื่อใบสั่งซื้อ: <b>{it.supplier_product_name}</b>
                            {it.supplier_product_code ? ` • รหัสผู้ขาย: ${it.supplier_product_code}` : ""}
                          </>
                        ) : (
                          <>ยังไม่มีชื่อ/รหัสผู้ขาย (ไปกรอกในหน้าสินค้าได้)</>
                        )}
                      </div>    

                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        min={1}
                        value={it.quantity_ordered}
                        onChange={(e) =>
                          handleChangePOItemField(
                            idx,
                            "quantity_ordered",
                            parseInt(e.target.value || "0", 10)
                          )
                        }
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        min={0}
                        step="0.01"
                        value={it.unit_price}
                        onChange={(e) =>
                          handleChangePOItemField(
                            idx,
                            "unit_price",
                            parseFloat(e.target.value || "0")
                          )
                        }
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="text"
                        value={it.remarks || ""}
                        onChange={(e) =>
                          handleChangePOItemField(
                            idx,
                            "remarks",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td className="text-center">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemovePOItemRow(idx)}
                      >
                        🗑️ ลบ
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}


          {/* ✅ สรุป VAT/ยอดรวม */}
          <div className="d-flex justify-content-end mt-3">
            <div style={{ minWidth: 360 }}>
              <div className="d-flex justify-content-between">
                <div className="text-muted">ยอดก่อนภาษี:</div>
                <div><b>{formatMoney(newPOTotals.subtotal)}</b></div>
              </div>

              <div className="d-flex justify-content-between align-items-center mt-2">
                <div className="text-muted">ภาษี (%):</div>
                <div className="d-flex align-items-center gap-2">
                  <Form.Control
                    type="number"
                    step="0.01"
                    style={{ width: 110 }}
                    value={newPO.vat_rate}
                    onChange={(e) =>
                      setNewPO((prev: any) => ({
                        ...prev,
                        vat_rate: parseFloat(e.target.value || "0"),
                      }))
                    }
                  />
                  <div>=</div>
                  <div><b>{formatMoney(newPOTotals.vatAmount)}</b></div>
                </div>
              </div>

              <div className="d-flex justify-content-between mt-2">
                <div className="text-muted">ยอดสุทธิ:</div>
                <div><b>{formatMoney(newPOTotals.grandTotal)}</b></div>
              </div>
            </div>
          </div>



          <div className="d-flex justify-content-end gap-2 mt-3">
            <Button variant="secondary" onClick={handleCloseCreateModal}>
              ❌ ยกเลิก
            </Button>
            <Button
              variant="success"
              onClick={handleSaveNewPO}
              disabled={savingPO}
            >
              {savingPO ? "กำลังบันทึก..." : "✅ บันทึกใบสั่งซื้อ"}
            </Button>
          </div>
        </Form>
      </CustomModal>

      {/* Modal รายการ / รับของ */}
      <CustomModal
        show={showReceiveModal}
        onClose={handleCloseReceiveModal}
        title={
          selectedPO
            ? viewMode === "receive"
              ? `📋 รายการใบสั่งซื้อ: ${selectedPO.po_no} | ผู้ขาย: ${selectedPO.supplier_name || "-"}`
              : `📜 ประวัติการรับของของใบสั่งซื้อ: ${selectedPO.po_no}`
            : "📋 รายการใบสั่งซื้อ"
        }
        size="lg"
      >
        {viewMode === "receive" ? (
          // 🔹 โหมดรายการ / รับของ (ใช้ content เดิมแทบทั้งหมด)
          loadingReceive ? (
            <div className="text-muted">กำลังโหลดข้อมูล...</div>
          ) : !receivePreview ? (
            <div className="text-danger">ไม่สามารถโหลดข้อมูลรับของได้</div>
          ) : (
            <>
              {/* แถวสถานะ + ปุ่มอนุมัติ + ปุ่มประวัติ */}
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div>
                  สถานะ PO: <b>{selectedPO?.status}</b>
                </div>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={handleOpenHistoryModal}
                  >
                    📜 ประวัติรับของ
                  </Button>
                  {selectedPO?.status === "draft" && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleClickApprove}
                      disabled={approving}
                    >
                      {approving ? "กำลังอนุมัติ..." : "✅ อนุมัติใบสั่งซื้อ"}
                    </Button>
                  )}
                  <Button
                    variant="outline-dark"
                    size="sm"
                    onClick={() => selectedPO?.id && handlePrintPO(selectedPO.id)}
                    disabled={!selectedPO || selectedPO.status === "cancelled"}
                  >
                    🖨️ พิมพ์ PO
                  </Button>

                </div>
              </div>

              {selectedPO?.status === "draft" && (
                <div className="text-muted mb-2" style={{ fontSize: 12 }}>
                  ต้องอนุมัติใบสั่งซื้อก่อน จึงจะสามารถบันทึกการรับของได้
                </div>
              )}

            <Table striped bordered hover>
              <thead>
                <tr>
                  <th style={{ width: "30%" }}>สินค้า</th>
                  <th style={{ width: "10%", textAlign: "right" }}>สั่งซื้อ</th>
                  <th style={{ width: "10%", textAlign: "right" }}>
                    รับแล้ว
                  </th>
                  <th style={{ width: "10%", textAlign: "right" }}>
                    คงเหลือ
                  </th>
                  <th style={{ width: "10%", textAlign: "right" }}>
                    ราคาต่อหน่วย
                  </th>
                  <th style={{ width: "20%" }}>รับรอบนี้</th>
                </tr>
              </thead>
              <tbody>
                {(receivePreview.items || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted">
                      ไม่มีรายการสินค้าใน PO นี้
                    </td>
                  </tr>
                ) : (
                  receivePreview.items.map((it: any) => {
                    const remaining = Number(it.remaining || 0);
                    const q = receiveQty[it.id] ?? remaining;
                    const disabled =
                      remaining <= 0 || !canReceiveOnSelectedPO;
                    return (
                      <tr key={it.id}>
                        <td>
                          <div className="fw-semibold">
                            {it.product_name || "-"}
                          </div>
                          <div
                            className="text-muted"
                            style={{ fontSize: 12 }}
                          >
                            {it.product_no ? `รหัส: ${it.product_no}` : ""}
                          </div>
                        </td>
                        <td className="text-end">
                          {Number(it.ordered || 0)}
                        </td>
                        <td className="text-end">
                          {Number(it.received || 0)}
                        </td>
                        <td className="text-end">{remaining}</td>
                        <td className="text-end">
                          {it.unit_price != null
                            ? Number(it.unit_price).toFixed(2)
                            : "-"}
                        </td>
                        <td>
                          <Form.Control
                            type="number"
                            min={0}
                            max={remaining}
                            disabled={disabled}
                            value={disabled ? 0 : q}
                            onChange={(e) => {
                              let val = parseInt(e.target.value || "0", 10);
                              if (val < 0) val = 0;
                              if (val > remaining) val = remaining;
                              setReceiveQty((prev) => ({
                                ...prev,
                                [it.id]: val,
                              }));
                            }}
                            style={{ maxWidth: 120 }}
                          />
                          <div
                            className="text-muted"
                            style={{ fontSize: 12 }}
                          >
                            รับได้สูงสุด: {remaining}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>

            <div className="d-flex justify-content-between align-items-center mt-2">
              <div className="text-muted">
                ปริมาณรวมที่รับรอบนี้: <b>{totalReceiveQty()}</b>
              </div>
              <div className="d-flex gap-2">
                <Button variant="secondary" onClick={handleCloseReceiveModal}>
                  ปิด
                </Button>
                <Button
                  variant="success"
                  onClick={handleClickReceive}
                  disabled={
                    totalReceiveQty() <= 0 ||
                    receivingNow ||
                    !canReceiveOnSelectedPO
                  }
                >
                  {receivingNow ? "กำลังบันทึก..." : "✅ รับของ"}
                </Button>
              </div>
            </div>              
            </>
          )
        ) : (
          // 🔹 โหมดประวัติรับของ
          <>
            {historyLoading ? (
              <div className="text-muted">กำลังโหลดประวัติ...</div>
            ) : !historyData ||
              !historyData.goodsReceipts ||
              historyData.goodsReceipts.length === 0 ? (
              <div className="text-muted">
                ยังไม่มีประวัติการรับของสำหรับใบสั่งซื้อนี้
              </div>
            ) : (
              <>
                {/* ปุ่มย้อนกลับไปหน้า receive */}
                <div className="d-flex justify-content-end mb-2">
                  <Button variant="secondary" size="sm" onClick={handleBackToReceive}>
                    ◀️ กลับไปหน้ารายละเอียด
                  </Button>
                </div>

                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th style={{ width: "15%" }}>เลขที่ GR</th>
                      <th style={{ width: "12%" }}>วันที่รับ</th>
                      <th style={{ width: "25%" }}>สินค้า</th>
                      <th style={{ width: "10%", textAlign: "right" }}>จำนวนรับ</th>
                      <th style={{ width: "12%", textAlign: "right" }}>
                        ราคาต่อหน่วย
                      </th>
                      <th>หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.goodsReceipts.map((gr: any) =>
                      (gr.items || []).map((item: any, idx: number) => (
                        <tr key={`${gr.id}-${idx}`}>
                          <td>{gr.gr_no}</td>
                          <td>
                            {gr.received_date
                              ? new Date(gr.received_date).toLocaleDateString("th-TH")
                              : "-"}
                          </td>
                          <td>
                            <div className="fw-semibold">
                              {item.product_name || "-"}
                            </div>
                            <div className="text-muted" style={{ fontSize: 12 }}>
                              {item.product_no ? `รหัส: ${item.product_no}` : ""}
                            </div>
                          </td>
                          <td className="text-end">
                            {Number(item.quantity_received || 0)}
                          </td>
                          <td className="text-end">
                            {item.unit_price != null
                              ? Number(item.unit_price).toFixed(2)
                              : "-"}
                          </td>
                          <td>{gr.note || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </>
            )}
          </>
        )}

      </CustomModal>

      

      {/* Toast & AlertModal */}
      <AlertToast
        show={toast.show}
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />

      <AlertModal
        show={alertModal.show}
        onClose={closeConfirm}
        onConfirm={() => {
          if (alertModal.onConfirm) alertModal.onConfirm();
        }}
        title={alertModal.title}
        body={alertModal.body}
        variant={alertModal.variant || "warning"}
      />
    </div>
  );
};

export default POManagement;
