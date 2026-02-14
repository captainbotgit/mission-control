#!/usr/bin/env node
/**
 * Run Supabase migrations for Mission Control
 * 
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/run-migration.js
 * 
 * Or with .env.local:
 *   node -e "require('dotenv').config({path:'.env.local'})" && node scripts/run-migration.js
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function testConnection() {
  console.log("Testing Supabase connection...");
  const { data, error } = await supabase.from("dashboard_agents").select("id").limit(1);
  if (error) {
    console.error("Connection failed:", error.message);
    return false;
  }
  console.log("✅ Connected to Supabase");
  return true;
}

async function checkTableExists(tableName) {
  const { data, error } = await supabase.from(tableName).select("id").limit(1);
  if (error && error.code === "PGRST205") return false; // Table not found
  if (error && error.code === "42P01") return false; // Relation does not exist
  return true;
}

async function main() {
  const connected = await testConnection();
  if (!connected) process.exit(1);

  // Check if tables exist
  const deliverableExists = await checkTableExists("dashboard_deliverables");
  const logExists = await checkTableExists("dashboard_approval_log");

  if (deliverableExists && logExists) {
    console.log("✅ Both tables already exist. No migration needed.");
    
    // Show counts
    const { count: dCount } = await supabase.from("dashboard_deliverables").select("*", { count: "exact", head: true });
    const { count: lCount } = await supabase.from("dashboard_approval_log").select("*", { count: "exact", head: true });
    console.log(`  dashboard_deliverables: ${dCount || 0} rows`);
    console.log(`  dashboard_approval_log: ${lCount || 0} rows`);
    return;
  }

  console.log("\n⚠️  Tables missing. Run this SQL in Supabase SQL Editor:");
  console.log("Project: " + supabaseUrl);
  console.log("URL: " + supabaseUrl.replace(".supabase.co", ".supabase.co").replace("https://", "https://supabase.com/dashboard/project/") + "/sql/new");
  console.log("\n--- SQL START ---");
  const sql = fs.readFileSync(path.join(__dirname, "../supabase/approvals-schema.sql"), "utf8");
  console.log(sql);
  console.log("--- SQL END ---\n");
}

main().catch(console.error);
