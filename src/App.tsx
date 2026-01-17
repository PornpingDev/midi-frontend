import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import Dashboard from "./pages/Dashboard";
import StockManagement from "./pages/StockManagement";
import POManagement from "./pages/POManagement";
import SalesDelivery from "./pages/SalesDelivery";
import Reports from "./pages/Reports";
import UserManagement from "./pages/UserManagement";
import DocumentManagement from "./pages/DocumentManagement";
import BOMManagement from './pages/BOMManagement';
import CustomerManagement from "./pages/CustomerManagement";
import SupplierManagement from "./pages/SupplierManagement";
import Login from "./pages/Login"; // ✅ เพิ่มหน้า Login
import ProtectedRoute from "./components/common/ProtectedRoute"; // ✅ ใช้ ProtectedRoute
import ManualEditor from "./pages/ManualEditor";
import AutoDocDetail from "./pages/AutoDocDetail";
import PrintDemo from "./pages/PrintDemo";
import StockBalanceReport from "./pages/reports/StockBalanceReport";
import DeliveryProgressReport from "./pages/reports/DeliveryProgressReport";
import MonthlySalesPurchases from "./pages/reports/MonthlySalesPurchases";
import ProductSalesReport from "./pages/reports/ProductSalesReport";
import NonMovingProducts from "./pages/reports/NonMovingProducts";
import PODetailView from "./pages/PODetailView";
import StockValueReport from "./pages/reports/StockValueReport";




function App() {
  return (
    <Router>
      <Routes>
        {/* ✅ Route สำหรับ Login ไม่ใช้ Protected Route */}
        <Route path="/login" element={<Login />} />

        {/* ✅ หน้า /print แยกออกมาจาก Layout แต่ยังผ่าน ProtectedRoute */}
        <Route
          path="/print"
          element={
            <ProtectedRoute>
              <PrintDemo />
            </ProtectedRoute>
          }
        />

        {/* ✅ ใช้ Protected Route ครอบทุกหน้า */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="/bom-management" element={<BOMManagement />} />
          <Route path="/customer-management" element={<CustomerManagement />} />
          <Route path="/supplier-management" element={<SupplierManagement />} />
          <Route path="reports" element={<Reports />} />
          <Route path="documents" element={<DocumentManagement />} />
          <Route path="manual/new" element={<ManualEditor />} />
          <Route path="manual/:id" element={<ManualEditor />} />
          <Route path="documents/a/:pairId" element={<AutoDocDetail />} />
          <Route path="/print-demo" element={<PrintDemo />} />
          <Route path="/reports/stock-balance" element={<StockBalanceReport />} />
          <Route path="/reports/delivery-progress" element={<DeliveryProgressReport />} />
          <Route path="/reports/monthly-sales-purchases" element={<MonthlySalesPurchases />} />
          <Route path="/reports/product-sales" element={<ProductSalesReport />} />
          <Route path="/reports/nonmoving-products" element={<NonMovingProducts />} />
          <Route path="/po-management" element={<POManagement />} />
          <Route path="/po-management/:id" element={<PODetailView />} />
          <Route path="/reports/stock-value" element={<StockValueReport />} />

          



          {/** ✅ เช็ค Role ก่อนเข้าแต่ละหน้า */}
          <Route path="stock" element={
            <ProtectedRoute>
              <StockManagement />
            </ProtectedRoute>
          } />
          <Route path="po" element={
            <ProtectedRoute>
              <POManagement />
            </ProtectedRoute>
          } />
          <Route path="sales" element={
            <ProtectedRoute>
              <SalesDelivery />
            </ProtectedRoute>
          } />
          <Route path="users" element={
            <ProtectedRoute>
              <UserManagement />
            </ProtectedRoute>
          } />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            } />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
