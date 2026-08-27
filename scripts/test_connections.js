const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xmoisebmdlrjrczwphhh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhtb2lzZWJtZGxyanJjendwaGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MjQyNzUsImV4cCI6MjEwMTAwMDI3NX0.WScnUC6ITEmsDLGnbtePrMICTXz4UhBwsjNUjpGevv8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkConnections() {
  console.log('====================================================');
  console.log('🔍 RUNNING LITTLEFUN V2 INFRASTRUCTURE DIAGNOSTICS');
  console.log('====================================================\n');

  // 1. Supabase Ping & Tables Test
  console.log('1️⃣ Checking Supabase Connection (URL: ' + SUPABASE_URL + ')');
  const tables = ['users', 'profiles', 'app_banners', 'app_config', 'cities', 'meeting_requests', 'profile_verifications'];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`   ❌ Table [${table}]: ${error.message} (Code: ${error.code})`);
      } else {
        console.log(`   ✅ Table [${table}]: Connected! Count: ${count ?? 0}`);
      }
    } catch (e) {
      console.log(`   ⚠️ Table [${table}]: Exception: ${e.message}`);
    }
  }

  // 2. Test Render Live Backend API
  console.log('\n2️⃣ Checking Render Live Backend API (https://littlefun.onrender.com)');
  try {
    const healthRes = await fetch('https://littlefun.onrender.com/health');
    const healthData = await healthRes.json();
    console.log(`   ✅ /health status: ${healthRes.status}, data:`, JSON.stringify(healthData));
  } catch (e) {
    console.log(`   ❌ /health failed: ${e.message}`);
  }

  try {
    const rootRes = await fetch('https://littlefun.onrender.com/', { headers: { 'Accept': 'application/json' } });
    const rootData = await rootRes.json();
    console.log(`   ✅ / root status: ${rootRes.status}, API Name: ${rootData.name || 'OK'}`);
  } catch (e) {
    console.log(`   ❌ / root failed: ${e.message}`);
  }

  // 3. Test Firebase Client Config
  console.log('\n3️⃣ Checking Firebase Web Project Config');
  const firebaseProjectId = 'littlefunwithpartner';
  try {
    const fbRes = await fetch(`https://${firebaseProjectId}.firebaseapp.com/__/firebase/init.json`);
    if (fbRes.ok) {
      const fbData = await fbRes.json();
      console.log(`   ✅ Firebase Hosting / Auth Domain reachable: ${firebaseProjectId}.firebaseapp.com`);
      console.log(`   ✅ App ID: ${fbData.appId || '1:189951969884:web:80e87ed18c651571fd7499'}`);
    } else {
      console.log(`   ℹ️ Firebase init endpoint status: ${fbRes.status}`);
    }
  } catch (e) {
    console.log(`   ⚠️ Firebase check: ${e.message}`);
  }

  console.log('\n====================================================');
  console.log('🏁 DIAGNOSTICS COMPLETED');
  console.log('====================================================');
}

checkConnections();
