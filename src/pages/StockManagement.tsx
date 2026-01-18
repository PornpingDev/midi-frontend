import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import CustomModal from '../components/common/CustomModal'; 
import AlertToast from '../components/common/AlertToast';
import AlertModal from '../components/common/AlertModal';
import FileUploadSection from "../components/common/FileUploadSection";
import ProductSupplierSection from "../components/common/ProductSupplierSection";



import axios from "axios";
import { useEffect } from "react";

const ALLOWED_UNITS = ['ชิ้น','กล่อง','ตัว','ชุด','แผ่น','ม้วน','เส้น','แท่ง','คู่','ดอก','ใบ'];

const isBomCode = (code) => /^BOM-/i.test(String(code ?? '').trim());

const StockManagement = () => {

  const navigate = useNavigate();

 

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [newCustomerPrice, setNewCustomerPrice] = useState("");

  const [editingPriceId, setEditingPriceId] = useState(null);
  const [editedPrice, setEditedPrice] = useState("");

  const [showAddSuccessModal, setShowAddSuccessModal] = useState(false);
  const [lastAddedProductNo, setLastAddedProductNo] = useState("");



  const [toast, setToast] = useState({
    show: false,
    message: '',
    variant: 'success'
  });




  const fetchProducts = async () => {
    try {
      const response = await axios.get("/products");
      const data = response.data.map((item) => ({
        id: item.id,                     
        product_no: item.product_no,
        name: item.product_name,
        stock: item.stock,
        reserved: item.reserved,
        available: item.available,
        cost: item.cost,
        price: item.price,
        leadTime: item.lead_time,
        unit: item.unit,
        reorderPoint: item.reorder_point ?? "",
        prices: []        

      }));
      setProducts(data);
    } catch (error) {
      console.error("❌ ดึงข้อมูลสินค้าล้มเหลว:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);


  // 🔍 State สำหรับเก็บค่าค้นหา
  const [searchQuery, setSearchQuery] = useState("");
  const [maxStockFilter, setMaxStockFilter] = useState("");

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, maxStockFilter]);




  // 🏷 State สำหรับ Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPrices, setSelectedPrices] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [newProduct, setNewProduct] = useState({
   id: "", name: "", stock: "", cost: "", price: "", leadTime: "", unit: "ชิ้น",
   reorderPoint: "" 
  });
  



  






  // 🛠 ฟังก์ชันกรองสินค้า (ให้ค้นหาแบบไม่สนใจตัวพิมพ์เล็ก-ใหญ่)
  // 🛠 ฟังก์ชันกรองสินค้า (ค้นหาชื่อ/รหัส + เงื่อนไขคงเหลือ)
  const filteredProducts = products.filter((product) => {
    const matchText =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.product_no.toLowerCase().includes(searchQuery.toLowerCase());

    if (maxStockFilter === "") return matchText;

    const limit = Number(maxStockFilter);
    if (Number.isNaN(limit)) return matchText;

    return matchText && Number(product.stock) < limit;
  });

  

  const fetchCustomers = async () => {
    try {
      const res = await axios.get("/customers");
      setCustomers(res.data);
    } catch (err) {
      console.error("❌ ดึงข้อมูลลูกค้าล้มเหลว:", err);
    }
  };




  // 📊 เปิด Modal พร้อมข้อมูลราคาขาย
  const handleShowPrices = async (productId) => {
    try {
      const response = await axios.get(`/product-prices?product_id=${productId}`);
      setSelectedPrices(response.data);
      setShowModal(true);
    } catch (error) {
      console.error("❌ ดึงราคาขายล้มเหลว:", error);
      showToast("❌ ไม่สามารถโหลดราคาขายได้", "danger");
    }
  };


  // ❌ เปิด Modal ยืนยันการลบสินค้า
  const handleShowDeleteModal = (id) => {
    setDeleteProductId(id);
    setShowDeleteModal(true);
  };

  // ❌ ลบสินค้า
  const handleDelete = async () => {
    try {
      await axios.delete(`/products/${deleteProductId}`);
      await fetchProducts(); // ดึงข้อมูลใหม่ให้ sync กับ DB
      setShowDeleteModal(false);
    } catch (err) {
      console.error("❌ ลบสินค้าล้มเหลว:", err);
      showToast("❌ ไม่สามารถลบสินค้าได้", "danger");
    }
  };



  // ➕ เพิ่มสินค้าใหม่
  const handleAddProduct = async () => {
    if (
      !newProduct.id ||
      !newProduct.name ||
      newProduct.stock === "" ||
      newProduct.cost === "" ||
      newProduct.price === "" ||
      newProduct.leadTime === "" ||
      !newProduct.unit
    ) {
      showToast("กรุณากรอกข้อมูลให้ครบถ้วน", "warning");
      return;
    }

    try {
      await axios.post("/products", {
        product_no: newProduct.id,
        product_name: newProduct.name,
        cost: Number(newProduct.cost),
        price: Number(newProduct.price),
        stock: Number(newProduct.stock),
        reorder_point: newProduct.reorderPoint === "" ? null : Number(newProduct.reorderPoint),
        lead_time: Number(newProduct.leadTime),
        unit: newProduct.unit, // ✅ ส่งหน่วยไป backend
      });

      await fetchProducts();
      setShowAddModal(false);
      showToast("✅ เพิ่มสินค้าสำเร็จแล้ว", "success");

      setLastAddedProductNo(newProduct.id);
      setShowAddSuccessModal(true);

      setNewProduct({
        id: "",
        name: "",
        stock: "",
        cost: "",
        price: "",
        leadTime: "",
        unit: "ชิ้น",
        reorderPoint: ""
      });
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการเพิ่มสินค้า:", error);
      const emsg = error?.response?.data?.message || "❌ เกิดข้อผิดพลาดในการเพิ่มสินค้า";
      showToast(emsg, "danger");
    }
  };










  // 🔄 Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);

  // ✏️ เปิด Modal แก้ไขสินค้า
  const handleShowEditModal = async (product) => {
    try {
      // 👉 1. ดึงราคาขายเฉพาะลูกค้าจาก API
      const res = await axios.get(`/product-prices?product_id=${product.id}`);

      // 👉 2. รวมข้อมูล product + prices
      setSelectedProduct({
        ...product,
        unit: product.unit ?? "ชิ้น",
        reorderPoint: product.reorderPoint ?? "",
        prices: res.data, // 🟢 เพิ่มราคาขายเฉพาะลูกค้าเข้าไป
      });

      setShowEditModal(true);
    } catch (error) {
      console.error("❌ ดึงราคาขายเฉพาะลูกค้าไม่สำเร็จ:", error);
      showToast("❌เกิดข้อผิดพลาดในการโหลดราคาขายเฉพาะลูกค้า", "danger");
    }
  };


  // 💾 บันทึกการแก้ไขสินค้า
/*  
  const handleEditProduct = () => {
    if (!selectedProduct.id || !selectedProduct.name || !selectedProduct.stock || !selectedProduct.cost || !selectedProduct.price || !selectedProduct.leadTime) {
        setShowErrorModal(true);
        return;
      }
      setProducts(products.map((p) => (p.id === selectedProduct.id ? selectedProduct : p)));
      setShowEditModal(false);
  };
*/

  // 💾 บันทึกการแก้ไขสินค้า (persist ไป backend ด้วย)
  const handleEditProduct = async () => {
    const p = selectedProduct;
    if (
      !p?.product_no || 
      !p?.id ||
      p.stock === "" ||
      p.cost === "" ||
      p.price === "" ||
      p.leadTime === "" ||
      !p.name ||
      !p.unit
    ) {
      setShowErrorModal(true);
      return;
    }

    try {
      await axios.put(`/products/${p.id}`, {
        product_no: p.product_no,
        product_name: p.name,
        cost: Number(p.cost),
        price: Number(p.price),
        stock: Number(p.stock),
        reorder_point: p.reorderPoint === "" ? null : Number(p.reorderPoint),
        lead_time: Number(p.leadTime),
        unit: p.unit, 
      });

      await fetchProducts();
      setShowEditModal(false);
      showToast("✅ บันทึกการแก้ไขสินค้าเรียบร้อย", "success");
    } catch (error) {
      console.error("❌ แก้ไขสินค้าล้มเหลว:", error);
      const emsg = error?.response?.data?.message || "❌ ไม่สามารถแก้ไขสินค้าได้";
      showToast(emsg, "danger");
    }
  };


  const handleAddCustomerPrice = async () => {
    if (!selectedCustomerId || !newCustomerPrice || !selectedProduct?.id) {
      showToast("❌กรุณาเลือกลูกค้าและกรอกราคาขายให้ครบถ้วน", "warning");
      return;
    }

    try {
      await axios.post("/product-prices", {
        product_id: selectedProduct.id,
        customer_id: selectedCustomerId,
        price: newCustomerPrice,
      });

      //  โหลดสินค้าทั้งหมดใหม่
      await fetchProducts();

      //  โหลดข้อมูลสินค้าตัวนั้นใหม่เข้า modal เพื่อให้ราคาล่าสุดแสดง
      const latestProduct = products.find(p => p.id === selectedProduct.id);
      if (latestProduct) {
        await handleShowEditModal(latestProduct);
      }

      //  ล้างช่องกรอก
      setSelectedCustomerId("");
      setNewCustomerPrice("");

    } catch (err) {
      console.error("❌ เพิ่มราคาขายเฉพาะลูกค้าล้มเหลว:", err);
      showToast("❌ ไม่สามารถเพิ่มราคาขายเฉพาะลูกค้าได้", "danger");
    }
  };
  

  const handleSaveEditPrice = async (priceId) => {
    try {
      await axios.put(`/product-prices/${priceId}`, {
        price: editedPrice,
      });

      const latestProduct = products.find(p => p.id === selectedProduct.id);
      if (latestProduct) {
        await handleShowEditModal(latestProduct);
      }

      setEditingPriceId(null);
      setEditedPrice("");

    } catch (err) {
      console.error("❌ แก้ไขราคาล้มเหลว:", err);
      showToast("❌ ไม่สามารถแก้ไขราคาได้", "danger");
    }
  };


  const handleDeletePrice = async (priceId) => {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบราคานี้?")) return;

    try {
      await axios.delete(`/product-prices/${priceId}`);

      const latestProduct = products.find(p => p.id === selectedProduct.id);
      if (latestProduct) {
        await handleShowEditModal(latestProduct);
      }

    } catch (err) {
      console.error("❌ ลบราคาล้มเหลว:", err);
      showToast("❌ ไม่สามารถลบราคานี้ได้", "danger");
    }
  };



  const showToast = (message, variant = 'success') => {
    setToast({ show: true, message, variant });
  };



  // 🛒 สั่งซื้ออัตโนมัติ (สร้าง PO 1 ใบจากสินค้า 1 ตัว)
  const handleAutoPO = async (product_no) => {
    if (!product_no) return;

    // กัน BOM-
    if (isBomCode(product_no)) {
      showToast("⚠️ สินค้า BOM ไม่สามารถสั่งซื้อได้", "warning");
      return;
    }

    try {
      const res = await axios.post("/purchase-orders/auto-one", {
        product_no: product_no,
      });

      showToast(`✅ สั่งซื้อสำเร็จ • ${res.data?.po_no || "-"}`, "success");
      navigate("/po-management");
    } catch (error) {
      console.error("❌ สั่งซื้ออัตโนมัติล้มเหลว:", error);
      const emsg = error?.response?.data?.message || "❌ สั่งซื้ออัตโนมัติไม่สำเร็จ";
      showToast(emsg, "danger");
    }
  };





  return (
    <div className="container mt-4">
      <h1 className="text-primary">📦 Stock Management</h1>
      <div className="d-flex justify-content-between mb-3">
        <button className="btn btn-success" onClick={() => setShowAddModal(true)}>➕ เพิ่มสินค้าใหม่</button>
        <button className="btn btn-secondary" onClick={() => navigate('/bom-management')}>⚙️ จัดการ BOM</button>
      </div>
      {/* 🔍 ช่องค้นหาสินค้า */}
      {/* 🔍 ค้นหา + ⏬ กรองคงเหลือ */}
      <div className="row g-2 mb-2">
        <div className="col-12 col-md-6">
          <input
            type="text"
            className="form-control"
            placeholder="🔍 ค้นหาสินค้า..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="col-12 col-md-6">
          <div className="input-group">
            <span className="input-group-text">คงเหลือ &lt;</span>
            <input
              type="number"
              min="0"
              className="form-control"
              placeholder="ระบุจำนวน (เช่น 10)"
              value={maxStockFilter}
              onChange={(e) => setMaxStockFilter(e.target.value)}
              onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} // กัน scroll เปลี่ยนค่า
            />
            {maxStockFilter !== "" && (
              <button
                className="btn btn-outline-secondary"
                onClick={() => setMaxStockFilter("")}
                title="ล้างตัวกรอง"
              >
                ✖️
              </button>
            )}
          </div>
        </div>
      </div>



      <div className="mb-2">
        <small className="text-muted">
          พบ {filteredProducts.length} รายการ
          {maxStockFilter !== "" ? ` (คงเหลือ < ${maxStockFilter})` : ""}
        </small>
      </div>
      



      {/* 📋 ตารางแสดงสินค้า */}
      <table className="table table-striped">
        <thead>
          <tr>
            <th style={{ width: "7%" }}>รหัสสินค้า</th>
            <th style={{ width: "27%" }}>ชื่อสินค้า</th>
            <th style={{ width: "10%" }}>คงเหลือ</th>
            <th style={{ width: "10%" }}>จอง</th>
            <th style={{ width: "7%" }}>Lead Time</th>
            <th style={{ width: "10%", textAlign: "center" }}>สั่งซื้อ</th>
            <th style={{ width: "20%" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentProducts.length > 0 ? (
            currentProducts.map((product) => (
              <tr key={product.id}>
                <td>{product.product_no}</td>
                <td>{product.name}</td>
                <td>{product.stock}</td>
                <td>{product.reserved}</td>
                <td>{product.leadTime}</td>
                <td className="text-center">
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleAutoPO(product.product_no)}
                    disabled={isBomCode(product.product_no)}
                    style={{ minWidth: 90 }}
                    title={isBomCode(product.product_no) ? "สินค้า BOM สั่งซื้อไม่ได้" : "สั่งซื้ออัตโนมัติ"}
                  >
                    🛒 สั่งซื้อ
                  </button>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-info btn-sm"
                      onClick={() => handleShowPrices(product.id)}
                    >
                      💲 ดูราคาขาย
                    </button>

                    <button
                      className="btn btn-warning btn-sm"
                      onClick={() => handleShowEditModal(product)}
                    >
                      ✏️ แก้ไข
                    </button>

                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleShowDeleteModal(product.id)}
                    >
                      🗑️ ลบ
                    </button>
                  </div>
                </td>

              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="text-center text-danger">
                ❌ ไม่พบสินค้า
              </td>
            </tr>
          )}
        </tbody>
      </table>

           

       {/* 🔄 Pagination Controls */}
      <div className="d-flex justify-content-center">
        <button
          className="btn btn-primary me-2"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          ⬅️ ก่อนหน้า
        </button>
        <span className="align-self-center">หน้า {currentPage}</span>
        <button
          className="btn btn-primary ms-2"
          disabled={indexOfLastItem >= filteredProducts.length}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          ถัดไป ➡️
        </button>
      </div>

      {/* 🏷 Modal แสดงราคาขายแต่ละบริษัท */}
      <CustomModal
        show={showModal}
        onClose={() => setShowModal(false)}
        title="💲 ราคาขายแต่ละบริษัท"
      >
        {selectedPrices.length > 0 ? (
          <table className="table table-sm table-bordered">
            <thead>
              <tr>
                <th style={{ width: '70%' }}>ลูกค้า</th>
                <th style={{ width: '30%' }}>ราคาขาย</th>
              </tr>
            </thead>
            <tbody>
              {selectedPrices.map((price) => (
                <tr key={price.id}>
                  <td>{price.customer_name}</td>
                  <td>{price.price} ฿</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted text-center">ไม่มีข้อมูลราคาขายสำหรับสินค้านี้</p>
        )}
      </CustomModal>


      {/* ❌ Modal ยืนยันการลบสินค้า */}
      <AlertModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="❗ ยืนยันการลบสินค้า"
        body="คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้?"
        variant="danger"
      />

      {/* 🏷 Modal เพิ่มสินค้าใหม่ */}
      <CustomModal
        title="➕ เพิ่มสินค้าใหม่"
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              ปิด
            </Button>
            <Button variant="success" onClick={handleAddProduct}>
              บันทึก
            </Button>
          </>
        }
      >
        <Form.Group className="mb-2">
          <Form.Label>รหัสสินค้า</Form.Label>
          <Form.Control
            type="text"
            value={newProduct.id}
            onChange={(e) => setNewProduct({ ...newProduct, id: e.target.value })}
          />
        </Form.Group>

        <Form.Group className="mb-2">
          <Form.Label>ชื่อสินค้า</Form.Label>
          <Form.Control
            type="text"
            value={newProduct.name}
            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
          />
        </Form.Group>

        <Form.Group className="mb-2">
          <Form.Label>คงเหลือ</Form.Label>
          <Form.Control
            type="number"
            value={newProduct.stock}
            onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
          />
        </Form.Group>

        <Form.Group className="mb-2">
          <Form.Label>หน่วยสินค้า</Form.Label>
          <Form.Select
            value={newProduct.unit}
            onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
          >
            {ALLOWED_UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </Form.Select>
        </Form.Group>        

        <Form.Group className="mb-2">
          <Form.Label>ต้นทุน</Form.Label>
          <Form.Control
            type="number"
            value={newProduct.cost}
            onChange={(e) => setNewProduct({ ...newProduct, cost: e.target.value })}
          />
        </Form.Group>

        <Form.Group className="mb-2">
          <Form.Label>ราคาขายทั่วไป</Form.Label>
          <Form.Control
            type="number"
            value={newProduct.price}
            onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
          />
        </Form.Group>

        <Form.Group className="mb-2"> {/* NEW */}
          <Form.Label>จำนวนสินค้าขั้นต่ำในสต๊อก</Form.Label>
          <Form.Control
            type="number"
            min="0"
            value={newProduct.reorderPoint}
            onChange={(e) => setNewProduct({ ...newProduct, reorderPoint: e.target.value })}
            placeholder=""
          />
        </Form.Group>    



        <Form.Group className="mb-2">
          <Form.Label>Lead Time ทั่วไป</Form.Label>
          <Form.Control
            type="text"
            value={newProduct.leadTime}
            onChange={(e) => setNewProduct({ ...newProduct, leadTime: e.target.value })}
          />
        </Form.Group>
      </CustomModal>


      {/* 🏷 Modal แจ้งเตือนข้อผิดพลาด */}
      <Modal show={showErrorModal} onHide={() => setShowErrorModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>⚠️ แจ้งเตือน</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          กรุณากรอกข้อมูลให้ครบถ้วน
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowErrorModal(false)}>ปิด</Button>
        </Modal.Footer>
      </Modal>

      {/* 🏷 Modal แก้ไขสินค้า */}
      <CustomModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="✏️ แก้ไขสินค้า"
      >
        <Form>

          {/* ป้ายแจ้งเตือนเมื่อเป็นสินค้า BOM */}
          {isBomCode(selectedProduct?.product_no) && (
            <div className="alert alert-info py-2">
              <b>สินค้าสำเร็จรูปจากการผลิต BOM</b> (รหัส: {selectedProduct?.product_no}) 
            </div>
          )}


          {!isBomCode(selectedProduct?.product_no) && (
            <Form.Group className="mb-2">
              <Form.Label>รหัสสินค้า</Form.Label>
              <Form.Control
                type="text"
                value={selectedProduct?.product_no || ""}
                disabled
                readOnly
              />
              <Form.Text className="text-muted">
                
              </Form.Text>
            </Form.Group>
          )}




{/*
          <Form.Group className="mb-2">
            <Form.Label>รหัสสินค้า</Form.Label>
            <Form.Control
              type="text"
              value={selectedProduct?.product_no || ""}
              disabled
              readOnly
            />
            <Form.Text className="text-muted">
              รหัสสินค้าจะแก้ได้เฉพาะตอน “เพิ่มสินค้าใหม่” เท่านั้น
            </Form.Text>
          </Form.Group>



          <Form.Group className="mb-2">
            <Form.Label>รหัสสินค้า</Form.Label>
            <Form.Control
              type="text"
              value={selectedProduct?.product_no || ""}
              onChange={(e) =>
                setSelectedProduct({ ...selectedProduct, product_no: e.target.value })
              }
              disabled={isBomCode(selectedProduct?.product_no)}       // 🔒 ล็อกเมื่อเป็น BOM
              readOnly={isBomCode(selectedProduct?.product_no)}
            />
            {isBomCode(selectedProduct?.product_no) && (
              <Form.Text className="text-muted">
                รหัสสินค้า BOM แก้ไขได้ในหน้าจัดการ BOM เท่านั้น
              </Form.Text>
            )}
          </Form.Group>
          
*/}          
          <Form.Group className="mb-2">
            <Form.Label>ชื่อสินค้า</Form.Label>
            <Form.Control
              type="text"
              value={selectedProduct?.name}
              onChange={(e) => setSelectedProduct({ ...selectedProduct, name: e.target.value })}
            />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>คงเหลือ</Form.Label>
            <Form.Control
              type="number"
              value={selectedProduct?.stock}
              onChange={(e) => setSelectedProduct({ ...selectedProduct, stock: e.target.value })}
              disabled={isBomCode(selectedProduct?.product_no)}   // 🔒 ล็อกถ้าเป็น BOM
              readOnly={isBomCode(selectedProduct?.product_no)}   // กัน autofill/scroll
              onWheel={isBomCode(selectedProduct?.product_no) ? (e) => e.currentTarget.blur() : undefined}
            />
            {isBomCode(selectedProduct?.product_no) && (
              <Form.Text className="text-muted">
                ปรับยอดคงเหลือจากการผลิต (BOM)
              </Form.Text>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>หน่วยสินค้า</Form.Label>
            <Form.Select
              value={selectedProduct?.unit || 'ชิ้น'}
              onChange={(e) => setSelectedProduct({ ...selectedProduct, unit: e.target.value })}
            >
              {ALLOWED_UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </Form.Select>
          </Form.Group>  



          <Form.Group className="mb-2">
            <Form.Label>ต้นทุน</Form.Label>
            <Form.Control
              type="number"
              value={selectedProduct?.cost}
              onChange={(e) => setSelectedProduct({ ...selectedProduct, cost: e.target.value })}
            />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>ราคาขายทั่วไป</Form.Label>
            <Form.Control
              type="number"
              value={selectedProduct?.price}
              onChange={(e) => setSelectedProduct({ ...selectedProduct, price: e.target.value })}
            />
          </Form.Group>

          <Form.Group className="mb-3"> {/* NEW */}
            <Form.Label>จำนวนสินค้าขั้นต่ำในสต๊อก</Form.Label>
            <Form.Control
              type="number"
              min="0"
              value={selectedProduct?.reorderPoint}
              onChange={(e) => setSelectedProduct({ ...selectedProduct, reorderPoint: e.target.value })}
              placeholder=""
            />
          </Form.Group>    



          <Form.Group className="mb-3">
            <Form.Label>Lead Time ทั่วไป</Form.Label>
            <Form.Control
              type="text"
              value={selectedProduct?.leadTime}
              onChange={(e) => setSelectedProduct({ ...selectedProduct, leadTime: e.target.value })}
            />
          </Form.Group>

          
          {/* 🔽 ส่วนจัดการราคาขายเฉพาะลูกค้า */}
          <hr />
          <h5 className="mb-2">💲 ราคาขายแต่ละบริษัท</h5>
          <div className="mb-2">
            {selectedProduct?.prices && selectedProduct.prices.length > 0 ? (
              <table className="table table-sm table-bordered mt-3">
                <thead>
                  <tr>
                    <th>ลูกค้า</th>
                    <th>ราคาขาย</th>
                    <th style={{ width: "100px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProduct.prices?.length > 0 ? (
                    selectedProduct.prices.map((priceItem) => (
                      <tr key={priceItem.id}>
                        <td>{priceItem.customer_name}</td>
                        <td>
                          {editingPriceId === priceItem.id ? (
                            <Form.Control
                              type="number"
                              value={editedPrice}
                              onChange={(e) => setEditedPrice(e.target.value)}
                              size="sm"
                            />
                          ) : (
                            `${priceItem.price} ฿`
                          )}
                        </td>
                        <td>
                          {editingPriceId === priceItem.id ? (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleSaveEditPrice(priceItem.id)}
                            >
                              💾
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="warning"
                              onClick={() => {
                                setEditingPriceId(priceItem.id);
                                setEditedPrice(priceItem.price);
                              }}
                            >
                              ✏️
                            </Button>
                          )}

                          <Button
                            className="ms-1"
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeletePrice(priceItem.id)}
                          >
                            🗑️
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="text-muted text-center">ไม่มีราคาขายเฉพาะลูกค้า</td>
                    </tr>
                  )}
                </tbody>
              </table>

            ) : (
              <p className="text-muted">ไม่มีราคาขายเฉพาะลูกค้าสำหรับสินค้านี้</p>
            )}
          </div>

          {/* ➕ เพิ่มราคาใหม่ */}
          <Form.Group className="mb-2">
            <div className="d-flex w-100 gap-2">
              <Form.Select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                style={{ flex: 3 }}
              >
                <option value="">เลือกลูกค้า</option>
                {customers.map((cus) => (
                  <option key={cus.id} value={cus.id}>
                    {cus.name}
                  </option>
                ))}
              </Form.Select>

              <Form.Control
                type="number"
                placeholder="ราคาขาย"
                value={newCustomerPrice}
                onChange={(e) => setNewCustomerPrice(e.target.value)}
                style={{ flex: 1 }}
              />


              <Button
                variant="success"
                style={{ whiteSpace: 'nowrap' }}
                onClick={handleAddCustomerPrice}
              >
                ➕ เพิ่ม
              </Button>
            </div>
          </Form.Group>


          {/* 🔽 ส่วนผู้ผลิตสินค้า */}
          <hr />
          <h5 className="mb-2">🏭 ผู้ผลิตสินค้า</h5>
          <ProductSupplierSection
            productId={selectedProduct?.product_no}
            showToast={showToast}
          />



          {/* 🔽 ส่วนแนบไฟล์สินค้า */}
          <hr />
          <h5 className="mb-2">📎 ไฟล์แนบของสินค้า</h5>
          <FileUploadSection productNo={selectedProduct?.product_no} fileType="drawing" />
          <FileUploadSection productNo={selectedProduct?.product_no} fileType="product-image" />
          <FileUploadSection productNo={selectedProduct?.product_no} fileType="qc-document" />      


        </Form>

        <div className="mt-4 text-end">
          <Button variant="secondary" className="me-2" onClick={() => setShowEditModal(false)}>
            ปิด
          </Button>
          <Button variant="success" onClick={handleEditProduct}>
            บันทึก
          </Button>
        </div>
      </CustomModal>


      {/* 🏷 Modal แจ้งเตือนข้อผิดพลาด */}
      <Modal show={showErrorModal} onHide={() => setShowErrorModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>⚠️ แจ้งเตือน</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          กรุณากรอกข้อมูลให้ครบถ้วน
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowErrorModal(false)}>ปิด</Button>
        </Modal.Footer>
      </Modal>      

      <AlertToast
        show={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
        message={toast.message}
        variant={toast.variant}
      />

      <AlertModal
        show={showAddSuccessModal}
        onClose={() => setShowAddSuccessModal(false)}
        onConfirm={() => {
          const product = products.find((p) => p.product_no === lastAddedProductNo);
          if (product) handleShowEditModal(product);
          setShowAddSuccessModal(false);
        }}
        title="✅ เพิ่มสินค้าเรียบร้อย"
        body="กรุณากด ยืนยัน หากต้องการเพิ่มรายละเอียดเพิ่มเติม"
        variant="success"
      />

         

    </div>
  );
};

export default StockManagement;
