const mysql = require('mysql2/promise');
require('dotenv').config();

// Default values if .env is missing or incomplete
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASSWORD || process.env.DB_PASS || '';
const DB_NAME = process.env.DB_NAME || 'shophub_db';

let connection;

const connectDB = async (retries = 5) => {
    while (retries) {
        try {
            connection = mysql.createPool({
                host: DB_HOST,
                user: DB_USER,
                password: DB_PASS,
                database: DB_NAME,
                port: process.env.DB_PORT || 3306,
                ssl: { rejectUnauthorized: false }, // Common for cloud hosted DBs like TiDB
                multipleStatements: true,
                timezone: 'Z',
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
            console.log('Connected to Database successfully (Pool initialized)');
            return connection;
        } catch (err) {
            console.error('Database connection failed:', err.message);
            retries -= 1;
            console.log(`Retries left: ${retries}. Initializing fallback or retrying...`);
            if (retries === 0) throw err;
            await new Promise(res => setTimeout(res, 3000));
        }
    }
};

const initDB = async () => {
    try {
        if (!connection) await connectDB();

        console.log('Synchronizing tables...');

        const tables = [
            `CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                isAdmin BOOLEAN DEFAULT FALSE,
                reset_token VARCHAR(255),
                reset_token_expiry DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                category VARCHAR(100),
                description TEXT,
                image TEXT,
                stock_quantity INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                total DECIMAL(10, 2) NOT NULL,
                status ENUM('Processing', 'Shipped', 'Delivered', 'Cancelled') DEFAULT 'Processing',
                shipping_name VARCHAR(100),
                shipping_address VARCHAR(255),
                shipping_city VARCHAR(100),
                shipping_zip VARCHAR(20),
                shipping_phone VARCHAR(20),
                payment_method VARCHAR(50),
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                product_id INT,
                title VARCHAR(255),
                price DECIMAL(10, 2),
                quantity INT,
                image TEXT,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                user_id INT NOT NULL,
                user_name VARCHAR(100),
                rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS slides (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                subtitle VARCHAR(255),
                image TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS subscribers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const tableSql of tables) {
            await connection.query(tableSql);
        }

        // --- Migrations for existing tables ---
        try {
            // Check and add transaction_id column to orders if missing
            const [orderColumns] = await connection.query("SHOW COLUMNS FROM orders LIKE 'transaction_id'");
            if (orderColumns.length === 0) {
                console.log('Adding transaction_id column to orders table...');
                await connection.query("ALTER TABLE orders ADD COLUMN transaction_id VARCHAR(100)");
            }

            // Check and add profile_image column to users if missing
            const [userColumns] = await connection.query("SHOW COLUMNS FROM users LIKE 'profile_image'");
            if (userColumns.length === 0) {
                console.log('Adding profile_image column to users table...');
                await connection.query("ALTER TABLE users ADD COLUMN profile_image LONGTEXT");
            }

            // Check and add profile_pic_updates column to users if missing
            const [updateColumns] = await connection.query("SHOW COLUMNS FROM users LIKE 'profile_pic_updates'");
            if (updateColumns.length === 0) {
                console.log('Adding profile_pic_updates column to users table...');
                await connection.query("ALTER TABLE users ADD COLUMN profile_pic_updates INT DEFAULT 0");
            }

            // Check and add phone and location columns
            const [phoneCols] = await connection.query("SHOW COLUMNS FROM users LIKE 'phone'");
            if (phoneCols.length === 0) {
                console.log('Adding phone/location columns...');
                await connection.query("ALTER TABLE users ADD COLUMN phone VARCHAR(50)");
                await connection.query("ALTER TABLE users ADD COLUMN location VARCHAR(255)");
            }
            // Check and add reset token columns to users
            const [resetCols] = await connection.query("SHOW COLUMNS FROM users LIKE 'reset_token'");
            if (resetCols.length === 0) {
                console.log('Adding reset token columns...');
                await connection.query("ALTER TABLE users ADD COLUMN reset_token VARCHAR(255), ADD COLUMN reset_token_expiry DATETIME");
            }

            // Create notifications table if it doesn't exist
            await connection.query(`CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`);

            // --- Migration / Seeding ---
            const [usersCount] = await connection.query('SELECT COUNT(*) as count FROM users');
            if (usersCount[0].count === 0) {
                console.log('Seeding initial admin user...');
                const hashedPass = await require('bcryptjs').hash('admin123', 10);
                await connection.query(
                    'INSERT INTO users (name, email, password, isAdmin) VALUES (?, ?, ?, ?)',
                    ['Admin User', 'admin@shop.com', hashedPass, true]
                );
            }

            // Check and add shipping_phone column to orders if missing
            const [phoneOrderCols] = await connection.query("SHOW COLUMNS FROM orders LIKE 'shipping_phone'");
            if (phoneOrderCols.length === 0) {
                console.log('Adding shipping_phone column to orders table...');
                await connection.query("ALTER TABLE orders ADD COLUMN shipping_phone VARCHAR(20)");
            }

            // Check and add stock_quantity to products if missing
            const [stockCols] = await connection.query("SHOW COLUMNS FROM products LIKE 'stock_quantity'");
            if (stockCols.length === 0) {
                console.log('Adding stock_quantity column to products table...');
                await connection.query("ALTER TABLE products ADD COLUMN stock_quantity INT DEFAULT 10");
            }

        } catch (migrationErr) {
            console.error('Migration failed (non-critical):', migrationErr.message);
        }

        console.log('Database synchronization complete.');
    } catch (err) {
        console.error('Database connection Error:', err);
    }
};

const getDb = () => connection;

module.exports = { initDB, getDb };
