const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let mode = 'mysql';
let pool = null;
let sqliteDb = null;

async function initDB() {
  const dbEngine = process.env.DB_ENGINE || 'auto';

  if (dbEngine === 'mysql' || dbEngine === 'auto') {
    try {
      pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'vehicle_rental_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      // Test connection
      const conn = await pool.getConnection();
      console.log('✅ Connected successfully to MySQL Database!');
      conn.release();
      mode = 'mysql';
      return;
    } catch (err) {
      if (dbEngine === 'mysql') {
        console.error('❌ Could not connect to MySQL:', err.message);
        throw err;
      }
      console.warn('⚠️  MySQL connection failed (Host/Service down). Falling back to SQLite for local execution.');
    }
  }

  // Fallback to SQLite
  mode = 'sqlite';
  const dbPath = path.join(__dirname, '..', 'vehicle_rental_local.sqlite');
  
  await new Promise((resolve, reject) => {
    sqliteDb = new sqlite3.Database(dbPath, async (err) => {
      if (err) return reject(err);
      console.log(`✅ Using SQLite Database at: ${dbPath}`);
      try {
        await setupSqliteTables();
        resolve();
      } catch (setupErr) {
        reject(setupErr);
      }
    });
  });
}

async function setupSqliteTables() {
  const runSql = (sql) => new Promise((resolve, reject) => {
    sqliteDb.exec(sql, (err) => err ? reject(err) : resolve());
  });

  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      driver_license TEXT NOT NULL UNIQUE,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vehicle_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      daily_rate REAL NOT NULL,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      license_plate TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      seating_capacity INTEGER NOT NULL DEFAULT 5,
      fuel_type TEXT NOT NULL DEFAULT 'Gasoline',
      transmission TEXT NOT NULL DEFAULT 'Automatic',
      status TEXT NOT NULL DEFAULT 'available',
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES vehicle_categories(id)
    );

    CREATE TABLE IF NOT EXISTS rentals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      vehicle_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_days INTEGER NOT NULL DEFAULT 1,
      total_cost REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rental_id INTEGER NOT NULL UNIQUE,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'card_on_delivery',
      payment_status TEXT NOT NULL DEFAULT 'paid',
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      vehicle_id INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      position TEXT NOT NULL,
      phone TEXT NOT NULL,
      hired_date TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      admin_reply TEXT,
      replied_at DATETIME,
      status TEXT NOT NULL DEFAULT 'unread',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  await runSql(schema);

  // Migration helper for existing SQLite databases
  try {
    await runSql("ALTER TABLE contact_messages ADD COLUMN user_id INTEGER;");
  } catch(e){}
  try {
    await runSql("ALTER TABLE contact_messages ADD COLUMN admin_reply TEXT;");
  } catch(e){}
  try {
    await runSql("ALTER TABLE contact_messages ADD COLUMN replied_at DATETIME;");
  } catch(e){}

  // Seed default data if users table is empty
  const countRes = await new Promise((res) => {
    sqliteDb.get("SELECT COUNT(*) as cnt FROM users", (err, row) => res(row ? row.cnt : 0));
  });

  if (countRes === 0) {
    const adminPass = await bcrypt.hash('admin123', 10);
    const customerPass = await bcrypt.hash('customer123', 10);

    const seedSql = `
      INSERT INTO users (id, email, password_hash, role) VALUES 
      (1, 'admin@vehiclerent.com', '${adminPass}', 'admin'),
      (2, 'john.doe@gmail.com', '${customerPass}', 'customer'),
      (3, 'sarah.smith@yahoo.com', '${customerPass}', 'customer');

      INSERT INTO customers (id, user_id, first_name, last_name, phone, driver_license, address) VALUES
      (1, 2, 'John', 'Doe', '555-0192', 'DL-987654321', '123 Main Street, Suite 400, New York, NY'),
      (2, 3, 'Sarah', 'Smith', '555-0144', 'DL-123456789', '742 Evergreen Terrace, Springfield, IL');

      INSERT INTO vehicle_categories (id, name, description, daily_rate, image_url) VALUES
      (1, 'Luxury Sedan', 'Executive luxury sedans with premium leather interiors and smooth rides.', 95.00, 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800'),
      (2, 'Full-size SUV', 'Spacious 7-seater SUVs equipped for family trips and off-road capability.', 120.00, 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800'),
      (3, 'Electric / EV', 'Eco-friendly high performance electric vehicles with fast charging.', 110.00, 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800'),
      (4, 'Economy Hatchback', 'Fuel-efficient compact cars perfect for city commuting and quick trips.', 45.00, 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800'),
      (5, 'Convertible Sports', 'High performance open-top sports cars for stylish weekend getaways.', 150.00, 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?w=800');

      INSERT INTO vehicles (id, category_id, make, model, year, license_plate, color, seating_capacity, fuel_type, transmission, status, image_url) VALUES
      (1, 1, 'BMW', '5 Series 530i', 2023, 'NYC-5301', 'Black Sapphire', 5, 'Gasoline', 'Automatic', 'available', 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800'),
      (2, 1, 'Mercedes-Benz', 'E-Class E350', 2024, 'BENZ-889', 'Obsidian Black', 5, 'Gasoline', 'Automatic', 'available', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800'),
      (3, 2, 'Toyota', 'Land Cruiser V8', 2023, 'SUV-7700', 'Pearl White', 7, 'Gasoline', 'Automatic', 'rented', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800'),
      (4, 3, 'Tesla', 'Model S Plaid', 2024, 'EV-1000', 'Midnight Silver', 5, 'Electric', 'Automatic', 'available', 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800'),
      (5, 4, 'Honda', 'Civic EX', 2022, 'HON-4321', 'Sonic Gray', 5, 'Gasoline', 'Automatic', 'available', 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800'),
      (6, 5, 'Porsche', '911 Carrera Cabriolet', 2023, 'POR-9111', 'Guards Red', 2, 'Gasoline', 'Automatic', 'maintenance', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800');

      INSERT INTO rentals (id, customer_id, vehicle_id, start_date, end_date, total_days, total_cost, status) VALUES
      (1, 1, 3, date('now'), date('now', '+3 days'), 3, 360.00, 'active'),
      (2, 2, 1, date('now', '-10 days'), date('now', '-7 days'), 3, 285.00, 'completed');

      INSERT INTO payments (id, rental_id, amount, payment_method, payment_status) VALUES
      (1, 1, 360.00, 'card_on_delivery', 'paid'),
      (2, 2, 285.00, 'card_on_delivery', 'paid');

      INSERT INTO reviews (id, customer_id, vehicle_id, rating, comment) VALUES
      (1, 2, 1, 5, 'Sensational driving experience! The BMW 5 Series was spotless, fast, and smooth.');

      INSERT INTO employees (id, user_id, first_name, last_name, position, phone, hired_date) VALUES
      (1, 1, 'Admin', 'Manager', 'Fleet Director', '555-0100', '2023-01-15');

      INSERT INTO contact_messages (id, name, email, subject, message, status) VALUES
      (1, 'John Doe', 'john.doe@gmail.com', 'Inquiry about long-term Tesla rental', 'Hello, do you offer discounts for rentals longer than 2 weeks?', 'unread');
    `;
    await runSql(seedSql);
    console.log('✅ SQLite seeded with initial demo data!');
  } else {
    const adminPass = await bcrypt.hash('admin123', 10);
    const customerPass = await bcrypt.hash('customer123', 10);
    await runSql(`UPDATE users SET password_hash = '${adminPass}' WHERE email = 'admin@vehiclerent.com';`);
    await runSql(`UPDATE users SET password_hash = '${customerPass}' WHERE email IN ('john.doe@gmail.com', 'sarah.smith@yahoo.com');`);
  }
}

async function query(sql, params = []) {
  if (mode === 'mysql') {
    const [rows, fields] = await pool.execute(sql, params);
    return [rows, fields];
  } else {
    // SQLite execution wrapper returning [rows, info]
    return new Promise((resolve, reject) => {
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA');
      if (isSelect) {
        sqliteDb.all(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve([rows, null]);
        });
      } else {
        sqliteDb.run(sql, params, function (err) {
          if (err) return reject(err);
          resolve([{ insertId: this.lastID, affectedRows: this.changes }, null]);
        });
      }
    });
  }
}

module.exports = {
  initDB,
  query,
  getMode: () => mode
};
