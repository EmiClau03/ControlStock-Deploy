const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function initDb() {
    const dataDir = process.env.DATA_DIR || __dirname;
    const db = await open({
        filename: path.join(dataDir, 'database.sqlite'),
        driver: sqlite3.Database
    });

    await db.exec('PRAGMA foreign_keys = ON;');

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
            seller_name TEXT,
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

        CREATE TABLE IF NOT EXISTS financing_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_id INTEGER,
            customer_name TEXT NOT NULL,
            customer_dni TEXT,
            customer_phone TEXT NOT NULL,
            customer_address TEXT,
            financed_amount REAL NOT NULL,
            installment_count INTEGER NOT NULL,
            installment_amount REAL NOT NULL,
            first_due_month TEXT NOT NULL,
            payment_day_from INTEGER NOT NULL DEFAULT 1,
            payment_day_to INTEGER NOT NULL DEFAULT 10,
            notes TEXT,
            status TEXT DEFAULT 'Activo',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS financing_installments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            financing_id INTEGER NOT NULL,
            installment_number INTEGER NOT NULL,
            due_date TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT DEFAULT 'Pendiente',
            paid_at TEXT,
            paid_amount REAL,
            payment_notes TEXT,
            FOREIGN KEY (financing_id) REFERENCES financing_plans(id) ON DELETE CASCADE,
            UNIQUE(financing_id, installment_number)
        );

        CREATE INDEX IF NOT EXISTS idx_financing_installments_plan
            ON financing_installments(financing_id);
        CREATE INDEX IF NOT EXISTS idx_financing_installments_due_date
            ON financing_installments(due_date, status);
    `);

    // Migraciones rápidas para nuevas columnas
    try { await db.exec("ALTER TABLE sales ADD COLUMN buyer_province TEXT;"); } catch(e) {}
    try { await db.exec("ALTER TABLE sales ADD COLUMN buyer_locality TEXT;"); } catch(e) {}
    try { await db.exec("ALTER TABLE sales ADD COLUMN seller_name TEXT;"); } catch(e) {}
    try { await db.exec("ALTER TABLE vehicles ADD COLUMN is_offer INTEGER DEFAULT 0;"); } catch(e) {}
    try { await db.exec("ALTER TABLE vehicles ADD COLUMN offer_price REAL;"); } catch(e) {}
    try { await db.exec("ALTER TABLE vehicles ADD COLUMN is_hotsale INTEGER DEFAULT 0;"); } catch(e) {}
    try { await db.exec("ALTER TABLE financing_plans ADD COLUMN payment_day_from INTEGER NOT NULL DEFAULT 1;"); } catch(e) {}
    try { await db.exec("ALTER TABLE financing_plans ADD COLUMN payment_day_to INTEGER NOT NULL DEFAULT 10;"); } catch(e) {}

    return db;
}

module.exports = { initDb };
