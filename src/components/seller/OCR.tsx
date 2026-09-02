import React, { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  FileImage,
  FileSpreadsheet,
  FileText,
  Layers,
  Loader2,
  Sparkles,
  Tag,
  Trash2,
  Upload,
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as XLSX from "xlsx";

/**
 * Vision Data Extractor — single-file TypeScript version.
 *
 * Extraction runs through OpenRouter's free MiniMax M3 vision model:
 * https://openrouter.ai/minimax/minimax-m3:free
 *
 * The API key comes from a .env file (Vite convention):
 *   VITE_OPENROUTER_API_KEY=sk-or-v1-...
 *
 * Note: this key still ends up in the browser bundle/requests, since there's
 * no backend. That's fine for local/personal use; put a server in front of
 * it for anything public-facing.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_NAME = "minimax/minimax-m3:free";
const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "image/gif",
];

type ExtractionResult = Record<string, string | number | boolean>;

const PROMPT = `
Analyze this image carefully and extract ALL information visible in it. Treat it as an
ecommerce-related document — such as an invoice, receipt, purchase order, packing slip,
delivery note, order confirmation, quotation, ledger, passbook, or similar — and extract
accordingly based on what is actually present.

OUTPUT FORMAT — STRICT:
- Return ONE single flat JSON object. No nested objects, no arrays.
- No markdown, no code fences, no commentary — the response body must be valid JSON only.
- Every key must be flat, snake_case, at the same top level.

FLATTENING REPEATING ROWS (tables, ledgers, line items):
Flatten each row's fields into top-level keys with the row index appended, e.g.
"transaction_date_1", "transaction_details_1", "transaction_out_1", "transaction_date_2", ...
Group headers become prefixes, e.g. "billing_address_city", "item_total_amount_1".

INCLUDE EVERYTHING:
- Every piece of visible text (OCR), including fine print, barcodes, signatures.
- A short "document_description" field.
- Vendor/customer info, dates, order/invoice numbers, item details, taxes, totals, status.

US FORMAT NORMALIZATION:
- Dates → MM/DD/YYYY. Phone → (XXX) XXX-XXXX.
- Currency → for every monetary field, output both a numeric key (e.g. "grand_total_amount")
  and a currency-code key (e.g. "grand_total_currency"). If no symbol is printed, infer the
  currency from context (addresses, GSTIN, store location) and apply it to every price.
- Measurements → convert metric to imperial and note the conversion.
- Addresses → "Street, City, ST ZIP" with USPS state abbreviations.
- Numbers → comma thousands separators, period decimals.

NEVER HALLUCINATE:
- Do not invent fields (discount, tax, shipping, etc.) that aren't printed on the document.
- Leave genuinely blank cells as empty strings, but keep the key.
- Skip logos entirely — no key for them.

Respond with ONE valid, flat JSON object only.
`;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function cleanJsonText(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

async function extractWithOpenRouter(
  file: File,
  dataUrl: string,
): Promise<ExtractionResult> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
        `OpenRouter request failed (${response.status})`,
    );
  }

  const rawText: string | undefined = payload?.choices?.[0]?.message?.content;
  if (!rawText) throw new Error("OpenRouter returned an empty response.");

  let data: ExtractionResult;
  try {
    data = JSON.parse(cleanJsonText(rawText));
  } catch {
    throw new Error(
      `Model did not return valid JSON. Raw output: ${rawText.slice(0, 500)}`,
    );
  }

  return { ...data, file_name: file.name };
}

function flattenObject(
  obj: ExtractionResult,
): Record<string, string | number | boolean> {
  const flat: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(obj)) {
    flat[key] = typeof value === "object" ? JSON.stringify(value) : value;
  }
  return flat;
}

function formatKeyName(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Split a flat result into ungrouped "general" fields and "_N" suffixed row groups. */
function groupResult(data: ExtractionResult | null) {
  const general: ExtractionResult = {};
  const grouped: Record<string, ExtractionResult> = {};
  if (!data) return { general, grouped };

  for (const [key, value] of Object.entries(data)) {
    if (key === "file_name") continue;
    const match = key.match(/^(.*)_(\d+)$/);
    if (match) {
      const [, baseKey, index] = match;
      grouped[index] = { ...grouped[index], [baseKey]: value };
    } else {
      general[key] = value;
    }
  }
  return { general, grouped };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ImageExtractorDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = (selectedFile: File | undefined) => {
    if (!selectedFile) return;
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      toast.error(
        "Unsupported image format. Please upload PNG, JPG, WEBP, BMP, TIFF, or GIF.",
      );
      return;
    }
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setResult(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files?.[0]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = imageContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handleExtract = async () => {
    if (!API_KEY) {
      toast.error(
        "Missing VITE_OPENROUTER_API_KEY — set it in your .env file.",
      );
      return;
    }
    if (!file) {
      toast.warn("Please select or drop an image first.");
      return;
    }

    setLoading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const data = await extractWithOpenRouter(file, dataUrl);
      setResult(data);
      toast.success("Extraction completed successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Extraction failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyJSON = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    toast.info("Data copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const baseFilename = () => `extraction_${file?.name.split(".")[0] ?? "data"}`;

  const handleExportExcel = () => {
    if (!result) return;
    const worksheet = XLSX.utils.json_to_sheet([flattenObject(result)]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Extraction Result");
    XLSX.writeFile(workbook, `${baseFilename()}.xlsx`);
    toast.success("Exported as .xlsx");
  };

  const handleExportCSV = () => {
    if (!result) return;
    const worksheet = XLSX.utils.json_to_sheet([flattenObject(result)]);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    downloadBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `${baseFilename()}.csv`,
    );
    toast.success("Exported as .csv");
  };

  const { general, grouped } = groupResult(result);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        <header className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-600" />
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Vision Data Extractor
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Upload a document or photo to extract structured OCR data via
              OpenRouter's free MiniMax M3 model.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm font-medium bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
            {API_KEY ? (
              <span className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" /> API Key Loaded
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-600">
                <AlertCircle className="w-4 h-4" /> Missing
                VITE_OPENROUTER_API_KEY
              </span>
            )}
            <span className="text-xs bg-slate-200 text-slate-700 font-mono px-2 py-0.5 rounded-md">
              {MODEL_NAME}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Source Image
              </h2>

              {!preview ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    dragActive
                      ? "border-indigo-500 bg-indigo-50/50"
                      : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  />
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    Click to upload or drag & drop image
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    PNG, JPG, WEBP, BMP, TIFF, or GIF
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    ref={imageContainerRef}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onMouseMove={handleMouseMove}
                    className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center min-h-[250px] max-h-[400px] cursor-crosshair"
                  >
                    <img
                      src={preview}
                      alt="Upload preview"
                      style={{
                        transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                        transform: isHovered ? "scale(2.5)" : "scale(1)",
                      }}
                      className="max-h-[380px] w-auto object-contain transition-transform duration-150 ease-out pointer-events-none"
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-xs p-1 rounded-lg shadow-md border border-slate-200 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setPreview(null);
                          setResult(null);
                        }}
                        className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-md transition-colors"
                        title="Remove image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {!isHovered && (
                      <div className="absolute bottom-3 left-3 bg-black/60 text-white text-[10px] font-mono px-2 py-0.5 rounded-md backdrop-blur-xs pointer-events-none">
                        Hover to zoom
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span className="truncate max-w-[200px] font-mono">
                      {file?.name}
                    </span>
                    <span>{file ? (file.size / 1024).toFixed(1) : 0} KB</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleExtract}
                disabled={!file || loading || !API_KEY}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing Image...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Extract Data
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 h-full flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-slate-900">
                    Extracted Information
                  </h2>
                </div>

                {result && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyJSON}
                      className="flex items-center gap-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-900 px-3 py-2 rounded-lg transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center gap-1.5 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      CSV
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="flex items-center gap-1.5 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-lg transition-colors"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Excel (.xlsx)
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 bg-slate-50/50 rounded-xl p-4 overflow-auto min-h-[350px] max-h-[550px]">
                {loading ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-700 gap-3 py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <p className="text-sm font-medium">
                      Extracting information from image...
                    </p>
                  </div>
                ) : result ? (
                  <div className="space-y-6">
                    {Object.keys(general).length > 0 && (
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                        <div className="bg-slate-100/70 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
                          <Tag className="w-4 h-4 text-slate-500" />
                          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            General Details
                          </span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {Object.entries(general).map(([key, value]) => (
                            <div
                              key={key}
                              className="grid grid-cols-1 md:grid-cols-3 p-3 text-sm gap-1 hover:bg-slate-50/80 transition-colors"
                            >
                              <span className="font-medium text-slate-600 md:col-span-1">
                                {formatKeyName(key)}
                              </span>
                              <span className="text-slate-900 md:col-span-2 break-words">
                                {String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {Object.entries(grouped).map(([index, items]) => (
                      <div
                        key={index}
                        className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs"
                      >
                        <div className="bg-indigo-50/60 px-4 py-2.5 border-b border-indigo-100 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                            Item Group #{index}
                          </span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {Object.entries(items).map(([baseKey, value]) => (
                            <div
                              key={baseKey}
                              className="grid grid-cols-1 md:grid-cols-3 p-3 text-sm gap-1 hover:bg-slate-50/80 transition-colors"
                            >
                              <span className="font-medium text-slate-600 md:col-span-1">
                                {formatKeyName(baseKey)}
                              </span>
                              <span className="text-slate-900 md:col-span-2 break-words font-medium">
                                {String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 py-16">
                    <FileImage className="w-10 h-10 stroke-[1.5] text-slate-400" />
                    <p className="text-sm font-medium text-slate-600">
                      No extracted data to display
                    </p>
                    <p className="text-xs text-slate-400">
                      Upload an image and click "Extract Data" to see results
                      here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
