import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// ==========================================
// CONFIGURATION
// ==========================================
const OLD_URL = "https://bhxsvyjpmppelmulkccr.supabase.co";
const OLD_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeHN2eWpwbXBwZWxtdWxrY2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTEzNjMsImV4cCI6MjA3NzkyNzM2M30.wbnowAwwN3kCk2GiOdBWgx6qiTg3K2O66yqyLBMtOnw";

const NEW_URL = "https://pdygktjynbkrurzgkwup.supabase.co";
const NEW_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkeWdrdGp5bmJrcnVyemdrd3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzg5NDk5MiwiZXhwIjoyMTAzNDcwOTkyfQ.OZ8LpVvTYE-CHwtnS4nbTDcpSkgjuGQEL2CZdtZKLhc";

const oldClient = createClient(OLD_URL, OLD_ANON_KEY);
const newClient = createClient(NEW_URL, NEW_SERVICE_ROLE_KEY);

// Insertion/Drop Order to prevent foreign key issues
const orderedTables = [
  "user_profiles",
  "categories",
  "brands",
  "promotions",
  "warehouses",
  "buyer_credit_terms",
  "products",
  "product_variants",
  "buyer_addresses",
  "buyer_payment_methods",
  "buyer_discounts",
  "cart",
  "wishlist",
  "orders",
  "order_items",
  "messages",
  "shipments",
  "shipment_items",
  "payments",
];

// Structural schema map with Foreign Key relationships built-in
const FK_MAPPINGS = {
  categories: { seller_id: "user_profiles" },
  brands: { seller_id: "user_profiles" },
  warehouses: { seller_id: "user_profiles" },
  products: {
    seller_id: "user_profiles",
    category_id: "categories",
    brand_id: "brands",
  },
  product_variants: { product_id: "products" },
  buyer_addresses: { buyer_id: "user_profiles" },
  wishlist: {
    buyer_id: "user_profiles",
    product_id: "products",
  },
  shipment_items: {
    shipment_id: "shipments",
    order_item_id: "order_items",
    warehouse_id: "warehouses",
  },
};

function getPgType(val) {
  if (val === null || val === undefined) return "TEXT";
  if (typeof val === "boolean") return "BOOLEAN";
  if (typeof val === "number")
    return Number.isInteger(val) ? "BIGINT" : "NUMERIC";
  if (typeof val === "object") return "JSONB";
  if (typeof val === "string") {
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        val,
      )
    )
      return "UUID";
    if (!isNaN(Date.parse(val)) && val.includes("T")) return "TIMESTAMPTZ";
    return "TEXT";
  }
  return "TEXT";
}

async function runMigration() {
  console.log("🚀 Starting Extraction & DDL Generation...\n");

  const extractedData = {};

  // -------------------------------------------------------------
  // STEP 1: EXTRACT DATA FROM OLD SUPABASE
  // -------------------------------------------------------------
  console.log("📦 Phase 1: Extracting data from old project...");
  for (const table of orderedTables) {
    try {
      const { data, error } = await oldClient.from(table).select("*");
      if (error) {
        console.error(`  ⚠️ [${table}] Extract warning: ${error.message}`);
        extractedData[table] = [];
        continue;
      }
      extractedData[table] = data || [];
      console.log(
        `  ✅ [${table}] Extracted ${extractedData[table].length} rows`,
      );
    } catch (err) {
      console.error(`  ❌ [${table}] Fetch error:`, err.message);
      extractedData[table] = [];
    }
  }

  // -------------------------------------------------------------
  // STEP 2: GENERATE VALID schema.sql SCRIPT WITH FOREIGN KEYS
  // -------------------------------------------------------------
  console.log("\n📝 Phase 2: Generating schema.sql with FK constraints...");

  let sqlScript = `-- Automated Table Reset & Creation Script (With Foreign Keys)\n\n`;

  // Safe Cascade Drops (Reverse Dependency Order)
  sqlScript += `-- Drop existing tables in reverse order\n`;
  const dropOrder = [...orderedTables].reverse();
  for (const table of dropOrder) {
    sqlScript += `DROP TABLE IF EXISTS public."${table}" CASCADE;\n`;
  }
  sqlScript += `\n`;

  // Create tables in correct dependency order
  sqlScript += `-- Create new tables\n`;
  for (const table of orderedTables) {
    const rows = extractedData[table];
    const tableFKs = FK_MAPPINGS[table] || {};

    if (!rows || rows.length === 0) {
      sqlScript += `CREATE TABLE IF NOT EXISTS public."${table}" (\n  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  "created_at" TIMESTAMPTZ DEFAULT now()\n);\n\n`;
      continue;
    }

    const schemaMap = {};
    rows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (!schemaMap[key] || schemaMap[key] === "TEXT") {
          schemaMap[key] = getPgType(row[key]);
        }
      });
    });

    sqlScript += `CREATE TABLE public."${table}" (\n`;
    const columns = Object.entries(schemaMap).map(([col, type]) => {
      let colDef = `  "${col}" ${type}`;

      if (col === "id") {
        colDef += " PRIMARY KEY";
        if (type === "UUID") colDef += " DEFAULT gen_random_uuid()";
      } else if (col === "created_at" || col === "updated_at") {
        colDef += " DEFAULT now()";
      } else if (tableFKs[col]) {
        colDef += ` REFERENCES public."${tableFKs[col]}"("id") ON DELETE SET NULL`;
      }

      return colDef;
    });

    sqlScript += columns.join(",\n");
    sqlScript += `\n);\n\n`;
  }

  fs.writeFileSync("./schema.sql", sqlScript);
  console.log("  ✅ Saved schema with FK relationships to schema.sql");

  fs.writeFileSync(
    "./migration_data.json",
    JSON.stringify(extractedData, null, 2),
  );

  console.log("\n⚠️ STEP 1 COMPLETE. NEXT INSTRUCTIONS:");
  console.log(
    "1. Paste the generated 'schema.sql' into NEW Supabase SQL Editor & click RUN.",
  );
  console.log("2. Then run: node sandbox.js import");
}

async function runImportOnly() {
  console.log("📥 Phase 3: Importing data into target database...");

  if (!fs.existsSync("./migration_data.json")) {
    console.error(
      '❌ migration_data.json not found! Run "node sandbox.js" first.',
    );
    return;
  }

  const extractedData = JSON.parse(
    fs.readFileSync("./migration_data.json", "utf-8"),
  );

  for (const table of orderedTables) {
    const rows = extractedData[table];

    if (!rows || rows.length === 0) {
      console.log(`  ⚠️ [${table}] Skipping insert (0 rows captured)`);
      continue;
    }

    // Insert records in dependent order
    const { error } = await newClient.from(table).upsert(rows);

    if (error) {
      console.error(`  ❌ [${table}] Insert failed: ${error.message}`);
    } else {
      console.log(`  ✅ [${table}] Successfully migrated ${rows.length} rows!`);
    }
  }

  console.log("\n🎉 Data Migration Complete!");
}

if (process.argv[2] === "import") {
  runImportOnly();
} else {
  runMigration();
}
