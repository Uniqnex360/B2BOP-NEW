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

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [isResetPassword, setIsResetPassword] = useState(false);

  useEffect(() => {
    // Check if the URL contains reset-password
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

  if (isResetPassword) {
    return <ResetPasswordPage />;
  }

  if (!user || !profile) {
    return <LoginPage />;
  }

  const renderPage = () => {
    if (profile.role === "admin") {
      switch (currentPage) {
        case "dashboard":
        case "sellers":
          return <AdminDashboard />;
        default:
          return <AdminDashboard />;
      }
    }

    if (profile.role === "seller") {
      switch (currentPage) {
        case "dashboard":
          return <SellerDashboard />;
        case "products":
          return <ProductsPage />;
        case "orders":
          return <OrdersPage />;
        case "buyers":
          return <BuyersPage />;
        case "promotions":
          return <PromotionsPage />;
        case "logistics":
          return <LogisticsPage />;
        case "payments":
          return <PaymentsPage />;
        case "inventory":
          return <InventoryPage />;
        case "messages":
          return <MessagesPage />;
        case "settings":
          return <SettingsPage />;
        case "profile":
          return <SellerProfilePage />;
        case "ocr":
          return <ImageExtractorDashboard />;
        default:
          return <SellerDashboard />;
      }
    }

    if (profile.role === "buyer") {
      switch (currentPage) {
        case "dashboard":
          return <BuyerDashboard />;
        case "catalog":
        case "products":
          return <BuyerCatalogPage />;
        case "orders":
          return <BuyerOrdersPage onNavigate={setCurrentPage} />;
        case "wishlist":
          return <WishlistPage />;
        case "messages":
          return <BuyerMessagesPage />;
        case "profile":
          return <ProfilePage />;
        default:
          return <BuyerDashboard />;
      }
    }

    return null;
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
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
