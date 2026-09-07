import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import {
  ArrowLeft,
  Printer,
  Package,
  MapPin,
  CreditCard,
  Truck,
  CheckCircle,
  Pencil,
  X,
} from "lucide-react";

interface SellerOrderDetailPageProps {
  orderId: string;
  onBack: () => void;
}

interface FulfillmentRecord {
  id: string; // shipment_item id
  shipment_id: string;
  warehouse_id: string;
  quantity: number;
  warehouse_name?: string;
  status?: string;
}

interface FulfillmentModalProps {
  orderItem: any;
  warehouses: any[];
  onClose: () => void;
  onFulfill: (
    orderItemId: string,
    warehouseId: string,
    quantity: number,
  ) => void;
  remainingQuantity: number;
  editingRecord?: FulfillmentRecord | null;
  onUpdate?: (
    record: FulfillmentRecord,
    warehouseId: string,
    quantity: number,
  ) => void;
}

function FulfillmentModal({
  orderItem,
  warehouses,
  onClose,
  onFulfill,
  remainingQuantity,
  editingRecord,
  onUpdate,
}: FulfillmentModalProps) {
  const isEditing = !!editingRecord;

  const [selectedWarehouse, setSelectedWarehouse] = useState(
    editingRecord ? editingRecord.warehouse_id : "",
  );
  const [quantity, setQuantity] = useState(
    editingRecord
      ? editingRecord.quantity
      : Math.min(remainingQuantity, orderItem.quantity),
  );

  // When editing, the "pool" available to this record includes what it already has.
  const maxQuantity = isEditing
    ? remainingQuantity + (editingRecord?.quantity || 0)
    : remainingQuantity;

  const handleSubmit = () => {
    if (!selectedWarehouse || quantity <= 0 || quantity > maxQuantity) return;

    if (isEditing && editingRecord && onUpdate) {
      onUpdate(editingRecord, selectedWarehouse, quantity);
    } else {
      onFulfill(orderItem.id, selectedWarehouse, quantity);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">
          {isEditing ? "Edit Fulfillment: " : "Fulfill Item: "}
          {orderItem.products?.name}
        </h3>

        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Ordered:</span>{" "}
              {orderItem.quantity} units
              <br />
              <span className="font-semibold">
                {isEditing
                  ? "Available to allocate (incl. this record):"
                  : "Remaining to fulfill:"}
              </span>{" "}
              {maxQuantity} units
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Warehouse
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose warehouse...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} - {w.city}, {w.state}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Quantity to {isEditing ? "Update" : "Fulfill"}
            </label>
            <input
              type="number"
              min="1"
              max={maxQuantity}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">
              Max: {maxQuantity} units
            </p>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              {isEditing
                ? `This will update the existing shipment record to ${quantity} unit(s).`
                : `This will create a shipment for ${quantity} unit(s) from the selected warehouse.`}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                !selectedWarehouse || quantity <= 0 || quantity > maxQuantity
              }
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isEditing ? "Update Fulfillment" : "Move to Logistics"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BulkFulfillModalProps {
  items: any[]; // selected order items
  warehouses: any[];
  remainingByItem: Record<string, number>;
  onClose: () => void;
  onSubmit: (warehouseId: string, quantities: Record<string, number>) => void;
}

function BulkFulfillModal({
  items,
  warehouses,
  remainingByItem,
  onClose,
  onSubmit,
}: BulkFulfillModalProps) {
  console.log("i am not working", items, warehouses);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    items.forEach((item) => {
      initial[item.id] = remainingByItem[item.id] || 0;
    });
    return initial;
  });

  const updateQuantity = (itemId: string, value: number) => {
    setQuantities((prev) => ({ ...prev, [itemId]: value }));
  };

  const isValid =
    selectedWarehouse &&
    items.every((item) => {
      const q = quantities[item.id] || 0;
      return q > 0 && q <= (remainingByItem[item.id] || 0);
    });

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit(selectedWarehouse, quantities);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-slate-900">
            Bulk Fulfill ({items.length} item{items.length !== 1 ? "s" : ""})
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Warehouse (applies to all selected items)
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose warehouse...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} - {w.city}, {w.state}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">
              Quantities per item
            </p>
            {items.map((item) => {
              const remaining = remainingByItem[item.id] || 0;
              const qty = quantities[item.id] || 0;
              const invalid = qty <= 0 || qty > remaining;
              return (
                <div
                  key={item.id}
                  className="p-3 border border-slate-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900">
                      {item.products?.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      Remaining: {remaining}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={remaining}
                    value={qty}
                    onChange={(e) =>
                      updateQuantity(item.id, parseInt(e.target.value) || 0)
                    }
                    className={`w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      invalid ? "border-red-300" : "border-slate-300"
                    }`}
                  />
                  {invalid && (
                    <p className="text-xs text-red-600 mt-1">
                      Enter a value between 1 and {remaining}.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              This will create one shipment from the selected warehouse covering
              all listed items. Unselected items are left untouched.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              Move {items.length} Item{items.length !== 1 ? "s" : ""} to
              Logistics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SellerOrderDetailPage({
  orderId,
  onBack,
}: SellerOrderDetailPageProps) {
  const { profile } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [fulfilledQuantities, setFulfilledQuantities] = useState<
    Record<string, number>
  >({});
  const [fulfillmentRecords, setFulfillmentRecords] = useState<
    Record<string, FulfillmentRecord[]>
  >({});
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFulfillmentModal, setShowFulfillmentModal] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<any>(null);
  const [editingRecord, setEditingRecord] = useState<FulfillmentRecord | null>(
    null,
  );
  const [billingAddress, setBillingAddress] = useState<any>(null);
  const [shippingAddress, setShippingAddress] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<any>(null);

  // --- Bulk selection state ---
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    new Set(),
  );
  const [showBulkModal, setShowBulkModal] = useState(false);

  useEffect(() => {
    loadOrderDetails();
    loadWarehouses();
  }, [orderId, profile]);

  const loadWarehouses = async () => {
    if (!profile?.id) return;

    const { data } = await supabase
      .from("warehouses")
      .select("*")
      .eq("seller_id", profile.id)
      .eq("is_active", true)
      .order("name");

    setWarehouses(data || []);
  };

  const loadOrderDetails = async () => {
    if (!profile?.id) return;

    setLoading(true);

    const orderRes = await supabase
      .from("orders")
      .select(
        `
        *,
        user_profiles!orders_buyer_id_fkey(
          id,
          first_name,
          last_name,
          email,
          company_name,
          business_name,
          phone
        )
      `,
      )
      .eq("id", orderId)
      .eq("seller_id", profile.id)
      .maybeSingle();

    if (!orderRes.data) {
      setLoading(false);
      return;
    }

    const buyerId = orderRes.data.buyer_id;

    const [
      itemsRes,
      shipmentsRes,
      billingAddressRes,
      shippingAddressRes,
      paymentRes,
    ] = await Promise.all([
      supabase
        .from("order_items")
        .select(
          `
          *,
          products(id, name, sku, image_url)
        `,
        )
        .eq("order_id", orderId)
        .order("created_at"),
      supabase
        .from("shipment_items")
        .select(
          `
          id,
          quantity,
          order_item_id,
          warehouse_id,
          shipment_id,
          shipments!inner(order_id, status),
          warehouses(name, city, state)
        `,
        )
        .eq("shipments.order_id", orderId),
      supabase
        .from("buyer_addresses")
        .select("*")
        .eq("buyer_id", buyerId)
        .eq("address_type", "billing")
        .eq("is_default", true)
        .maybeSingle(),
      supabase
        .from("buyer_addresses")
        .select("*")
        .eq("buyer_id", buyerId)
        .eq("address_type", "shipping")
        .eq("is_default", true)
        .maybeSingle(),
      supabase
        .from("payments")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    setOrder(orderRes.data);
    setOrderItems(itemsRes.data || []);
    setBillingAddress(billingAddressRes.data);
    setShippingAddress(shippingAddressRes.data);
    setPaymentMethod(paymentRes.data);

    // Calculate fulfilled quantities + keep individual records for editing
    const fulfilled: Record<string, number> = {};
    const records: Record<string, FulfillmentRecord[]> = {};

    if (shipmentsRes.data) {
      shipmentsRes.data.forEach((si: any) => {
        const itemId = si.order_item_id;
        fulfilled[itemId] = (fulfilled[itemId] || 0) + si.quantity;

        if (!records[itemId]) records[itemId] = [];
        records[itemId].push({
          id: si.id,
          shipment_id: si.shipment_id,
          warehouse_id: si.warehouse_id,
          quantity: si.quantity,
          warehouse_name: si.warehouses?.name,
          status: si.shipments?.status,
        });
      });
    }

    setFulfilledQuantities(fulfilled);
    setFulfillmentRecords(records);
    setSelectedItemIds(new Set()); // reset selection on reload

    setLoading(false);
  };

  const getRemainingQuantity = (
    orderItemId: string,
    orderedQuantity: number,
  ) => {
    const fulfilled = fulfilledQuantities[orderItemId] || 0;
    return orderedQuantity - fulfilled;
  };

  const isFullyFulfilled = (orderItemId: string, orderedQuantity: number) => {
    return getRemainingQuantity(orderItemId, orderedQuantity) <= 0;
  };

  const handleFulfillItem = async (
    orderItemId: string,
    warehouseId: string,
    quantity: number,
  ) => {
    try {
      const orderItem = orderItems.find((item) => item.id === orderItemId);
      if (!orderItem) throw new Error("Order item not found");

      const remaining = getRemainingQuantity(orderItemId, orderItem.quantity);

      if (quantity > remaining) {
        alert(
          `Cannot fulfill ${quantity} units. Only ${remaining} units remaining.`,
        );
        return;
      }

      const { data: shipment, error: shipmentError } = await supabase
        .from("shipments")
        .insert({
          order_id: orderId,
          seller_id: profile?.id,
          warehouse_id: warehouseId,
          status: "pending",
          shipping_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (shipmentError) throw shipmentError;

      const { error: itemError } = await supabase
        .from("shipment_items")
        .insert({
          shipment_id: shipment.id,
          order_item_id: orderItemId,
          warehouse_id: warehouseId,
          quantity: quantity,
        });

      if (itemError) throw itemError;

      alert("Item moved to logistics successfully!");
      await loadOrderDetails();
    } catch (error) {
      console.error("Error fulfilling item:", error);
      alert("Failed to move item to logistics");
    }
  };

  // --- Edit an existing fulfillment (shipment_item) ---
  const handleUpdateFulfillment = async (
    record: FulfillmentRecord,
    warehouseId: string,
    quantity: number,
  ) => {
    try {
      const { error: itemError } = await supabase
        .from("shipment_items")
        .update({
          warehouse_id: warehouseId,
          quantity: quantity,
        })
        .eq("id", record.id);

      if (itemError) throw itemError;

      // Keep the parent shipment's warehouse in sync (shipments are 1 warehouse each in this flow)
      const { error: shipmentError } = await supabase
        .from("shipments")
        .update({ warehouse_id: warehouseId })
        .eq("id", record.shipment_id);

      if (shipmentError) throw shipmentError;

      alert("Fulfillment updated successfully!");
      await loadOrderDetails();
    } catch (error) {
      console.error("Error updating fulfillment:", error);
      alert("Failed to update fulfillment");
    }
  };

  // --- Bulk fulfill multiple order items in one shipment ---
  const handleBulkFulfill = async (
    warehouseId: string,
    quantities: Record<string, number>,
  ) => {
    try {
      const itemIds = Object.keys(quantities);

      // Build rows FIRST and validate every one explicitly — no silent filtering
      const rows: {
        shipment_id: string;
        order_item_id: string;
        warehouse_id: string;
        quantity: number;
      }[] = [];

      for (const itemId of itemIds) {
        const item = orderItems.find((i) => i.id === itemId);
        if (!item) {
          console.warn(
            `[Bulk Fulfill] Order item ${itemId} not found in orderItems — skipping`,
          );
          continue;
        }

        const remaining = getRemainingQuantity(itemId, item.quantity);
        const qty = quantities[itemId];

        if (!qty || qty <= 0) {
          console.error(`[Bulk Fulfill Error] Invalid quantity:`, {
            itemId,
            productName: item.products?.name,
            requestedQty: qty,
          });
          return; // stop, don't submit a partial batch silently
        }

        if (qty > remaining) {
          console.error(
            `[Bulk Fulfill Error] Quantity exceeds remaining stock:`,
            {
              itemId,
              productName: item.products?.name,
              requestedQty: qty,
              remainingStock: remaining,
            },
          );
          return;
        }

        rows.push({
          shipment_id: "", // filled in after shipment insert
          order_item_id: itemId,
          warehouse_id: warehouseId,
          quantity: qty,
        });
      }

      if (rows.length !== itemIds.length) {
        console.error(`[Bulk Fulfill Error] Row length mismatch:`, {
          expectedCount: itemIds.length,
          actualRowsBuilt: rows.length,
          requestedIds: itemIds,
          builtRows: rows,
        });
        return;
      }

      const { data: shipment, error: shipmentError } = await supabase
        .from("shipments")
        .insert({
          order_id: orderId,
          seller_id: profile?.id,
          warehouse_id: warehouseId,
          status: "pending",
          shipping_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (shipmentError) {
        console.error(
          "[Bulk Fulfill Error] Supabase shipment insert failed:",
          shipmentError,
        );
        throw shipmentError;
      }

      const finalRows = rows.map((r) => ({ ...r, shipment_id: shipment.id }));

      const { data: insertedItems, error: itemsError } = await supabase
        .from("shipment_items")
        .insert(finalRows)
        .select();

      if (itemsError) {
        console.error(
          "[Bulk Fulfill Error] Supabase shipment_items insert failed:",
          itemsError,
        );
        throw itemsError;
      }

      if (!insertedItems || insertedItems.length !== finalRows.length) {
        console.error("[Bulk Fulfill Error] Row count mismatch on insert:", {
          expectedCount: finalRows.length,
          actualInsertedCount: insertedItems?.length ?? 0,
          expectedRows: finalRows,
          insertedItems,
        });
      } else {
        console.log(
          `[Bulk Fulfill Success] ${insertedItems.length} item(s) moved to logistics:`,
          {
            shipmentId: shipment.id,
            insertedItems,
          },
        );
      }

      setSelectedItemIds(new Set());
      await loadOrderDetails();
    } catch (error) {
      console.error(
        "[Bulk Fulfill Error] Exception caught during operation:",
        error,
      );
    }
  };

  const toggleItemSelected = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const eligibleItems = orderItems.filter(
    (item) => !isFullyFulfilled(item.id, item.quantity),
  );
  const allEligibleSelected =
    eligibleItems.length > 0 &&
    eligibleItems.every((item) => selectedItemIds.has(item.id));

  const toggleSelectAll = () => {
    if (allEligibleSelected) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(eligibleItems.map((item) => item.id)));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getPaymentMethodDisplay = () => {
    if (!paymentMethod) return "Not specified";

    switch (paymentMethod.payment_method) {
      case "credit_card":
        return `Credit Card •••• ${paymentMethod.last_four || "****"}`;
      case "debit_card":
        return `Debit Card •••• ${paymentMethod.last_four || "****"}`;
      case "bank_transfer":
        return "Bank Transfer";
      case "paypal":
        return "PayPal";
      case "stripe":
        return "Stripe";
      case "check":
        return "Check";
      case "cash":
        return "Cash";
      default:
        return paymentMethod.payment_method || "Not specified";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading order details...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Order not found</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const buyer = order.user_profiles;
  const itemsCount = orderItems.length;
  const totalUnits = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const selectedItemsList = orderItems.filter((item) =>
    selectedItemIds.has(item.id),
  );
  const remainingByItem: Record<string, number> = {};
  orderItems.forEach((item) => {
    remainingByItem[item.id] = getRemainingQuantity(item.id, item.quantity);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition print:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Order Details</h1>
            <p className="text-slate-600">Order #{order.order_number}</p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition print:hidden"
        >
          <Printer className="w-4 h-4" />
          Print Invoice
        </button>
      </div>

      {/* Bulk action bar */}
      {selectedItemIds.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl print:hidden">
          <span className="text-sm font-medium text-blue-900">
            {selectedItemIds.size} item{selectedItemIds.size !== 1 ? "s" : ""}{" "}
            selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedItemIds(new Set())}
              className="px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100 rounded-lg transition"
            >
              Clear
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
            >
              <Truck className="w-4 h-4" />
              Bulk Fulfill
            </button>
          </div>
        </div>
      )}

      {/* Invoice */}
      <div className="bg-white rounded-xl border border-slate-200 p-8 print:border-0 print:shadow-none">
        {/* Invoice Header */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">INVOICE</h2>
            <div className="text-sm text-slate-600 space-y-1">
              <p>Invoice #: {order.order_number}</p>
              <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
              <p>
                Status:{" "}
                <span className="font-medium text-slate-900 capitalize">
                  {order.status}
                </span>
              </p>
              {paymentMethod?.transaction_id && (
                <p>
                  Transaction ID:{" "}
                  <span className="font-medium text-slate-900">
                    {paymentMethod.transaction_id}
                  </span>
                </p>
              )}
            </div>
          </div>
          <div className="text-right" />
        </div>

        {/* Addresses & Payment Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Bill To */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-slate-900">Bill To:</h3>
            </div>
            <div className="text-sm text-slate-600 space-y-1">
              <p className="font-medium text-slate-900">
                {billingAddress?.full_name ||
                  buyer?.company_name ||
                  buyer?.business_name ||
                  `${buyer?.first_name} ${buyer?.last_name}`}
              </p>
              <p>{buyer?.email}</p>
              {billingAddress?.phone && <p>{billingAddress.phone}</p>}
              {!billingAddress && (
                <p className="text-slate-400">No billing address found</p>
              )}
            </div>
          </div>

          {/* Ship To */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-slate-900">Ship To:</h3>
            </div>
            <div className="text-sm text-slate-600 space-y-1">
              {billingAddress ? (
                <>
                  <p className="font-medium text-slate-900">
                    {billingAddress.full_name ||
                      buyer?.company_name ||
                      buyer?.business_name ||
                      `${buyer?.first_name} ${buyer?.last_name}`}
                  </p>
                  <p>{billingAddress.address_line1}</p>
                  {billingAddress.address_line2 && (
                    <p>{billingAddress.address_line2}</p>
                  )}
                  <p>
                    {billingAddress.city}, {billingAddress.state}{" "}
                    {billingAddress.postal_code}
                  </p>
                  <p>{billingAddress.country || "USA"}</p>
                </>
              ) : shippingAddress ? (
                <>
                  <p className="font-medium text-slate-900">
                    {shippingAddress.full_name ||
                      buyer?.company_name ||
                      buyer?.business_name ||
                      `${buyer?.first_name} ${buyer?.last_name}`}
                  </p>
                  <p>{shippingAddress.address_line1}</p>
                  {shippingAddress.address_line2 && (
                    <p>{shippingAddress.address_line2}</p>
                  )}
                  <p>
                    {shippingAddress.city}, {shippingAddress.state}{" "}
                    {shippingAddress.postal_code}
                  </p>
                  <p>{shippingAddress.country || "USA"}</p>
                </>
              ) : (
                <p className="text-slate-400">No shipping address found</p>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-slate-900">Payment Info:</h3>
            </div>
            <div className="text-sm text-slate-600 space-y-1">
              <p className="font-medium text-slate-900">{order.notes}</p>
              <p>
                Status:{" "}
                <span
                  className={`font-medium ${
                    order.payment_status === "paid"
                      ? "text-green-600"
                      : order.payment_status === "partial"
                        ? "text-yellow-600"
                        : "text-red-600"
                  }`}
                >
                  {order.payment_status}
                </span>
              </p>
              {paymentMethod?.transaction_id && (
                <p>
                  Transaction ID:{" "}
                  <span className="font-medium text-slate-900">
                    {paymentMethod.transaction_id}
                  </span>
                </p>
              )}
              {paymentMethod?.payment_date && (
                <p>
                  Paid:{" "}
                  {new Date(paymentMethod.payment_date).toLocaleDateString()}
                </p>
              )}
              {paymentMethod?.amount && (
                <p>
                  Amount:{" "}
                  <span className="font-medium text-slate-900">
                    ${parseFloat(paymentMethod.amount).toFixed(2)}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-slate-700">
                  {itemsCount} Item{itemsCount !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="text-sm font-medium text-slate-700">
                {totalUnits} Total Unit{totalUnits !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Order Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4 print:hidden">
                    <input
                      type="checkbox"
                      checked={allEligibleSelected}
                      onChange={toggleSelectAll}
                      disabled={eligibleItems.length === 0}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                    Item
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                    SKU
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                    Units
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 print:hidden">
                    Fulfilled
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                    Unit Price
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                    Discount
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                    Total
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 print:hidden">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item) => {
                  const fulfilled = fulfilledQuantities[item.id] || 0;
                  const remaining = getRemainingQuantity(
                    item.id,
                    item.quantity,
                  );
                  const fullyFulfilled = isFullyFulfilled(
                    item.id,
                    item.quantity,
                  );
                  const records = fulfillmentRecords[item.id] || [];

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 align-top"
                    >
                      <td className="py-4 px-4 print:hidden">
                        <input
                          type="checkbox"
                          checked={selectedItemIds.has(item.id)}
                          onChange={() => toggleItemSelected(item.id)}
                          disabled={fullyFulfilled}
                          className="w-4 h-4 rounded border-slate-300 disabled:opacity-30"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {item.products?.image_url ? (
                            <img
                              src={item.products.image_url}
                              alt={item.products.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                              <Package className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                          <span className="font-medium text-slate-900">
                            {item.products?.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-600 text-sm">
                        {item.products?.sku}
                      </td>
                      <td className="py-4 px-4 text-center font-semibold text-slate-900">
                        {item.quantity}
                      </td>
                      <td className="py-4 px-4 text-center print:hidden">
                        {fullyFulfilled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            Complete
                          </span>
                        ) : fulfilled > 0 ? (
                          <span className="text-xs text-amber-600 font-medium">
                            {fulfilled}/{item.quantity}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">
                            0/{item.quantity}
                          </span>
                        )}

                        {/* Individual fulfillment records with edit option */}
                        {records.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {records.map((rec) => (
                              <div
                                key={rec.id}
                                className="flex items-center justify-between gap-2 text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1"
                              >
                                <span className="text-slate-600 truncate">
                                  {rec.warehouse_name || "Warehouse"} ·{" "}
                                  {rec.quantity}u
                                </span>
                                <button
                                  // onClick={() => {
                                  //   setSelectedOrderItem(item);
                                  //   setEditingRecord(rec);
                                  //   setShowFulfillmentModal(true);
                                  // }}
                                  onClick={() => {
                                    if (
                                      selectedItemIds.size > 1 &&
                                      selectedItemIds.has(item.id)
                                    ) {
                                      setShowBulkModal(true);
                                    } else {
                                      setSelectedOrderItem(item);
                                      setEditingRecord(null);
                                      setShowFulfillmentModal(true);
                                    }
                                  }}
                                  className="text-blue-600 hover:text-blue-800 shrink-0"
                                  title="Edit fulfillment"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right text-slate-900">
                        ${parseFloat(item.unit_price).toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-right text-slate-900">
                        {item.discount_percentage > 0 ? (
                          <span className="text-red-600">
                            -{item.discount_percentage}% ($
                            {parseFloat(item.discount_amount).toFixed(2)})
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right font-semibold text-slate-900">
                        ${parseFloat(item.line_total).toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-center print:hidden">
                        {fullyFulfilled ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 text-xs font-medium rounded-lg">
                            <CheckCircle className="w-3 h-3" />
                            Fulfilled
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedOrderItem(item);
                              setEditingRecord(null);
                              setShowFulfillmentModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition"
                          >
                            <Truck className="w-3 h-3" />
                            Fulfill ({remaining})
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-full max-w-sm space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-medium text-slate-900">
                ${parseFloat(order.subtotal || "0").toFixed(2)}
              </span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Discount:</span>
                <span className="font-medium text-red-600">
                  -${parseFloat(order.discount_amount).toFixed(2)}
                </span>
              </div>
            )}
            {order.tax_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Tax:</span>
                <span className="font-medium text-slate-900">
                  ${parseFloat(order.tax_amount).toFixed(2)}
                </span>
              </div>
            )}
            {order.shipping_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Shipping:</span>
                <span className="font-medium text-slate-900">
                  ${parseFloat(order.shipping_amount).toFixed(2)}
                </span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between">
              <span className="font-semibold text-slate-900">Total:</span>
              <span className="font-bold text-xl text-blue-600">
                ${parseFloat(order.total_amount).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
              <span className="text-slate-600">Payment Status:</span>
              <span
                className={`font-semibold capitalize ${
                  order.payment_status === "paid"
                    ? "text-green-600"
                    : order.payment_status === "partial"
                      ? "text-yellow-600"
                      : "text-red-600"
                }`}
              >
                {order.payment_status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fulfillment Modal (create or edit) */}
      {showFulfillmentModal && selectedOrderItem && (
        <FulfillmentModal
          orderItem={selectedOrderItem}
          warehouses={warehouses}
          onClose={() => {
            setShowFulfillmentModal(false);
            setSelectedOrderItem(null);
            setEditingRecord(null);
          }}
          onFulfill={handleFulfillItem}
          onUpdate={handleUpdateFulfillment}
          editingRecord={editingRecord}
          remainingQuantity={getRemainingQuantity(
            selectedOrderItem.id,
            selectedOrderItem.quantity,
          )}
        />
      )}

      {/* Bulk Fulfillment Modal */}
      {showBulkModal && selectedItemsList.length > 0 && (
        <BulkFulfillModal
          items={selectedItemsList}
          warehouses={warehouses}
          remainingByItem={remainingByItem}
          onClose={() => setShowBulkModal(false)}
          onSubmit={handleBulkFulfill}
        />
      )}
    </div>
  );
}
