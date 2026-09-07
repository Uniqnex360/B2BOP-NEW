import { useState, useEffect } from "react";
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
import BuyerDashboard from "./components/buyer/BuyerDashboard";
import BuyerCatalogPage from "./components/buyer/BuyerCatalogPage";
import BuyerOrdersPage from "./components/buyer/BuyerOrdersPage";
import WishlistPage from "./components/buyer/WishlistPage";
import BuyerMessagesPage from "./components/buyer/BuyerMessagesPage";
import ProfilePage from "./components/buyer/ProfilePage";
import SellerProfilePage from "./components/seller/SellerProfilePage";
import SettingsPage from "./components/seller/SettingsPage";
import ImageExtractorDashboard from "./components/seller/OCR";
import { KeepMounted } from "./components/KeepMounted";

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [isResetPassword, setIsResetPassword] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes("reset-password")) {
      setIsResetPassword(true);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isResetPassword) return <ResetPasswordPage />;
  if (!user || !profile) return <LoginPage />;

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {/* ---------------- ADMIN ROLE ---------------- */}
      {profile.role === "admin" && (
        <>
          {currentPage === "dashboard" && <AdminDashboard />}
          {/* Add extra admin pages wrapped in KeepMounted here */}
        </>
      )}

      {/* ---------------- SELLER ROLE ---------------- */}
      {profile.role === "seller" && (
        <>
          {/* Dashboard is NOT kept mounted (re-renders fresh) */}
          {currentPage === "dashboard" && <SellerDashboard />}

          {/* Kept Mounted Components */}
          <KeepMounted activePage={currentPage} pageId="products">
            <ProductsPage />
          </KeepMounted>
          <KeepMounted activePage={currentPage} pageId="orders">
            <OrdersPage />
          </KeepMounted>
          <KeepMounted activePage={currentPage} pageId="buyers">
            <BuyersPage />
          </KeepMounted>
          <KeepMounted activePage={currentPage} pageId="promotions">
            <PromotionsPage />
          </KeepMounted>
          <KeepMounted activePage={currentPage} pageId="logistics">
            <LogisticsPage />
          </KeepMounted>
          <KeepMounted activePage={currentPage} pageId="payments">
            <PaymentsPage />
          </KeepMounted>
          <KeepMounted activePage={currentPage} pageId="inventory">
            <InventoryPage />
          </KeepMounted>
          <KeepMounted activePage={currentPage} pageId="messages">
            <MessagesPage />
          </KeepMounted>
          <KeepMounted activePage={currentPage} pageId="settings">
            <SettingsPage />
          </KeepMounted>
          <KeepMounted activePage={currentPage} pageId="profile">
            <SellerProfilePage />
          </KeepMounted>
          <KeepMounted activePage={currentPage} pageId="ocr">
            <ImageExtractorDashboard />
          </KeepMounted>
        </>
      )}

      {/* ---------------- BUYER ROLE ---------------- */}
      {profile.role === "buyer" && (
        <>
          {/* Dashboard is NOT kept mounted */}
          {currentPage === "dashboard" && <BuyerDashboard />}

          {/* Kept Mounted Components */}
          <KeepMounted activePage={currentPage} pageId="catalog">
            <BuyerCatalogPage />
          </KeepMounted>
          <KeepMounted activePage={currentPage} pageId="products">
            <BuyerCatalogPage />
          </KeepMounted>
          <KeepMounted activePage={currentPage} pageId="orders">
            <BuyerOrdersPage onNavigate={setCurrentPage} />
          </KeepMounted>
          <KeepMounted activePage={currentPage} pageId="wishlist">
            <WishlistPage />
          </KeepMounted>
          <KeepMounted activePage={currentPage} pageId="messages">
            <BuyerMessagesPage />
          </KeepMounted>
          <KeepMounted activePage={currentPage} pageId="profile">
            <ProfilePage />
          </KeepMounted>
        </>
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
