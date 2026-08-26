const fs = require('fs');
const path = require('path');

const root = process.cwd();
const adminDist = path.join(root, 'apps', 'admin', 'dist');
const customerDist = path.join(root, 'apps', 'customer', 'dist');
const targetAdminDist = path.join(customerDist, 'admin');

console.log('📦 Bundling Admin Portal into Customer dist for unified deployment...');

if (!fs.existsSync(adminDist)) {
  console.error('❌ Admin dist not found at:', adminDist);
  process.exit(1);
}

if (!fs.existsSync(customerDist)) {
  console.error('❌ Customer dist not found at:', customerDist);
  process.exit(1);
}

// Clean target directory
if (fs.existsSync(targetAdminDist)) {
  fs.rmSync(targetAdminDist, { recursive: true, force: true });
}

// Copy admin dist into customer/dist/admin
fs.cpSync(adminDist, targetAdminDist, { recursive: true });

console.log('✅ Admin Portal bundled into /admin successfully!');
