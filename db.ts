import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// Connect to PostgreSQL
const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres',
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : {
    rejectUnauthorized: false
  }
});

// Initialize tables
const initDB = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT CHECK(role IN ('customer', 'agent', 'admin')) NOT NULL,
        phone TEXT,
        status TEXT CHECK(status IN ('active', 'blocked')) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        location TEXT NOT NULL,
        bhk_type TEXT NOT NULL, 
        bathrooms INTEGER,
        status TEXT CHECK(status IN ('available', 'rented')) NOT NULL DEFAULT 'available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS property_images (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL,
        image_url TEXT NOT NULL,
        FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS interests (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        type TEXT CHECK(type IN ('view_number', 'interested')) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS visitors (
        id SERIAL PRIMARY KEY,
        ip_address TEXT UNIQUE NOT NULL,
        city TEXT,
        region TEXT,
        country TEXT,
        visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add pincode column if it doesn't exist
    try {
      await db.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='pincode') THEN
            ALTER TABLE properties ADD COLUMN pincode TEXT;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='views') THEN
            ALTER TABLE properties ADD COLUMN views INTEGER DEFAULT 0;
          END IF;
        END
        $$;
      `);
    } catch (e) {
      console.log("Column check failed, might already exist or not supported in this context.");
    }

    // Seed data if empty
    const userCount = await db.query('SELECT count(*) as count FROM users');
    
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log('Seeding database...');
      
      // Create an admin
      await db.query(`INSERT INTO users (name, email, password, role, phone, status) VALUES ($1, $2, $3, $4, $5, $6)`, ['Admin User', 'admin@example.com', 'Skymark_0ne', 'admin', '9060530565', 'active']);
      await db.query(`INSERT INTO users (name, email, password, role, phone, status) VALUES ($1, $2, $3, $4, $5, $6)`, ['John Agent', 'agent@example.com', 'password123', 'agent', '555-0123', 'active']);
      await db.query(`INSERT INTO users (name, email, password, role, phone, status) VALUES ($1, $2, $3, $4, $5, $6)`, ['Jane Doe', 'jane@example.com', 'password123', 'customer', '555-0987', 'active']);

      console.log('Database seeded with initial users.');
    }

    // Ensure admin credentials are set as requested
    try {
      const admin = await db.query("SELECT * FROM users WHERE role = 'admin'");
      if (admin.rows.length > 0) {
        await db.query("UPDATE users SET phone = $1, password = $2 WHERE role = 'admin'", ['9060530565', 'Skymark_0ne']);
        console.log('Admin credentials updated.');
      }
    } catch (error) {
      console.error('Error updating admin credentials:', error);
    }

    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Database initialization error:", err);
  }
};

initDB();

export default db;
