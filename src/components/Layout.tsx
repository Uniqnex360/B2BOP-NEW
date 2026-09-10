import { ReactNode, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tag,
  Truck,
  CreditCard,
  Archive,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Heart,
  User,
  Settings,
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --------------------------------------------------
  // Menu items based on role
  // --------------------------------------------------

  const getMenuItems = () => {
    if (profile?.role === "admin") {
      return [
        {
          id: "dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
          path: "/dashboard",
        },
        {
          id: "sellers",
          label: "Sellers",
          icon: Users,
          path: "/admin/sellers",
        },
      ];
    }

    if (profile?.role === "seller") {
      return [
        {
          id: "dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
          path: "/dashboard",
        },
        {
          id: "products",
          label: "Products",
          icon: Package,
          path: "/seller/products",
        },
        {
          id: "orders",
          label: "Orders",
          icon: ShoppingCart,
          path: "/seller/orders",
        },
        {
          id: "buyers",
          label: "Buyers",
          icon: Users,
          path: "/seller/buyers",
        },
        {
          id: "promotions",
          label: "Promotions",
          icon: Tag,
          path: "/seller/promotions",
        },
        {
          id: "logistics",
          label: "Logistics",
          icon: Truck,
          path: "/seller/logistics",
        },
        {
          id: "payments",
          label: "Payments",
          icon: CreditCard,
          path: "/seller/payments",
        },
        {
          id: "inventory",
          label: "Inventory",
          icon: Archive,
          path: "/seller/inventory",
        },
        {
          id: "messages",
          label: "Messages",
          icon: MessageSquare,
          path: "/seller/messages",
        },
        {
          id: "ocr",
          label: "OCR",
          icon: MessageSquare,
          path: "/seller/ocr",
        },
        {
          id: "settings",
          label: "Settings",
          icon: Settings,
          path: "/seller/settings",
        },
        {
          id: "profile",
          label: "Profile",
          icon: User,
          path: "/seller/profile",
        },
      ];
    }

    if (profile?.role === "buyer") {
      return [
        {
          id: "dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
          path: "/dashboard",
        },
        {
          id: "catalog",
          label: "Browse Products",
          icon: Package,
          path: "/buyer/catalog",
        },
        {
          id: "orders",
          label: "My Orders",
          icon: ShoppingCart,
          path: "/buyer/orders",
        },
        {
          id: "wishlist",
          label: "Wishlist",
          icon: Heart,
          path: "/buyer/wishlist",
        },
        {
          id: "messages",
          label: "Messages",
          icon: MessageSquare,
          path: "/buyer/messages",
        },
        {
          id: "profile",
          label: "Profile",
          icon: User,
          path: "/buyer/profile",
        },
      ];
    }

    return [];
  };

  const menuItems = getMenuItems();

  // --------------------------------------------------
  // Active menu item
  // --------------------------------------------------

  const getCurrentMenuItem = () => {
    return menuItems.find((item) => {
      if (item.path === "/dashboard") {
        return location.pathname === "/dashboard";
      }

      return location.pathname === item.path;
    });
  };

  const currentMenuItem = getCurrentMenuItem();

  // --------------------------------------------------
  // Navigation
  // --------------------------------------------------

  const handleNavigation = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  // --------------------------------------------------
  // Logout
  // --------------------------------------------------

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ========================================== */}
      {/* Mobile sidebar backdrop */}
      {/* ========================================== */}

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ========================================== */}
      {/* Sidebar */}
      {/* ========================================== */}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* -------------------------------------- */}
          {/* Logo */}
          {/* -------------------------------------- */}

          <div className="flex items-center justify-between border-b border-slate-200">
            {/* <div className="flex items-center gap-3 bg-red-500">
              {profile?.logo_url ? (
                <img
                  src={profile.logo_url}
                  alt="Logo"
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {profile?.business_name?.[0] ||
                      profile?.first_name?.[0] ||
                      "B"}
                  </span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-slate-900 truncate">
                  {profile?.business_name || "B2B Platform"}
                </h2>

                <p className="text-xs text-slate-600 capitalize">
                  {profile?.role}
                </p>
              </div>
            </div> */}
            <div className="flex items-center h-20 w-full">
              <img src="/public/logo.png" alt="logo" className="object-contain w-full" />
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-slate-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* -------------------------------------- */}
          {/* Navigation */}
          {/* -------------------------------------- */}

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;

              const isActive = location.pathname === item.path;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-700 hover:bg-blue-50"
                  }`}
                >
                  <Icon className="w-5 h-5" />

                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* -------------------------------------- */}
          {/* User info & logout */}
          {/* -------------------------------------- */}

          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-700 font-medium text-sm">
                  {profile?.first_name?.[0]}
                  {profile?.last_name?.[0]}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm truncate">
                  {profile?.first_name} {profile?.last_name}
                </p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />

              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================== */}
      {/* Main content */}
      {/* ========================================== */}

      <div className="lg:pl-64">
        {/* -------------------------------------- */}
        {/* Mobile header */}
        {/* -------------------------------------- */}

        <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>

          <h1 className="font-bold text-slate-900">
            {currentMenuItem?.label || "Dashboard"}
          </h1>

          <div className="w-10" />
        </header>

        {/* -------------------------------------- */}
        {/* Page content */}
        {/* -------------------------------------- */}

        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
