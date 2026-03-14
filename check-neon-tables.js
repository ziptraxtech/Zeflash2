#!/usr/bin/env node
// Verify Neon DB tables using Node.js
const https = require('https');

// Neon connection string
const connStr = "postgresql://neondb_owner:npg_FUbyO8xnPc7V@ep-old-river-aiawku58-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// Parse connection string
const url = new URL(connStr.replace('postgresql://', 'https://'));
const user = url.username;
const password = url.password;
const host = url.hostname;
const dbname = url.pathname.replace('/', '');

console.log('🔍 Connecting to Neon DB...\n');
console.log(`Host: ${host}`);
console.log(`Database: ${dbname}\n`);

// Create a simple query using REST API (if available) or direct SQL
const { spawn } = require('child_process');
const path = require('path');

// Try using npx to run a Prisma introspection
const introspect = spawn('npx', ['prisma', 'db', 'execute', '--stdin', '--datasource-url', connStr], {
  cwd: path.resolve(__dirname),
  env: { ...process.env, DATABASE_URL: connStr }
});

let queryOutput = '';

introspect.stdin.write(`
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
`);
introspect.stdin.end();

introspect.stdout.on('data', (data) => {
  queryOutput += data.toString();
});

introspect.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

introspect.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Query Result:\n', queryOutput);
  } else {
    console.log('⚠️  Could not query directly. Let me check Prisma migrations status...\n');
    
    // Alternative: Check migrations directory
    const fs = require('fs');
    const migrationsPath = './prisma/migrations';
    
    if (fs.existsSync(migrationsPath)) {
      const migrations = fs.readdirSync(migrationsPath).filter(f => !f.startsWith('.'));
      console.log('📋 Available Migrations:\n');
      migrations.forEach(m => {
        console.log(`  ✓ ${m}`);
        
        // Show migration SQL
        const sqlPath = `${migrationsPath}/${m}/migration.sql`;
        if (fs.existsSync(sqlPath)) {
          const sql = fs.readFileSync(sqlPath, 'utf-8');
          console.log(`    Tables: ${sql.match(/CREATE TABLE "(\w+)"/g)?.map(m => m.replace(/CREATE TABLE "|"/g, '')).join(', ') || 'N/A'}\n`);
        }
      });
      
      console.log('\n⚡ To apply migrations to Neon DB, run:');
      console.log('   npx prisma migrate deploy');
      console.log('\n   OR manually in Neon console:');
      console.log('   1. Go to https://console.neon.tech');
      console.log('   2. Open SQL Editor');
      console.log('   3. Copy & paste migration.sql content');
    }
  }
});
