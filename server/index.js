const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const xlsx = require('xlsx');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
const dataDir = process.env.DATA_DIR || __dirname;
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));

// Servir la Landing Page como sitio público en la raíz
app.use(express.static(path.join(__dirname, '..', 'landin')));

// Servir la aplicación React (Panel de Control) en /admin
app.use('/admin', express.static(path.join(__dirname, '..', 'client', 'dist')));
app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

let db;

// Routes
app.get('/api/vehicles', async (req, res) => {
    try {
        const vehicles = await db.all(`
            SELECT v.*, (SELECT COUNT(*) FROM photos p WHERE p.vehicle_id = v.id) as photoCount
            FROM vehicles v
            ORDER BY v.created_at DESC
        `);
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/vehicles/:id', async (req, res) => {
    try {
        const vehicle = await db.get('SELECT * FROM vehicles WHERE id = ?', req.params.id);
        if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
        
        const photos = await db.all('SELECT * FROM photos WHERE vehicle_id = ?', req.params.id);
        res.json({ ...vehicle, photos });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/vehicles', async (req, res) => {
    const { brand, model, year, version, mileage, fuel, transmission, color, license_plate, price, description, status, is_offer, offer_price } = req.body;
    try {
        const result = await db.run(`
            INSERT INTO vehicles (brand, model, year, version, mileage, fuel, transmission, color, license_plate, price, description, status, is_offer, offer_price)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [brand, model, year, version, mileage, fuel, transmission, color, license_plate, price, description, status || 'Disponible', is_offer ? 1 : 0, offer_price]);
        
        res.status(201).json({ id: result.lastID });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/vehicles/:id', async (req, res) => {
    const { brand, model, year, version, mileage, fuel, transmission, color, license_plate, price, description, status, is_offer, offer_price } = req.body;
    try {
        await db.run(`
            UPDATE vehicles 
            SET brand=?, model=?, year=?, version=?, mileage=?, fuel=?, transmission=?, color=?, license_plate=?, price=?, description=?, status=?, is_offer=?, offer_price=?
            WHERE id=?
        `, [brand, model, year, version, mileage, fuel, transmission, color, license_plate, price, description, status, is_offer ? 1 : 0, offer_price, req.params.id]);
        
        res.json({ message: 'Vehicle updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/vehicles/:id', async (req, res) => {
    try {
        // Delete photos files first
        const photos = await db.all('SELECT filename FROM photos WHERE vehicle_id = ?', req.params.id);
        photos.forEach(p => {
            const filePath = path.join(uploadsDir, p.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });

        await db.run('DELETE FROM vehicles WHERE id = ?', req.params.id);
        res.json({ message: 'Vehicle and photos deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Photo upload
app.post('/api/vehicles/:id/photos', upload.array('photos'), async (req, res) => {
    try {
        const vehicleId = req.params.id;
        const insertPromises = req.files.map(file => {
            return db.run('INSERT INTO photos (vehicle_id, filename) VALUES (?, ?)', [vehicleId, file.filename]);
        });
        await Promise.all(insertPromises);
        res.json({ message: 'Photos uploaded' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/photos/:id', async (req, res) => {
    try {
        const photo = await db.get('SELECT filename FROM photos WHERE id = ?', req.params.id);
        if (photo) {
            const filePath = path.join(uploadsDir, photo.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            await db.run('DELETE FROM photos WHERE id = ?', req.params.id);
        }
        res.json({ message: 'Photo deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Excel Import
app.post('/api/import-excel', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

        // Vaciar tablas antes de importar con manejo de errores individual
        try { await db.run('DELETE FROM sales'); } catch (e) { console.log('Aviso: No se pudo vaciar ventas'); }
        try { await db.run('DELETE FROM photos'); } catch (e) { console.log('Aviso: No se pudo vaciar fotos'); }
        try { await db.run('DELETE FROM vehicles'); } catch (e) { console.log('Aviso: No se pudo vaciar vehiculos'); }

        if (data.length > 0) {
            console.log('Fila 1 (Cabeceras detectadas):', Object.keys(data[0]));
        }

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row || typeof row !== 'object') continue;

            try {
                const findValue = (obj, keywords) => {
                    const keys = Object.keys(obj);
                    const foundKey = keys.find(k => {
                        if (typeof k !== 'string') return false;
                        const nk = k.toLowerCase().replace(/\s+/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        return keywords.some(kw => {
                            const nkw = kw.toLowerCase().replace(/\s+/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                            return nk.includes(nkw);
                        });
                    });
                    return foundKey ? obj[foundKey] : undefined;
                };

                // Keywords extendidos
                let brand = String(findValue(row, ['marca']) || 'Sin nombre').trim();
                let model = String(findValue(row, ['modelo']) || 'Sin modelo').trim();
                let year = findValue(row, ['año', 'anio', 'year']); 
                let color = String(findValue(row, ['color']) || '').trim();
                let license_plate = String(findValue(row, ['patente', 'dominio']) || '').trim();
                let mileage = findValue(row, ['km', 'kilometraje', 'kilometros', 'kms', 'recorrido']);
                let price = findValue(row, ['precio', 'ars', 'valor', 'monto']);
                let fuel = String(findValue(row, ['combustible', 'nafta', 'diesel', 'gnc']) || '').trim();
                let status = String(findValue(row, ['estado', 'comercial']) || 'Disponible').trim();

                // Normalización de números avanzada (maneja puntos y comas de Argentina/Internacional)
                const toNumber = (v) => {
                    if (v === null || v === undefined || v === '') return null;
                    if (typeof v === 'number') return v;
                    
                    let s = String(v).trim();
                    if (!s) return null;

                    // Si tiene puntos y comas, el último suele ser el decimal
                    const lastDot = s.lastIndexOf('.');
                    const lastComma = s.lastIndexOf(',');

                    if (lastComma > lastDot) {
                        // Formato: 1.250,50 -> Mil es punto, decimal es coma
                        s = s.replace(/\./g, '').replace(',', '.');
                    } else if (lastDot > lastComma) {
                        // Formato: 1,250.50 -> Mil es coma, decimal es punto
                        s = s.replace(/,/g, '');
                    } else {
                        // Solo tiene comas o solo puntos (o nada)
                        s = s.replace(/,/g, '.');
                        const parts = s.split('.');
                        if (parts.length > 2) {
                            // Múltiples separadores: 1.250.000 -> Mil
                            s = parts.join('');
                        } else if (parts.length === 2) {
                            // Un solo separador: ¿Decimal o Mil? (1.200 vs 1.20)
                            // Si tiene 3 caracteres después, asumimos que es miles (ej: 1.250)
                            // Excepto si el número es muy pequeño, pero para autos los KM/Precios suelen ser miles
                            if (parts[1].length === 3) {
                                s = parts[0] + parts[1];
                            }
                        }
                    }

                    const n = parseFloat(s.replace(/[^0-9.-]/g, ''));
                    return isNaN(n) ? null : Math.round(n);
                };

                const nYear = toNumber(year);
                const nMileage = toNumber(mileage);
                const nPrice = toNumber(price);

                await db.run(`
                    INSERT INTO vehicles (brand, model, year, color, license_plate, mileage, price, fuel, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [brand, model, nYear, color, license_plate, nMileage, nPrice, fuel, status]);
            } catch (innerError) {
                console.error(`Error procesando fila ${i + 1}:`, innerError);
            }
        }

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.json({ message: 'Importación finalizada' });
    } catch (error) {
        console.error('CRITICAL IMPORT ERROR:', error);
        res.status(500).json({ error: error.message });
    }
});

// Sales Endpoints
app.post('/api/sales', async (req, res) => {
    const { vehicle_id, final_price, buyer_name, buyer_province, buyer_locality, sale_date, payment_method, notes } = req.body;
    try {
        await db.run('BEGIN TRANSACTION');
        
        // Record the sale
        await db.run(`
            INSERT INTO sales (vehicle_id, final_price, buyer_name, buyer_province, buyer_locality, sale_date, payment_method, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [vehicle_id, final_price, buyer_name, buyer_province, buyer_locality, sale_date, payment_method, notes]);

        // Update vehicle status
        await db.run('UPDATE vehicles SET status = ? WHERE id = ?', ['Vendido', vehicle_id]);

        await db.run('COMMIT');
        res.json({ message: 'Venta registrada con éxito' });
    } catch (error) {
        await db.run('ROLLBACK');
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/sales/stats', async (req, res) => {
    try {
        const sales = await db.all(`
            SELECT s.*, v.brand, v.model, v.year 
            FROM sales s
            JOIN vehicles v ON s.vehicle_id = v.id
            ORDER BY s.sale_date DESC
        `);
        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════
//  PUBLIC CATALOG API (para la Landing Page)
// ═══════════════════════════════════════════
app.get('/api/public/catalog', async (req, res) => {
    try {
        // Solo vehículos disponibles, priorizando los que tienen fotos
        const vehicles = await db.all(`
            SELECT v.id, v.brand, v.model, v.year, v.color, v.mileage, v.price, v.fuel, v.license_plate, v.status, v.is_offer, v.offer_price,
                   (SELECT COUNT(*) FROM photos p WHERE p.vehicle_id = v.id) as photoCount
            FROM vehicles v
            WHERE v.status IN ('Disponible', 'Muy Visto')
            ORDER BY 
                CASE WHEN v.status = 'Muy Visto' THEN 0 ELSE 1 END ASC,
                is_offer DESC,
                (SELECT COUNT(*) FROM photos p WHERE p.vehicle_id = v.id) DESC,
                v.created_at DESC
        `);

        // Agregar fotos a cada vehículo
        const vehiclesWithPhotos = await Promise.all(
            vehicles.map(async (v) => {
                const photos = await db.all(
                    'SELECT id, filename FROM photos WHERE vehicle_id = ? ORDER BY id ASC LIMIT 5',
                    v.id
                );
                return {
                    ...v,
                    photos: photos.map(p => ({
                        id: p.id,
                        url: `/uploads/${p.filename}`
                    }))
                };
            })
        );

        res.json(vehiclesWithPhotos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════
//  LEADS API
// ═══════════════════════════════════════════

// Crear una consulta (Público)
app.post('/api/public/leads', async (req, res) => {
    console.log('📩 Recibida nueva consulta en /api/public/leads:', req.body);
    try {
        const { nombre, apellido, telefono, mensaje, vehiculo } = req.body;
        if (!nombre || !apellido || !telefono) {
            return res.status(400).json({ error: 'Nombre, apellido y teléfono son obligatorios' });
        }
        await db.run(
            'INSERT INTO leads (nombre, apellido, telefono, mensaje, vehiculo) VALUES (?, ?, ?, ?, ?)',
            [nombre, apellido, telefono, mensaje, vehiculo]
        );
        res.json({ message: 'Consulta enviada con éxito' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Listar todas las consultas (Privado)
app.get('/api/leads', async (req, res) => {
    try {
        const leads = await db.all('SELECT * FROM leads ORDER BY created_at DESC');
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar estado de una consulta (Privado)
app.put('/api/leads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        await db.run('UPDATE leads SET estado = ? WHERE id = ?', [estado, id]);
        res.json({ message: 'Estado actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

initDb().then(database => {
    db = database;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
