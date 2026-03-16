// Simple script to verify database tables
const { Pool } = require('pg');

// Use DATABASE_URL from environment or .env file
// This file is for local testing only - do not commit to GitHub
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: DATABASE_URL environment variable not set');
  console.error('Add DATABASE_URL to your .env file or set it as an environment variable');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function checkTables() {
  try {
    console.log("🔗 Connecting to Neon DB...\n");
    
    // Get all tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log("📊 Tables in database:\n");
    if (result.rows.length === 0) {
      console.log("❌ No tables found!");
      console.log("\nYou need to run migrations first:");
      console.log("  npm install");
      console.log("  npx prisma migrate deploy");
    } else {
      result.rows.forEach(row => {
        console.log(`  ✅ ${row.table_name}`);
      });
      
      console.log("\n" + "=".repeat(50));
      
      // Check InferenceResult table details
      const inferenceResult = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'InferenceResult'
        ORDER BY ordinal_position;
      `);
      
      if (inferenceResult.rows.length > 0) {
        console.log("\n📋 InferenceResult table columns:\n");
        inferenceResult.rows.forEach(col => {
          console.log(`  • ${col.column_name}: ${col.data_type}`);
        });
      }
    }
    
    await pool.end();
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkTables();
