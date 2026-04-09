const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function initDb() {
    const dataDir = process.env.DATA_DIR || __dirname;
    const db = await open({
        filename: path.join(dataDir, 'database.sqlite'),
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS vehicles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brand TEXT NOT NULL,
            model TEXT NOT NULL,
            year INTEGER,
            version TEXT,
            mileage INTEGER,
            fuel TEXT,
            transmission TEXT,
            color TEXT,
            license_plate TEXT,
            price REAL,
            description TEXT,
            status TEXT DEFAULT 'Disponible',
            is_offer INTEGER DEFAULT 0,
            offer_price REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_id INTEGER,
            filename TEXT NOT NULL,
            FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_id INTEGER UNIQUE,
            final_price REAL NOT NULL,
            buyer_name TEXT,
            buyer_province TEXT,
            buyer_locality TEXT,
            sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            payment_method TEXT,
            notes TEXT,
            FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            apellido TEXT NOT NULL,
            telefono TEXT NOT NULL,
            mensaje TEXT,
            vehiculo TEXT,
            estado TEXT DEFAULT 'Nuevo',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Migraciones rápidas para nuevas columnas
    try { await db.exec("ALTER TABLE sales ADD COLUMN buyer_province TEXT;"); } catch(e) {}
    try { await db.exec("ALTER TABLE sales ADD COLUMN buyer_locality TEXT;"); } catch(e) {}
    try { await db.exec("ALTER TABLE vehicles ADD COLUMN is_offer INTEGER DEFAULT 0;"); } catch(e) {}
    try { await db.exec("ALTER TABLE vehicles ADD COLUMN offer_price REAL;"); } catch(e) {}

    return db;
}

module.exports = { initDb };
