const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupMySQL() {
  console.log('🔄 Attempting MySQL Database Initialization...');
  console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`   User: ${process.env.DB_USER || 'root'}`);
  console.log(`   DB Name: ${process.env.DB_NAME || 'vehicle_rental_db'}`);

  try {
    // 1. Connect without specifying database to create database if missing
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    console.log('✅ Connected to MySQL Server!');

    const dbName = process.env.DB_NAME || 'vehicle_rental_db';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.query(`USE \`${dbName}\``);
    console.log(`✅ Selected Database: ${dbName}`);

    // 2. Read schema.sql & seed.sql
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');

    console.log('⏳ Running schema.sql...');
    await connection.query(schemaSql);
    console.log('✅ Tables created successfully!');

    console.log('⏳ Running seed.sql...');
    await connection.query(seedSql);
    console.log('✅ Seed data inserted successfully!');

    await connection.end();
    console.log('\n🎉 MySQL Database Setup Completed Successfully!');
    console.log('You can now run "npm start" to launch with full MySQL support.\n');
  } catch (error) {
    console.error('\n❌ MySQL Setup Failed:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('👉 TIP: Please set your MySQL root password in the ".env" file (DB_PASSWORD=your_password).');
    }
  }
}

setupMySQL();
