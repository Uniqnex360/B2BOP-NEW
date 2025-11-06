import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { X, Upload, Download } from "lucide-react";
import * as XLSX from "xlsx";

interface ImportProductsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportProductsModal({
  onClose,
  onSuccess,
}: ImportProductsModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<{
    success: number;
    failed: number;
    products: number;
    variants: number;
  } | null>(null);

  const downloadTemplate = async () => {
    try {
      const response = await fetch("/src/data/product_import_template_new.csv");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "product_import_template.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading template:", error);
      alert("Failed to download template");
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const rowData: string[] = [];
    let currentValue = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"' && nextChar === '"' && insideQuotes) {
        currentValue += '"';
        i++;
      } else if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        rowData.push(currentValue.trim());
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    rowData.push(currentValue.trim());
    return rowData;
  };
  function findImageUrl(rowData: any): string | null {
  const possibleKeys = [
    'image url',
    'image_url', 
    'imageurl',
    'Image URL',
    'ImageUrl',
    'image',
    'Image',
    'url',
    'URL',
    'picture',
    'Picture'
  ];

  for (const key of possibleKeys) {
    const value = rowData[key]?.toString().trim();
    if (value && (value.startsWith('http://') || value.startsWith('https://'))) {
      return value;
    }
  }

  // Also check all keys that contain 'image' or 'url'
  const allKeys = Object.keys(rowData);
  for (const key of allKeys) {
    if ((key.toLowerCase().includes('image') || key.toLowerCase().includes('url')) && 
        !key.toLowerCase().includes('specification')) {
      const value = rowData[key]?.toString().trim();
      if (value && (value.startsWith('http://') || value.startsWith('https://'))) {
        return value;
      }
    }
  }

  return null;
}
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setResults(null);

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    // Convert to JSON with headers as keys
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

    if (!jsonData.length) {
      throw new Error("File is empty or invalid");
    }

    // DEBUG: Log all column names from first row
    console.log('All columns in first row:', Object.keys(jsonData[0]));

    let successCount = 0;
    let failedCount = 0;
    let productsCreated = 0;
    let variantsCreated = 0;
    let currentProduct: any = null;
    let currentProductId: string | null = null;

    for (let i = 0; i < jsonData.length; i++) {
      const rowData = jsonData[i] as any;

      const itemType = rowData["item type"]?.toString().trim().toLowerCase();
      const sku = rowData["sku"]?.toString().trim();

      if (!sku) continue;

      try {
        if (itemType === "product") {
          const productName = rowData['product name']?.toString().trim();
          const brand = rowData['brand']?.toString().trim();
          const category = rowData['category_1']?.toString().trim();
          const description = rowData['description']?.toString().trim();
          const unitPrice = rowData['unit price']?.toString().trim();
          const costPrice = rowData['cost price']?.toString().trim();
          const stockQty = rowData["stock quantity"]?.toString().trim();
          const minOrderQty = rowData['min order qty']?.toString().trim();
          const maxOrderQty = rowData['max order qty']?.toString().trim();
          const uom = rowData['unit of measure']?.toString().trim() || "unit";
          
          // More robust image URL extraction
          const imageUrl = findImageUrl(rowData);
          
          console.log(`Processing ${sku}:`, { imageUrl });

          let categoryId = null;
          let brandId = null;

          if (category) {
            const { data: cat } = await supabase
              .from("categories")
              .select("id")
              .eq("seller_id", profile!.id)
              .ilike("name", category)
              .maybeSingle();

            if (!cat) {
              const { data: newCat } = await supabase
                .from("categories")
                .insert({
                  seller_id: profile!.id,
                  name: category,
                  is_active: true,
                })
                .select()
                .single();
              categoryId = newCat?.id;
            } else {
              categoryId = cat.id;
            }
          }

          if (brand) {
            const { data: brnd } = await supabase
              .from("brands")
              .select("id")
              .eq("seller_id", profile!.id)
              .ilike("name", brand)
              .maybeSingle();

            if (!brnd) {
              const { data: newBrand } = await supabase
                .from("brands")
                .insert({
                  seller_id: profile!.id,
                  name: brand,
                  is_active: true,
                })
                .select()
                .single();
              brandId = newBrand?.id;
            } else {
              brandId = brnd.id;
            }
          }

          const hasVariants = i + 1 < jsonData.length && (jsonData[i + 1] as any)['item type']?.toString().trim().toLowerCase() === "variant";

          const { data: product, error: prodError } = await supabase
            .from("products")
            .insert({
              seller_id: profile!.id,
              parent_sku: sku,
              sku: sku,
              vendor_name: rowData['vendor name']?.trim() || null,
              features: rowData["features"]?.trim() || null,
              specifications: rowData['Specifications (Name: Value)']?.trim() || null,
              name: productName,
              description: description || null,
              category_id: categoryId,
              brand_id: brandId,
              unit_price: parseFloat(unitPrice) || 0,
              cost_price: parseFloat(costPrice) || 0,
              stock_quantity: parseInt(stockQty) || 0,
              min_order_quantity: parseInt(minOrderQty) || 1,
              max_order_quantity: maxOrderQty ? parseInt(maxOrderQty) : null,
              unit_of_measure: uom,
              image_url: imageUrl || null,
              has_variants: hasVariants,
              is_visible: rowData['is visible']
                ? rowData['is visible'].toString().trim().toLowerCase() === "true"
                : true,
              is_active:
                rowData['is active']?.toString().trim().toLowerCase() === "true" || true,
            })
            .select()
            .single();

          if (prodError) {
            console.error("Product insert error:", prodError);
            failedCount++;
            currentProduct = null;
            currentProductId = null;
            continue;
          }

          productsCreated++;
          successCount++;
          currentProduct = product;
          currentProductId = product.id;
        } 
      }catch (err: any) {
      console.error("Import error:", err);
      setError(err.message || "Failed to import products");
    } finally {
      setLoading(false);
    }
  };
}

  return (
    <div className="fixed inset-0 bg-blue-600/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Import Products</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {results ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-semibold mb-2">
                  Import Complete!
                </p>
                <div className="space-y-1 text-sm">
                  <p className="text-green-700">
                    <span className="font-medium">Products created:</span>{" "}
                    {results.products}
                  </p>
                  <p className="text-green-700">
                    <span className="font-medium">Variants created:</span>{" "}
                    {results.variants}
                  </p>
                  <p className="text-green-700">
                    <span className="font-medium">Total items:</span>{" "}
                    {results.success}
                  </p>
                  {results.failed > 0 && (
                    <p className="text-red-700">
                      <span className="font-medium">Failed:</span>{" "}
                      {results.failed}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <p className="text-sm text-slate-700 font-medium">
                  Upload CSV, XLSX, or XLS file with your products and variants
                </p>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800 font-medium mb-2">
                    Template Format:
                  </p>
                  <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                    <li>First row: Product with parent SKU</li>
                    <li>Following rows: Variants with unique SKUs</li>
                    <li>
                      Supports up to 5 variation types (size, color, etc.)
                    </li>
                    <li>Each variant can have different price and stock</li>
                  </ul>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download Template with Sample Products
                </button>
              </div>

              <label className="block">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={loading}
                  className="hidden"
                />
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 cursor-pointer transition">
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-sm font-medium text-slate-700 mb-1">
                    {loading ? "Importing..." : "Click to upload CSV/XLSX/XLS"}
                  </p>
                  <p className="text-xs text-slate-600">
                    Supports CSV, XLSX, and XLS formats
                  </p>
                </div>
              </label>

              <button
                onClick={onClose}
                disabled={loading}
                className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}