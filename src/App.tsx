import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, useAuth } from "./contexts/AuthContext";

import LoginPage from "./components/LoginPage";
import ResetPasswordPage from "./components/ResetPasswordPage";
import Layout from "./components/Layout";

import AdminDashboard from "./components/admin/AdminDashboard";

import SellerDashboard from "./components/seller/SellerDashboard";
import ProductsPage from "./components/seller/ProductsPage";
import OrdersPage from "./components/seller/OrdersPage";
import BuyersPage from "./components/seller/BuyersPage";
import PromotionsPage from "./components/seller/PromotionsPage";
import LogisticsPage from "./components/seller/LogisticsPage";
import PaymentsPage from "./components/seller/PaymentsPage";
import MessagesPage from "./components/seller/MessagesPage";
import InventoryPage from "./components/seller/InventoryPage";
import SellerProfilePage from "./components/seller/SellerProfilePage";
import SettingsPage from "./components/seller/SettingsPage";
import ImageExtractorDashboard from "./components/seller/OCR";

import BuyerDashboard from "./components/buyer/BuyerDashboard";
import BuyerCatalogPage from "./components/buyer/BuyerCatalogPage";
import BuyerOrdersPage from "./components/buyer/BuyerOrdersPage";
import WishlistPage from "./components/buyer/WishlistPage";
import BuyerMessagesPage from "./components/buyer/BuyerMessagesPage";
import ProfilePage from "./components/buyer/ProfilePage";

// --------------------------------------------------
// Loading
// --------------------------------------------------

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>

        <p className="text-slate-600">Loading...</p>
      </div>
    </div>
  );
}

// --------------------------------------------------
// Protected Route
// --------------------------------------------------

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  // Not logged in
  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  // Role is not allowed
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// --------------------------------------------------
// Layout Route
// --------------------------------------------------

function AppLayout() {
  return (
    <Layout>
      <Routes>
        {/* ========================================== */}
        {/* ADMIN */}
        {/* ========================================== */}

        <Route path="/dashboard" element={<RoleDashboard />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* ========================================== */}
        {/* SELLER */}
        {/* ========================================== */}

        <Route
          path="/seller"
          element={
            <ProtectedRoute allowedRoles={["seller"]}>
              <SellerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/seller/products"
          element={
            <ProtectedRoute allowedRoles={["seller"]}>
              <ProductsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/seller/orders"
          element={
            <ProtectedRoute allowedRoles={["seller"]}>
              <OrdersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/seller/buyers"
          element={
            <ProtectedRoute allowedRoles={["seller"]}>
              <BuyersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/seller/promotions"
          element={
            <ProtectedRoute allowedRoles={["seller"]}>
              <PromotionsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/seller/logistics"
          element={
            <ProtectedRoute allowedRoles={["seller"]}>
              <LogisticsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/seller/payments"
          element={
            <ProtectedRoute allowedRoles={["seller"]}>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/seller/inventory"
          element={
            <ProtectedRoute allowedRoles={["seller"]}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/seller/messages"
          element={
            <ProtectedRoute allowedRoles={["seller"]}>
              <MessagesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/seller/settings"
          element={
            <ProtectedRoute allowedRoles={["seller"]}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/seller/profile"
          element={
            <ProtectedRoute allowedRoles={["seller"]}>
              <SellerProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/seller/ocr"
          element={
            <ProtectedRoute allowedRoles={["seller"]}>
              <ImageExtractorDashboard />
            </ProtectedRoute>
          }
        />

        {/* ========================================== */}
        {/* BUYER */}
        {/* ========================================== */}

        <Route
          path="/buyer"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <BuyerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/buyer/catalog"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <BuyerCatalogPage />
            </ProtectedRoute>
          }
        />

        {/* Keep /products if your existing navigation uses it */}
        <Route
          path="/buyer/products"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <BuyerCatalogPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/buyer/orders"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <BuyerOrdersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/buyer/wishlist"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <WishlistPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/buyer/messages"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <BuyerMessagesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/buyer/profile"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* ========================================== */}
        {/* FALLBACK */}
        {/* ========================================== */}

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

// --------------------------------------------------
// Dashboard based on role
// --------------------------------------------------

function RoleDashboard() {
  const { profile } = useAuth();

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  switch (profile.role) {
    case "admin":
      return <AdminDashboard />;

    case "seller":
      return <SellerDashboard />;

    case "buyer":
      return <BuyerDashboard />;

    default:
      return <Navigate to="/login" replace />;
  }
}

// --------------------------------------------------
// Main App
// --------------------------------------------------

function AppContent() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* ========================================== */}
      {/* RESET PASSWORD */}
      {/* ========================================== */}

      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* ========================================== */}
      {/* LOGIN */}
      {/* ========================================== */}

      <Route
        path="/login"
        element={
          user && profile ? <Navigate to="/dashboard" replace /> : <LoginPage />
        }
      />

      {/* ========================================== */}
      {/* AUTHENTICATED APP */}
      {/* ========================================== */}

      <Route
        path="/*"
        element={
          user && profile ? <AppLayout /> : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
}

// --------------------------------------------------
// App
// --------------------------------------------------

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
