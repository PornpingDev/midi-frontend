import React, { useState, useEffect } from "react";
import { Table, Button, Modal, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from "axios";
import CustomModal from "../components/common/CustomModal";
import AlertModal from "../components/common/AlertModal";
import AlertToast from "../components/common/AlertToast";







const SalesDelivery = () => {
  const navigate = useNavigate();


const [stockParts, setStockParts] = useState([]);

const [salesOrders, setSalesOrders] = useState([]); 
useEffect(() => {
  const fetchSalesOrders = async () => {
    try {
      const response = await axios.get("http://localhost:3000/sales-orders");
      setSalesOrders(response.data);
    } catch (error) {
      console.error("❌ ดึง Sales Orders ไม่สำเร็จ:", error);
    }
  };

  fetchSalesOrders();
}, []);


const [customers, setCustomers] = useState([]);

useEffect(() => {
  const fetchCustomers = async () => {
    try {
      const response = await axios.get('http://localhost:3000/customers');
      setCustomers(response.data);
    } catch (err) {
      console.error('โหลดลูกค้าไม่สำเร็จ:', err);
    }
  };

  fetchCustomers();
}, []);





/*
  const handleDeductStock = async () => {
    if (!currentOrder || reservedItems.length === 0) {
      alert("❌ ไม่มีรายการที่จอง");
      return;
    }

    try {
      const itemsToDeduct = reservedItems.map((item) => {
        const found = stockParts.find((p) => p.value === item.part);
        return {
          product_id: found?.product_id,
          quantity: item.quantity,
        };
      }).filter(item => item.product_id);

      if (itemsToDeduct.length === 0) {
        alert("❌ ไม่พบสินค้าใน stockParts");
        return;
      }

      const response = await axios.post("http://localhost:3000/deduct-stock", {
        items: itemsToDeduct,
        employee_id: 1,
        reason: `ตัด stock จาก SO ${currentOrder.sales_order_no}`,
      });

      alert("✅ ตัด stock สำเร็จแล้ว!");

      // ✅ อัปเดต status ของ SO
      setSalesOrders((prev) =>
        prev.map((order) =>
          order.id === currentOrder.id
            ? { ...order, status: "ตัด stock แล้ว" }
            : order
        )
      );

      setReservedItems([]);
      setShowModal(false);
    } catch (err) {
      console.error("❌ ตัด stock ล้มเหลว:", err);
      alert("❌ เกิดข้อผิดพลาดในการตัด stock");
    }
  };
*/


  const [newItem, setNewItem] = useState({ part: "", quantity: "", available: 0, unit: "" });
  const [currentOrder, setCurrentOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [reservedItems, setReservedItems] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", variant: "success" });
  const [confirmDeleteLine, setConfirmDeleteLine] = useState<{show:boolean; soId:number|null; productId:number|null}>({show:false, soId:null, productId:null});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [salespersonName, setSalespersonName] = useState("");
  const [orderChannel, setOrderChannel] = useState("");
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrderType | null>(null);
  const [itemSummaries, setItemSummaries] = useState<any[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [reserveNowQty, setReserveNowQty] = useState<Record<number, number>>({});
  const [reservationsMap, setReservationsMap] = useState<Record<number, any>>({});
  const [rowQty, setRowQty] = useState<Record<number, any>>({});

  const [deliveryPreview, setDeliveryPreview] = useState<any | null>(null);     // ข้อมูลจาก GET /for-delivery
  const [deliverySelectedIds, setDeliverySelectedIds] = useState<number[]>([]); // id ของ sales_order_item ที่เลือกส่ง
  const [loadingDelivery, setLoadingDelivery] = useState(false);
  const [sendingNow, setSendingNow] = useState(false);







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

  // helper เปิด/ปิด modal ยืนยัน
  const openConfirm = (cfg: {
    title: string;
    body: string;
    variant?: "danger" | "warning" | "success";
    onConfirm: () => void;
  }) => setAlertModal({ show: true, ...cfg });

  const closeConfirm = () =>
    setAlertModal((prev) => ({ ...prev, show: false, onConfirm: null }));




  // ฟังชั่นใบสั่งซื้อ

  const [newOrder, setNewOrder] = useState({
    id: "",
    customer: "",
    date: new Date().toISOString().split("T")[0], // วันที่ปัจจุบัน
    required_date: "",
    status: "รอจอง",
    items: [],
    salesperson_name: "",
    order_channel: "",
    note: "",
    po_number: "",
  });
 

  const getNextSONumber = () => {
    const currentYear = new Date().getFullYear();       // 2025
    const buddhistYear = currentYear + 543;             // 2568
    const yearSuffix = buddhistYear.toString().slice(-2); // '68'
    const prefix = `MSO${yearSuffix}`;                  // MSO68
  
    const filtered = salesOrders.filter(so =>
      so.sales_order_no.startsWith(prefix)
    );
  
    const lastNumber = filtered
      .map(so => {
        const parts = so.sales_order_no.split("-");
        return parseInt(parts[1], 10);
      })
      .filter(n => !isNaN(n))
      .sort((a, b) => b - a)[0] || 0;
  
    const nextNumber = String(lastNumber + 1).padStart(3, "0");
  
    return `${prefix}-${nextNumber}`;
  };
  

  const getProductIdFromRow = (row: any): number | null => {
    // กรณีดีที่สุด: backend ส่ง product_id มาในสรุป
    if (row.product_id) return Number(row.product_id);

    // fallback: หาใน stockParts (อาจคลาดเคลื่อนถ้าชื่อซ้ำ)
    const found = stockParts.find(
      (p:any) => p.value === row.name // เรา map value = product_name ใน fetchStockParts
    );
    return found?.product_id ?? null;
  };



  // เปิด-ปิด Modal สร้างคำสั่งขาย
  const handleOpenCreateOrderModal = () => {
    setNewOrder({
      id: getNextSONumber(), 
      customer: "",
      date: new Date().toISOString().split("T")[0],
      status: "รอจอง",
      items: [],
      note: "",
    });
    setShowCreateOrderModal(true);
  };
  
  const handleCloseCreateOrderModal = () => {
    setShowCreateOrderModal(false);
  };
  


  // เพิ่มสินค้าใน SO ใหม่
  const handleAddItem = () => {
    if (newOrderItem.part && newOrderItem.quantity > 0) {
      setNewOrder((prevOrder) => ({
        ...prevOrder,
        items: [...prevOrder.items, newOrderItem],
      }));
      setNewOrderItem({ part: "", quantity: "" });
    }
  };

  // บันทึก SO ใหม่


  const handleSaveOrder = async () => {
    if (!newOrder.customer) {
      setToast({
        show: true,
        message: "กรุณาเลือกลูกค้า",
        variant: "warning",
      });
      return;
    }

    if (newOrder.items.length === 0) {
      setShowWarningModal(true);
      return;
    }

    try {
      // 🔁 Map part → product_id จาก stockParts
      const formattedItems = newOrder.items.map((item) => {
        const found = stockParts.find((stock) => stock.value === item.part);
        return {
          product_id: found?.product_id,
          quantity: item.quantity
        };
      });

      const payload = {
        sales_order_no: newOrder.id,
        customer_id: newOrder.customer,
        order_date: newOrder.date,
        required_date: newOrder.required_date,
        po_number: newOrder.po_number,
        note: newOrder.note,
        salesperson_name: newOrder.salesperson_name, 
        order_channel: newOrder.order_channel, 
        items: formattedItems
      };

      // 📡 POST คำสั่งขายจริง
      await axios.post("http://localhost:3000/sales-orders", payload);

      // 📌 โหลดรายการคำสั่งขายใหม่จาก backend
      const response = await axios.get("http://localhost:3000/sales-orders");
      setSalesOrders(response.data);

      setToast({
        show: true,
        message: "✅ บันทึกคำสั่งขายเรียบร้อยแล้ว",
        variant: "success",
      });
      handleCloseCreateOrderModal();
    } catch (error) {
      console.error("❌ เกิดข้อผิดพลาดในการบันทึกคำสั่งขาย:", error);
      setToast({
        show: true,
        message: "❌ ไม่สามารถบันทึกคำสั่งขายได้",
        variant: "danger",
      });
      
    }
  };



  const refreshModalData = async (soId: number) => {
    setLoadingSummary(true);
    try {
      const [sumRes, rsvRes] = await Promise.all([
        axios.get(`http://localhost:3000/sales-orders/${soId}/items-summary`),
        axios.get(`http://localhost:3000/api/reservations/reservations/${soId}`),
      ]);

      setItemSummaries(sumRes.data || []);

      // สร้าง map: product_id -> reservation
      const map: Record<number, any> = {};
      for (const r of (rsvRes.data || [])) {
        if (r.status === 'จองแล้ว' && (!r.used_in_dn_id || r.used_in_dn_id === 0)) {
          map[r.product_id] = r; // เก็บเฉพาะก้อนที่ยังแก้ไขได้
        }
      }
      setReservationsMap(map);

      // ตั้งค่าเริ่มต้นให้ช่องกรอกต่อแถว = จำนวนที่จองอยู่ (ถ้ามี) หรือค่าว่าง
      const startQty: Record<number, any> = {};
      for (const row of (sumRes.data || [])) {
        const current = map[row.product_id]?.quantity_reserved ?? "";
        startQty[row.product_id] = current;
      }
      setRowQty(startQty);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleOpenModal = async (order) => {
    setCurrentOrder(order);
    setShowModal(true);
    await Promise.all([
      refreshModalData(order.id),
      fetchStockParts(),       
    ]);
    
  };








  const handleAddItemNew = async () => {
    if (!newItem.part || !newItem.quantity || !currentOrder) return;

    // หา product_id จาก stockParts
    const found = stockParts.find(p => p.value === newItem.part);
    if (!found?.product_id) {
      alert("ไม่พบสินค้า");
      return;
    }

    try {
      // 1) เขียนลง DB
      await axios.post(`http://localhost:3000/sales-orders/${currentOrder.id}/items`, {
        product_id: found.product_id,
        quantity: Number(newItem.quantity),
      });

      // 2) รีเฟรชตารางสรุป 5 ค่า
      const sumRes = await axios.get(
        `http://localhost:3000/sales-orders/${currentOrder.id}/items-summary`
      );
      setItemSummaries(sumRes.data || []);

      // 3) ล้างอินพุต + แจ้งเตือน
      setNewItem({ part: "", quantity: "" });
      setToast({ show: true, message: "✅ เพิ่มรายการใน SO สำเร็จ", variant: "success" });
    } catch (e) {
      console.error("เพิ่มรายการไม่สำเร็จ", e);
      setToast({ show: true, message: "❌ เพิ่มรายการไม่สำเร็จ", variant: "danger" });
    }
  };









  //  ฟังก์ชันปิด Modal
  const handleCloseModal = () => {
    if (currentOrder) {
      // อัปเดต salesOrders โดยอ้างอิงจาก currentOrder.id
      setSalesOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === currentOrder.id ? { ...order, items: reservedItems } : order
        )
      );
    }

    setNewItem({ part: "", quantity: "" });
    setReservedItems([]); // รีเซ็ต state
    setShowModal(false);
  };




  //  ฟังก์ชันลบ Sales Order
  const handleDeleteOrder = async () => {
    try {
      await axios.delete(`http://localhost:3000/sales-orders/${orderToDelete}`); // 🔥 ลบจริงจาก backend

      const response = await axios.get("http://localhost:3000/sales-orders"); // 🌀 โหลดใหม่
      setSalesOrders(response.data);

      alert("✅ ลบคำสั่งขายเรียบร้อยแล้ว");
    } catch (error) {
      console.error("❌ ลบคำสั่งขายไม่สำเร็จ:", error);
      alert("❌ เกิดข้อผิดพลาดในการลบคำสั่งขาย");
    }

    setShowDeleteModal(false);
  };



  //  ฟังก์ชันเปิด Modal ยืนยันการลบ
  const handleShowDeleteModal = (idOrIndex, type) => {
    if (type === "order") {
      setOrderToDelete(idOrIndex);
    } else if (type === "item") {
      setItemToDelete(idOrIndex);
    }
    setShowDeleteModal(true);
  };

  //  ฟังก์ชันปิด Modal ยืนยันการลบ
  const handleCloseDeleteModal = () => {
    setOrderToDelete(null);
    setItemToDelete(null);
    setShowDeleteModal(false);
  };


  //  ฟังก์ชันยืนยันการลบ
  const handleConfirmDelete = () => {
    if (orderToDelete) {
      handleDeleteOrder(); // ✅ เรียกฟังก์ชันลบจริง
    } else if (itemToDelete !== null) {
      const updatedItems = reservedItems.filter((_, i) => i !== itemToDelete);
      setReservedItems(updatedItems);
      setShowDeleteModal(false);
    }
  };  


  //  ฟังก์ชันลบสินค้าจากคำสั่งขาย
  const handleRemoveItemFromOrder = (index) => {
    const updatedItems = newOrder.items.filter((_, i) => i !== index);
    setNewOrder({ ...newOrder, items: updatedItems });
  };


  // ฟังก์ชันค้นหาคำสั่งขาย
  const filteredOrders = salesOrders.filter((order) => {
    const search = searchTerm.toLowerCase();
    const customerName =
      order.customer_name ||
      customers.find((c) => c.id === order.customer)?.name ||
      "";
  
    return (
      order.sales_order_no?.toLowerCase().includes(search) ||
      order.po_number?.toLowerCase().includes(search) ||
      customerName.toLowerCase().includes(search)
    );
  });

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);




  const fetchStockParts = async () => {
    try {
      const response = await axios.get("http://localhost:3000/products");
      const formatted = response.data.map((item) => ({
        value: item.product_name,
        label: `${item.product_name} (เหลือ: ${item.available} ${item.unit || ""})`,
        available: item.available,
        unit: item.unit,          
        product_id: item.id,
      }));
      setStockParts(formatted);
    } catch (error) {
      console.error("❌ ดึงข้อมูลสินค้าไม่สำเร็จ:", error);
    }
  };

  //  ใช้ใน useEffect ครั้งแรก
  useEffect(() => {
    fetchStockParts();
  }, []);


  const handleOpenDeliveryModal = async (order: any) => {
    setSelectedOrder(order);
    setShowDeliveryModal(true);
    setLoadingDelivery(true);
    setDeliveryPreview(null);
    setDeliverySelectedIds([]);

    try {
      const { data } = await axios.get(
        `http://localhost:3000/sales-orders/${order.id}/for-delivery`
      );
      setDeliveryPreview(data);

      // เลือกอัตโนมัติแถวที่ส่งได้ (reserved_left > 0 && remaining > 0)
      const preselect = (data.items || [])
        .filter((r: any) => Number(r.reserved_left) > 0 && Number(r.remaining) > 0)
        .map((r: any) => Number(r.id));
      setDeliverySelectedIds(preselect);
    } catch (e: any) {
      setToast({
        show: true,
        message: `❌ โหลดข้อมูลส่งไม่สำเร็จ: ${e?.response?.data?.message || e.message}`,
        variant: "danger",
      });
      setShowDeliveryModal(false);
    } finally {
      setLoadingDelivery(false);
    }
  };


  const handleGoToDeliveryFromReserve = async () => {
    if (!currentOrder) return;
    // ปิด modal จองก่อน กันสอง modal ซ้อนกัน
    setShowModal(false);
    // เปิด modal ส่ง + โหลดพรีวิวรายการที่จะส่ง (ใช้ฟังก์ชันที่เรามีแล้ว)
    await handleOpenDeliveryModal(currentOrder);
  };





  const deliverySelectedQty = () => {
    if (!deliveryPreview) return 0;
    return (deliveryPreview.items || [])
      .filter((r: any) => deliverySelectedIds.includes(Number(r.id)))
      .reduce((s: number, r: any) => s + Number(r.reserved_left || 0), 0);
  };

  const toggleSelectDelivery = (id: number) => {
    setDeliverySelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  
  const handleSendNow = async () => {
    if (!selectedOrder) return;
    if (deliverySelectedIds.length === 0) {
      setToast({ show: true, message: "⚠️ กรุณาเลือกรายการที่จะส่ง", variant: "warning" });
      return;
    }

    setSendingNow(true);
    try {
      const { data } = await axios.post(
        "http://localhost:3000/api/delivery-notes/send-now",
        { sales_order_id: selectedOrder.id, item_ids: deliverySelectedIds },
        { headers: { "Content-Type": "application/json" } }
      );

      // แจ้งผลและรีโหลดตาราง SO
      setToast({
        show: true,
        message: `✅ ส่งสำเร็จ • DN: ${data?.pair?.dn_no} • Invoice: ${data?.pair?.inv_no}`,
        variant: "success",
      });

      setShowDeliveryModal(false);
      setDeliveryPreview(null);
      setDeliverySelectedIds([]);

      const soRes = await axios.get("http://localhost:3000/sales-orders");
      setSalesOrders(soRes.data);
    } catch (e: any) {
      setToast({
        show: true,
        message: `❌ ส่งไม่สำเร็จ: ${e?.response?.data?.message || e.message}`,
        variant: "danger",
      });
    } finally {
      setSendingNow(false);
    }
  };


  const canOpenDelivery = itemSummaries.some(r =>
    Number(r.remaining || 0) > 0 && Number(r.reserved_total || 0) > 0
  );


  


  const handleReserveNow = async (row: any) => {
    if (!currentOrder) return;

    const productId = getProductIdFromRow(row);
    if (!productId) {
      setToast({ show: true, message: "❌ หา product_id ไม่เจอ", variant: "danger" });
      return;
    }

    const qty = Number(reserveNowQty[productId] || 0);
    const maxAllow = Math.min(Number(row.remaining || 0), Number(row.available || 0));

    if (!qty || qty <= 0) {
      setToast({ show: true, message: "⚠️ กรุณาใส่จำนวนที่ต้องการจอง", variant: "warning" });
      return;
    }
    if (qty > maxAllow) {
      setToast({
        show: true,
        message: `⚠️ จำนวนจองเกินที่อนุญาต (จองได้สูงสุด ${maxAllow})`,
        variant: "warning",
      });
      return;
    }

    try {
      await axios.post("http://localhost:3000/api/reservations/reserve-item", {
        sales_order_id: currentOrder.id,
        product_id: productId,
        quantity: qty,
      });

      // รีเฟรชสรุป 5 ค่า
      const sumRes = await axios.get(
        `http://localhost:3000/sales-orders/${currentOrder.id}/items-summary`
      );
      setItemSummaries(sumRes.data || []);

      await refreshModalData(currentOrder.id);
      await fetchStockParts();


      // รีเฟรชรายการ SO เพื่ออัปเดตสถานะ (รอจอง/จองบางส่วน/จองทั้งหมด)
      const soRes = await axios.get("http://localhost:3000/sales-orders");
      setSalesOrders(soRes.data);

      // ล้างจำนวนในช่องของสินค้านี้
      setReserveNowQty(prev => ({ ...prev, [productId]: 0 }));

      setToast({ show: true, message: "✅ จองรอบนี้สำเร็จ", variant: "success" });
    } catch (e:any) {
      const msg = e?.response?.data?.message || "จองไม่สำเร็จ";
      setToast({ show: true, message: `❌ ${msg}`, variant: "danger" });
    }
  };


  const maxReserveForRow = (row: any) => {
    // row จาก /items-summary จะมี ordered, reserved_total, delivered_total, remaining, available
    const remainingNotYetReserved = Math.max((row.remaining ?? 0) - (row.reserved_total ?? 0), 0);
    const availableNow = Number(row.available ?? 0);
    return Math.min(remainingNotYetReserved, availableNow);
  };



  // POST: จองครั้งแรก
  const handleReserveRow = async (productId: number) => {
    if (!currentOrder) return;
    const q = Number(rowQty[productId] || 0);
    if (!q || q <= 0) return setToast({ show: true, message: "กรุณากรอกจำนวนให้ถูกต้อง", variant: "warning" });

    try {
      await axios.post("http://localhost:3000/api/reservations/reserve-item", {
        sales_order_id: currentOrder.id,
        product_id: productId,
        quantity: q,
      });

      setToast({ show: true, message: "✅ จองสำเร็จ", variant: "success" });
      await refreshModalData(currentOrder.id);
      await fetchStockParts(); 

      // รีเฟรชสถานะ SO บนหน้ารายการ
      const soRes = await axios.get("http://localhost:3000/sales-orders");
      setSalesOrders(soRes.data);
    } catch (e: any) {
      setToast({ show: true, message: `❌ จองไม่สำเร็จ: ${e?.response?.data?.message || "เกิดข้อผิดพลาด"}`, variant: "danger" });
    }
  };

  // PUT: อัปเดตจำนวนรวมของแถวจอง
  const handleUpdateReserveRow = async (productId: number) => {
    if (!currentOrder) return;
    const r = reservationsMap[productId];
    if (!r?.id) return;

    const newQty = Number(rowQty[productId] || 0);
    if (!newQty || newQty <= 0) return setToast({ show: true, message: "กรุณากรอกจำนวนให้ถูกต้อง", variant: "warning" });

    try {
      await axios.put(`http://localhost:3000/api/reservations/reserve-item/${r.id}`, {
        quantity: newQty,
      });
      setToast({ show: true, message: "✅ อัปเดตจำนวนจองสำเร็จ", variant: "success" });
      await refreshModalData(currentOrder.id);
      await fetchStockParts(); 

      const soRes = await axios.get("http://localhost:3000/sales-orders");
      setSalesOrders(soRes.data);
    } catch (e: any) {
      setToast({ show: true, message: `❌ อัปเดตไม่สำเร็จ: ${e?.response?.data?.message || "เกิดข้อผิดพลาด"}`, variant: "danger" });
    }
  };

  // PATCH: ยกเลิกแถวจอง
  const handleCancelReserveRow = async (productId: number) => {
    if (!currentOrder) return;
    const r = reservationsMap[productId];
    if (!r?.id) return;

    try {
      await axios.patch(`http://localhost:3000/api/reservations/reserve-item/${r.id}/cancel`);
      setToast({ show: true, message: "✅ ยกเลิกการจองแล้ว", variant: "success" });
      await refreshModalData(currentOrder.id);
      await fetchStockParts(); 

      const soRes = await axios.get("http://localhost:3000/sales-orders");
      setSalesOrders(soRes.data);
    } catch (e: any) {
      setToast({ show: true, message: `❌ ยกเลิกไม่สำเร็จ: ${e?.response?.data?.message || "เกิดข้อผิดพลาด"}`, variant: "danger" });
    }
  };


  // ✅ ลบ (soft delete) รายการสินค้าออกจาก SO ปัจจุบัน
  const handleSoftDeleteSoItem = async (productId: number) => {
    if (!currentOrder) return;

    try {
      // เปลี่ยนมาใช้ PUT + path ให้ตรง backend
      await axios.put(
        `http://localhost:3000/sales-orders/${currentOrder.id}/items/${productId}/soft-delete`
      );

      setToast({ show: true, message: "✅ ลบรายการสินค้าแล้ว", variant: "success" });

      // รีเฟรชข้อมูลใน modal + dropdown สินค้า
      await Promise.all([refreshModalData(currentOrder.id), fetchStockParts()]);

      // อัปเดตรายการ SO (เพื่อ status)
      const soRes = await axios.get("http://localhost:3000/sales-orders");
      setSalesOrders(soRes.data);
    } catch (e: any) {
      console.log("soft-delete error:", e?.response?.data);
      const msg = e?.response?.data?.message || "ลบไม่สำเร็จ";
      setToast({ show: true, message: `❌ ${msg}`, variant: "danger" });
    }
  };














  return (
    <div className="container-fluid mt-4">
      <h1 className="text-primary">🚚 Sales & Delivery Management</h1>
      

      
      {/* ปุ่มสร้างคำสั่งขาย */}
      <Button variant="success" className="mb-3" onClick={handleOpenCreateOrderModal}>
        ➕ สร้างรายการขาย {/*สร้างคำสั่งขาย*/}
      </Button>
      {/* 🔍 ช่องค้นหาคำสั่งขาย */}
      <input
        type="text"
        className="form-control mb-3"
        placeholder="🔍 ค้นหารหัส SO ชื่อลูกค้า หรือเลขใบสั่งซื้อ..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}  
      />

      {/* 📋 ตารางแสดง Sales Order */}
      <Table striped bordered hover>
        <thead>
          <tr>
            <th style={{ width: "9%" }}>รหัส SO</th>
            <th style={{ width: "20%" }}>ลูกค้า</th>
            <th style={{ width: "10%" }}>เลขที่ใบสั่งซื้อ</th>            
            <th style={{ width: "6%" }}>วันที่บันทึก</th>
            <th style={{ width: "6%" }}>วันที่ต้องการ</th>
            <th style={{ width: "6%" }}>วันที่ส่งล่าสุด</th>
            <th style={{ width: "8%" }}>สถานะ</th>
            <th style={{ width: "25%" }}>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.length > 0 ? (
            filteredOrders
            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
            .map((order, index) => (
              <tr key={index}>
                <td>{order.sales_order_no}</td>
                <td>
                  {order.customer_name ||
                    customers.find((c) => c.id === order.customer)?.name ||
                    "ไม่พบลูกค้า"}
                </td>
                <td>{order.po_number || "-"}</td>
                <td>{new Date(order.order_date).toLocaleDateString("th-TH")}</td>
                <td>
                  {order.required_date
                    ? new Date(order.required_date).toLocaleDateString("th-TH")
                    : "-"}
                </td>
                <td>
                  {order.last_delivery_date
                    ? new Date(order.last_delivery_date).toLocaleDateString("th-TH")
                    : <span className="text-muted">-</span>}
                </td>
                <td>{order.status}</td>
                <td style={{ whiteSpace: "nowrap", minWidth: "200px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    <Button
                      variant={order.status === "รอจอง" ? "info" : "warning"}
                      style={{ width: "90px" }}
                      onClick={() => handleOpenModal(order)}
                    >
                      {order.status === "รอจอง" ? "📦 จอง" : "✏️ แก้ไข"}
                    </Button>
                    <Button
                      variant="danger"
                      style={{ width: "90px" }}
                      onClick={() => handleShowDeleteModal(order.id, "order")}
                    >
                      🗑️ ลบ
                    </Button>
                    <Button
                      variant="success"
                      style={{ width: "90px" }}
                      onClick={() => handleOpenDeliveryModal(order)} 
                      disabled={order.status === "รอจอง"} // ยังไม่จอง ห้ามส่ง
                    >
                      🚚 ส่ง
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="text-center text-muted">
                ❌ ไม่พบข้อมูลที่ค้นหา
              </td>
            </tr>
          )}  
          
        </tbody>
      </Table>

      <div style={{ display: "flex", justifyContent: "center", marginTop: "10px", gap: "10px" }}>
        <Button
          variant="secondary"
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          ◀️ ก่อนหน้า
        </Button>
        <span>หน้า {currentPage} / {totalPages}</span>
        <Button
          variant="secondary"
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          ถัดไป ▶️
        </Button>
      </div>    


      {/*  Modal สำหรับจอง Stock */}
        <CustomModal
        show={showModal}
        onClose={handleCloseModal}
        title={`📦 รายการขาย: ${currentOrder?.sales_order_no || "-"} | ลูกค้า: ${currentOrder?.customer_name || "-"} | PO: ${currentOrder?.po_number || "-"}`}
        size="xl"
      >
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>เลือกสินค้า</Form.Label>
            <Select
              options={stockParts}
              onChange={(selected) =>
                setNewItem({
                  ...newItem,
                  part: selected.value,
                  available: selected.available,
                  unit: selected.unit,
                })
              }
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>จำนวน (เหลือ: {newItem.available ?? 0} {newItem.unit || ""})</Form.Label>
            <Form.Control
              type="number"
              min={1}
              max={newItem.available ?? 0}
              placeholder="ระบุจำนวน"
              value={newItem.quantity}
              onChange={(e) => {
                let value = parseInt(e.target.value, 10);
                if (value > (newItem.available ?? 0)) value = newItem.available;
                if (value < 1) value = 1;
                setNewItem({ ...newItem, quantity: value });
              }}
            />
          </Form.Group>

          <Button variant="success" onClick={handleAddItemNew}>
            ➕ เพิ่มรายการขาย
          </Button>

          {/* รายการที่จอง */}
          <h5 className="mt-3">📊 สรุปต่อสินค้าในใบนี้</h5>

          {loadingSummary ? (
            <div className="text-muted">กำลังโหลด...</div>
          ) : (
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>สินค้า</th>
                  <th style={{ width: "9%", textAlign: "right" }}>Ordered</th>
                  <th style={{ width: "9%", textAlign: "right" }}>Reserved</th>
                  <th style={{ width: "9%", textAlign: "right" }}>Delivered</th>
                  <th style={{ width: "9%", textAlign: "right" }}>Remaining</th>
                  <th style={{ width: "9%", textAlign: "right" }}>Available</th>
                  <th style={{ width: "27%" }}>จองรอบนี้</th>
                </tr>
              </thead>
              <tbody>
                {itemSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted">
                      ไม่มีรายการสินค้าใน SO นี้
                    </td>
                  </tr>
                ) : (
                  itemSummaries.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="fw-semibold">{row.name || "-"}</div>
                        <div className="text-muted" style={{ fontSize: 12 }}>
                          {row.product_no ? `รหัส: ${row.product_no}` : ""}
                        </div>
                      </td>
                      <td className="text-end">{row.ordered ?? 0}</td>
                      <td className="text-end">{row.reserved_total ?? 0}</td>
                      <td className="text-end">{row.delivered_total ?? 0}</td>
                      <td className="text-end">{row.remaining ?? 0}</td>
                      <td className="text-end">{row.available ?? 0}</td>

                      {/* หน้าการจอง */}
                      <td>
                        {(() => {
                          const pid = getProductIdFromRow(row);
                          if (!pid) {
                            return <span className="text-danger">ไม่พบ product_id</span>;
                          }

                          const r = reservationsMap[pid]; // ถ้ามี = เคยจองแล้ว (รูปแบบ “ตั้งค่าเป็นยอดรวมใหม่”)
                          const addable = maxReserveForRow(row); // = min(remainingNotYetReserved, availableNow)
                          const hasDelivered = Number(row.delivered_total || 0) > 0;

                          if (!r) {
                            // --------- ยังไม่เคยจอง: โหมด "จองครั้งแรก" ---------
                            const v = Number(reserveNowQty[pid] ?? 0);
                            const maxFirst = Math.min(Number(row.remaining || 0), Number(row.available || 0));
                            return (
                              <>
                                <div className="d-flex align-items-center gap-2">
                                  <Form.Control
                                    type="number"
                                    style={{ maxWidth: 110 }}
                                    min={1}
                                    max={maxFirst}
                                    placeholder="ตัวเลข"
                                    value={v || ""}
                                    onChange={(e) => {
                                      let n = parseInt(e.target.value || "0", 10);
                                      if (n < 0) n = 0;
                                      if (n > maxFirst) n = maxFirst;
                                      setReserveNowQty(prev => ({ ...prev, [pid]: n }));
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    variant="success"
                                    onClick={() => handleReserveNow(row)}
                                    disabled={!(v > 0 && v <= maxFirst)}
                                  >
                                    📦 จอง
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => {
                                      const pid = getProductIdFromRow(row);
                                      if (!pid) return;
                                      openConfirm({
                                        title: "ยืนยันการลบ",
                                        body: "คุณต้องการลบรายการสินค้านี้ออกจาก SO จริงหรือไม่?",
                                        variant: "danger",
                                        onConfirm: async () => {
                                          await handleSoftDeleteSoItem(pid);  // ← ฟังก์ชันใหม่ในข้อ 4)
                                          closeConfirm();
                                        },
                                      });
                                    }}
                                  >
                                    🗑️ ลบ
                                  </Button>
                                </div>
                                <div className="text-muted" style={{ fontSize: 12 }}>
                                  จองได้สูงสุด: {maxFirst}
                                </div>
                              </>
                            );
                          }

                          // --------- เคยจองแล้ว: โหมด "อัปเดตยอดรวมใหม่" ---------
                          const oldReserved = Number(r.quantity_reserved || 0);
                          const maxNewTotal = oldReserved + addable; // ยอดรวมใหม่สูงสุดที่ตั้งได้
                          const currentInput = rowQty[pid] ?? oldReserved; // ค่าเริ่มต้นให้เท่ากับที่จองอยู่
                          const newVal = Number(currentInput || 0);

                          const disableUpdate =
                            !newVal || newVal < 1 ||
                            newVal > maxNewTotal ||
                            newVal === oldReserved; // ไม่กดอัปเดตถ้าไม่ได้เปลี่ยน

                          return (
                            <>
                              <div className="d-flex align-items-center gap-2">
                                <Form.Control
                                  type="number"
                                  style={{ maxWidth: 110 }}
                                  min={1}
                                  max={maxNewTotal}
                                  value={currentInput}
                                  onChange={(e) => {
                                    let n = parseInt(e.target.value || "0", 10);
                                    if (n < 0) n = 0;
                                    if (n > maxNewTotal) n = maxNewTotal;
                                    setRowQty(prev => ({ ...prev, [pid]: n }));
                                  }}
                                />
                                <Button
                                  size="sm"
                                  variant="warning"
                                  onClick={() => handleUpdateReserveRow(pid)}
                                  disabled={disableUpdate}
                                >
                                  ✏️ อัปเดต
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  disabled={hasDelivered}
                                  onClick={() =>
                                    openConfirm({
                                      title: "ยืนยันการยกเลิก",
                                      body: "คุณต้องการยกเลิกการจองสินค้านี้ใช่หรือไม่?",
                                      variant: "warning",
                                      onConfirm: async () => {
                                        await handleCancelReserveRow(pid); // ← ฟังก์ชันเดิมของคุณ
                                        closeConfirm();
                                      },
                                    })
                                  }
                                >
                                  ❌ ยกเลิก
                                </Button>
                              </div>
                              <div className="text-muted" style={{ fontSize: 12 }}>
                                ยอดจองได้ทั้งหมดสูงสุด: {maxNewTotal}
                                {addable > 0 ? ` (เพิ่มได้อีก ${addable})` : " (เพิ่มไม่ได้แล้ว)"}
                              </div>
                            </>
                          );
                        })()}
                      </td>



                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}

          {/* ปุ่มล่างสุด */}
          <div className="d-flex justify-content-end gap-2 mt-3">
            <Button variant="secondary" onClick={handleCloseModal}>
              ปิด
            </Button>
           
            <Button variant="success" onClick={handleGoToDeliveryFromReserve} disabled={!canOpenDelivery}>
              🚚 ส่ง
            </Button>
          </div>
        </Form>
      </CustomModal>



      {/*  Modal ยืนยันการลบ */}
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal}>
        <Modal.Header closeButton>
          <Modal.Title>❗ ยืนยันการลบ</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          คุณแน่ใจหรือไม่ว่าต้องการลบ 
          {orderToDelete ? " Sales Order นี้?" : " รายการที่จองนี้?"}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteModal}>
            ยกเลิก
          </Button>
          <Button variant="danger" onClick={handleDeleteOrder}>
            ลบ
          </Button>
        </Modal.Footer>
      </Modal>



      

      {/* Modal สร้างคำสั่งขาย */}
      <CustomModal
        show={showCreateOrderModal}
        onClose={handleCloseCreateOrderModal}
        title="➕ รายการขาย"
      >
        <Form>
          <Form.Group>
            <Form.Label>รหัส SO</Form.Label>
            <Form.Control
              type="text"
              value={newOrder.id}
              onChange={(e) =>
                setNewOrder({ ...newOrder, id: e.target.value })
              }
            />
          </Form.Group>

          <Form.Group>
            <Form.Label>ลูกค้า</Form.Label>
            <Select
              options={customers.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              onChange={(selected) =>
                setNewOrder({ ...newOrder, customer: selected.value })
              }
            />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>เลขที่ใบสั่งซื้อของลูกค้า (PO)</Form.Label>
            <Form.Control
              type="text"
              value={newOrder.po_number || ""}
              onChange={(e) =>
                setNewOrder({ ...newOrder, po_number: e.target.value })
              }
              placeholder="ระบุเลข PO ลูกค้า (ถ้ามี)"
            />
          </Form.Group>

          
          <Form.Group className="mb-2">
            <Form.Label>วันที่ที่ลูกค้าต้องการรับของ</Form.Label>
            <Form.Control
              type="date"
              value={newOrder.required_date || ""}
              onChange={(e) =>
                setNewOrder({ ...newOrder, required_date: e.target.value })
              }
            />
          </Form.Group>



          {/* ส่วนเพิ่มสินค้าใน SO ใหม่ */}
          <Form.Group className="mb-3">
            <Form.Label>เลือกสินค้า</Form.Label>
            <Select
              options={stockParts}
              onChange={(selected) =>
                setNewOrder((prev) => ({
                  ...prev,
                  items: [...prev.items, { part: selected.value, quantity: 1 }],
                }))
              }
            />
          </Form.Group>


          

          {/* ตารางรายการสินค้า */}
          {newOrder.items.length > 0 && (
            <>
              <h5 className="mt-4">📋 รายการสินค้าที่เลือก</h5>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th style={{ width: "60%" }}>สินค้า</th>
                    <th style={{ width: "20%", textAlign: "center" }}>จำนวน</th>
                    <th style={{ width: "20%", textAlign: "center" }}>ลบ</th>
                  </tr>
                </thead>
                <tbody>
                  {newOrder.items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.part}</td>
                      <td>
                        <Form.Control
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const updatedItems = [...newOrder.items];
                            updatedItems[index].quantity = parseInt(e.target.value, 10) || 1;
                            setNewOrder({ ...newOrder, items: updatedItems });
                          }}
                        />
                      </td>
                      <td className="text-center">
                        <Button
                          variant="danger"
                          onClick={() => handleRemoveItemFromOrder(index)}
                        >
                          🗑️ ลบ
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}

          {/* หมายเหตุ */}
          <Form.Group>
            <Form.Label>หมายเหตุ</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={newOrder.note}
              onChange={(e) =>
                setNewOrder({ ...newOrder, note: e.target.value })
              }
            />
          </Form.Group>

          {/* ปุ่มด้านล่าง */}
          <div className="d-flex justify-content-end gap-2 mt-3">
            <Button variant="secondary" onClick={handleCloseCreateOrderModal}>
              ❌ ยกเลิก
            </Button>
            <Button variant="success" onClick={handleSaveOrder}>
              ✅ บันทึกคำสั่งขาย
            </Button>
          </div>
        </Form>
      </CustomModal>


      {/* Modal แจ้งเตือนกรณีไม่มีสินค้า */}
      <Modal show={showWarningModal} onHide={() => setShowWarningModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>⚠️ แจ้งเตือน</Modal.Title>
        </Modal.Header>
        <Modal.Body>คำสั่งขายนี้ยังไม่มีสินค้า คุณต้องการบันทึกโดยไม่มีสินค้าหรือไม่?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowWarningModal(false)}>❌ ยกเลิก</Button>
          <Button variant="success" onClick={handleSaveOrder}>✅ บันทึก</Button>
        </Modal.Footer>
      </Modal> 


      {/* ✅ Modal ส่งของ */}
      <CustomModal
        show={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
        title={`🚚 ส่งของ: ${selectedOrder?.sales_order_no || "-"}`}
        size="lg"
      >
        {loadingDelivery ? (
          <div className="text-muted">กำลังโหลด...</div>
        ) : !deliveryPreview ? (
          <div className="text-danger">โหลดข้อมูลไม่สำเร็จ</div>
        ) : (
          <>
            <div className="mb-2">
              สถานะ SO: <b>{deliveryPreview.sales_order?.status}</b>
            </div>

            <Table striped bordered hover>
              <thead>
                <tr>
                  <th style={{ width: "6%" }}>เลือก</th>
                  <th style={{ width: "18%" }}>รหัส</th>
                  <th>สินค้า</th>
                  <th style={{ width: "10%", textAlign: "right" }}>Ordered</th>
                  <th style={{ width: "10%", textAlign: "right" }}>Delivered</th>
                  <th style={{ width: "10%", textAlign: "right" }}>Remaining</th>
                  <th style={{ width: "12%", textAlign: "right" }}>Reserved รอบนี้</th>
                  <th style={{ width: "10%", textAlign: "right" }}>Available</th>
                </tr>
              </thead>
              <tbody>
                {(deliveryPreview.items || []).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-muted">ไม่มีสินค้าใน SO นี้</td>
                  </tr>
                ) : (
                  deliveryPreview.items.map((r: any) => {
                    const disabled = Number(r.reserved_left) <= 0 || Number(r.remaining) <= 0;
                    const checked = deliverySelectedIds.includes(Number(r.id));
                    return (
                      <tr key={r.id}>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            disabled={disabled}
                            checked={checked && !disabled}
                            onChange={() => toggleSelectDelivery(Number(r.id))}
                          />
                        </td>
                        <td>{r.product_no}</td>
                        <td>{r.product_name}</td>
                        <td className="text-end">{r.ordered}</td>
                        <td className="text-end">{r.delivered}</td>
                        <td className="text-end">{r.remaining}</td>
                        <td className="text-end">{r.reserved_left}</td>
                        <td className="text-end">{r.available}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>

            <div className="d-flex justify-content-between align-items-center">
              <div className="text-muted">
                เลือก {deliverySelectedIds.length} รายการ / รวม {deliverySelectedQty()} ชิ้น
              </div>
              <div className="d-flex gap-2">
                <Button variant="secondary" onClick={() => setShowDeliveryModal(false)}>
                  ปิด
                </Button>
                <Button
                  variant="success"
                  onClick={handleSendNow}
                  disabled={deliverySelectedIds.length === 0 || sendingNow}
                >
                  {sendingNow ? "กำลังส่ง..." : "🚚 ส่งทันที"}
                </Button>
              </div>
            </div>
          </>
        )}
      </CustomModal>

        



      <AlertToast
        show={toast.show}
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast({ ...toast, show: false })}
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

export default SalesDelivery;
