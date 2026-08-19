const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const xlsx = require('xlsx');
const sharp = require('sharp');
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
app.get(/^\/admin/, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

// Storage configuration - Use memory storage to process images before saving
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

let db;

// Routes
app.get('/api/vehicles', async (req, res) => {
    try {
        const vehicles = await db.all(`
            SELECT v.*, (SELECT COUNT(*) FROM photos p WHERE p.vehicle_id = v.id) as photoCount
            FROM vehicles v
            LEFT JOIN sales s ON v.id = s.vehicle_id
            WHERE v.status != 'Vendido' 
               OR (v.status = 'Vendido' AND (s.sale_date >= date('now', '-1 month') OR s.sale_date IS NULL))
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
    const { brand, model, year, version, mileage, fuel, transmission, color, license_plate, price, description, status, is_offer, offer_price, is_hotsale } = req.body;
    
    // Ajustar kilometraje si viene expresado en miles (ej: 13 -> 13000)
    let finalMileage = mileage;
    if (mileage !== null && mileage !== undefined && mileage !== '') {
        const m = Number(mileage);
        if (!isNaN(m) && m > 0 && m <= 1000) {
            finalMileage = m * 1000;
        }
    }

    try {
        const result = await db.run(`
            INSERT INTO vehicles (brand, model, year, version, mileage, fuel, transmission, color, license_plate, price, description, status, is_offer, offer_price, is_hotsale)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [brand, model, year, version, finalMileage, fuel, transmission, color, license_plate, price, description, status || 'Disponible', is_offer ? 1 : 0, offer_price, is_hotsale ? 1 : 0]);
        
        res.status(201).json({ id: result.lastID });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/vehicles/:id', async (req, res) => {
    const { brand, model, year, version, mileage, fuel, transmission, color, license_plate, price, description, status, is_offer, offer_price, is_hotsale } = req.body;
    
    // Ajustar kilometraje si viene expresado en miles (ej: 13 -> 13000)
    let finalMileage = mileage;
    if (mileage !== null && mileage !== undefined && mileage !== '') {
        const m = Number(mileage);
        if (!isNaN(m) && m > 0 && m <= 1000) {
            finalMileage = m * 1000;
        }
    }

    try {
        await db.run(`
            UPDATE vehicles 
            SET brand=?, model=?, year=?, version=?, mileage=?, fuel=?, transmission=?, color=?, license_plate=?, price=?, description=?, status=?, is_offer=?, offer_price=?, is_hotsale=?
            WHERE id=?
        `, [brand, model, year, version, finalMileage, fuel, transmission, color, license_plate, price, description, status, is_offer ? 1 : 0, offer_price, is_hotsale ? 1 : 0, req.params.id]);
        
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

// Photo upload with Optimization
app.post('/api/vehicles/:id/photos', upload.array('photos'), async (req, res) => {
    try {
        const vehicleId = req.params.id;
        const uploadPromises = req.files.map(async (file) => {
            const filename = `optimized-${Date.now()}-${file.originalname.split('.')[0]}.jpg`;
            const outputPath = path.join(uploadsDir, filename);

            // Process image: Auto-rotate based on EXIF, Resize, convert to JPEG
            await sharp(file.buffer)
                .rotate() // <--- ESTO CORRIGE LA ROTACIÓN
                .resize(1200, 1200, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({ quality: 80 })
                .toFile(outputPath);

            return db.run('INSERT INTO photos (vehicle_id, filename) VALUES (?, ?)', [vehicleId, filename]);
        });

        await Promise.all(uploadPromises);
        res.json({ message: 'Photos uploaded and optimized' });
    } catch (error) {
        console.error('Error processing photos:', error);
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

        const workbook = xlsx.read(req.file.buffer);
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

                    // Detectar si el punto/coma es de miles o decimales
                    const lastDot = s.lastIndexOf('.');
                    const lastComma = s.lastIndexOf(',');

                    if (lastComma > lastDot) {
                        // Formato: 1.250,50 -> Mil es punto, decimal es coma
                        s = s.replace(/\./g, '').replace(',', '.');
                    } else if (lastDot > lastComma) {
                        // Formato: 1,250.50 -> Mil es coma, decimal es punto
                        // EXCEPCIÓN: Si solo hay un punto y tiene 3 decimales, en Argentina suele ser MILES (13.000)
                        const parts = s.split('.');
                        if (parts.length === 2 && parts[1].length === 3 && lastComma === -1) {
                            s = parts[0] + parts[1];
                        } else {
                            s = s.replace(/,/g, '');
                        }
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
                            if (parts[1].length === 3) {
                                s = parts[0] + parts[1];
                            }
                        }
                    }

                    const n = parseFloat(s.replace(/[^0-9.-]/g, ''));
                    return isNaN(n) ? null : Math.round(n);
                };

                const nYear = toNumber(year);
                let nMileage = toNumber(mileage);
                const nPrice = toNumber(price);

                // Ajustar kilometraje si viene expresado en miles (ej: 13 -> 13000)
                if (nMileage !== null && nMileage > 0 && nMileage <= 1000) {
                    nMileage = nMileage * 1000;
                }

                await db.run(`
                    INSERT INTO vehicles (brand, model, year, color, license_plate, mileage, price, fuel, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [brand, model, nYear, color, license_plate, nMileage, nPrice, fuel, status]);
            } catch (innerError) {
                console.error(`Error procesando fila ${i + 1}:`, innerError);
            }
        }

        // No need to unlink as we use memoryStorage for excel too

        res.json({ message: 'Importación finalizada' });
    } catch (error) {
        console.error('CRITICAL IMPORT ERROR:', error);
        res.status(500).json({ error: error.message });
    }
});

// Sales Endpoints
app.post('/api/sales', async (req, res) => {
    const { vehicle_id, final_price, seller_name, buyer_name, buyer_province, buyer_locality, sale_date, payment_method, notes } = req.body;
    const validSellers = ['Tomi', 'Ruben', 'Santi'];

    if (!validSellers.includes(seller_name)) {
        return res.status(400).json({ error: 'Seleccioná un vendedor válido: Tomi, Ruben o Santi' });
    }

    try {
        await db.run('BEGIN TRANSACTION');
        
        // Record the sale
        await db.run(`
            INSERT INTO sales (vehicle_id, final_price, seller_name, buyer_name, buyer_province, buyer_locality, sale_date, payment_method, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [vehicle_id, final_price, seller_name, buyer_name, buyer_province, buyer_locality, sale_date, payment_method, notes]);

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

// Financing Endpoints
app.get('/api/financing/vehicles', async (req, res) => {
    try {
        const vehicles = await db.all(`
            SELECT id, brand, model, year, license_plate, status, price
            FROM vehicles
            ORDER BY brand, model, year DESC
        `);
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/financing', async (req, res) => {
    try {
        const plans = await db.all(`
            SELECT fp.*, v.brand, v.model, v.year, v.license_plate
            FROM financing_plans fp
            LEFT JOIN vehicles v ON fp.vehicle_id = v.id
            ORDER BY CASE WHEN fp.status = 'Activo' THEN 0 ELSE 1 END, fp.created_at DESC
        `);
        const installments = await db.all(`
            SELECT * FROM financing_installments
            ORDER BY financing_id, installment_number
        `);
        const installmentsByPlan = installments.reduce((acc, installment) => {
            if (!acc[installment.financing_id]) acc[installment.financing_id] = [];
            acc[installment.financing_id].push(installment);
            return acc;
        }, {});

        res.json(plans.map(plan => ({
            ...plan,
            installments: installmentsByPlan[plan.id] || []
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/financing', async (req, res) => {
    const {
        vehicle_id, customer_name, customer_dni, customer_phone, customer_address,
        financed_amount, installment_count, installment_amount, first_due_month,
        payment_day_from, payment_day_to, notes
    } = req.body;
    const amount = Number(financed_amount);
    const count = Number(installment_count);
    const quotaAmount = Number(installment_amount);
    const dayFrom = Number(payment_day_from);
    const dayTo = Number(payment_day_to);

    if (!vehicle_id || !customer_name?.trim() || !customer_phone?.trim()) {
        return res.status(400).json({ error: 'Completá vehículo, nombre y teléfono del cliente' });
    }
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(count) || count < 1 || count > 120 || !Number.isFinite(quotaAmount) || quotaAmount <= 0) {
        return res.status(400).json({ error: 'Revisá el monto financiado, la cantidad y el importe de las cuotas' });
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(first_due_month || '')) {
        return res.status(400).json({ error: 'Seleccioná un mes válido para la primera cuota' });
    }

    if (!Number.isInteger(dayFrom) || !Number.isInteger(dayTo) || dayFrom < 1 || dayTo > 31 || dayFrom > dayTo) {
        return res.status(400).json({ error: 'Elegí un período de pago válido entre los días 1 y 31' });
    }

    let transactionStarted = false;
    try {
        const vehicle = await db.get('SELECT id FROM vehicles WHERE id = ?', vehicle_id);
        if (!vehicle) return res.status(404).json({ error: 'El vehículo seleccionado no existe' });

        const existingPlan = await db.get(
            "SELECT id FROM financing_plans WHERE vehicle_id = ? AND status = 'Activo'",
            vehicle_id
        );
        if (existingPlan) return res.status(409).json({ error: 'Este vehículo ya tiene una financiación activa' });

        await db.run('BEGIN TRANSACTION');
        transactionStarted = true;
        const result = await db.run(`
            INSERT INTO financing_plans (
                vehicle_id, customer_name, customer_dni, customer_phone, customer_address,
                financed_amount, installment_count, installment_amount, first_due_month,
                payment_day_from, payment_day_to, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            vehicle_id, customer_name.trim(), customer_dni?.trim() || '', customer_phone.trim(), customer_address?.trim() || null,
            amount, count, quotaAmount, first_due_month, dayFrom, dayTo, notes?.trim() || null
        ]);

        const [firstYear, firstMonth] = first_due_month.split('-').map(Number);
        for (let index = 0; index < count; index++) {
            const monthStart = new Date(Date.UTC(firstYear, firstMonth - 1 + index, 1));
            const lastDayOfMonth = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate();
            const dueDate = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), Math.min(dayTo, lastDayOfMonth)));
            const dueDateString = dueDate.toISOString().slice(0, 10);
            await db.run(`
                INSERT INTO financing_installments (financing_id, installment_number, due_date, amount)
                VALUES (?, ?, ?, ?)
            `, [result.lastID, index + 1, dueDateString, quotaAmount]);
        }

        await db.run('COMMIT');
        transactionStarted = false;
        res.status(201).json({ id: result.lastID, message: 'Financiación creada con éxito' });
    } catch (error) {
        if (transactionStarted) await db.run('ROLLBACK');
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/financing/:planId/installments/:installmentId/payment', async (req, res) => {
    const paidAt = req.body.paid_at || new Date().toISOString().slice(0, 10);
    const paymentNotes = req.body.payment_notes?.trim() || null;

    try {
        const installment = await db.get(`
            SELECT * FROM financing_installments
            WHERE id = ? AND financing_id = ?
        `, [req.params.installmentId, req.params.planId]);
        if (!installment) return res.status(404).json({ error: 'La cuota no existe' });
        if (installment.status === 'Pagada') return res.status(409).json({ error: 'La cuota ya está registrada como pagada' });

        const paidAmount = Number(req.body.paid_amount || installment.amount);
        if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
            return res.status(400).json({ error: 'Ingresá un importe pagado válido' });
        }

        await db.run('BEGIN TRANSACTION');
        await db.run(`
            UPDATE financing_installments
            SET status = 'Pagada', paid_at = ?, paid_amount = ?, payment_notes = ?
            WHERE id = ?
        `, [paidAt, paidAmount, paymentNotes, installment.id]);

        const pending = await db.get(`
            SELECT COUNT(*) AS count FROM financing_installments
            WHERE financing_id = ? AND status != 'Pagada'
        `, req.params.planId);
        if (pending.count === 0) {
            await db.run("UPDATE financing_plans SET status = 'Completado' WHERE id = ?", req.params.planId);
        }
        await db.run('COMMIT');
        res.json({ message: 'Pago registrado con éxito' });
    } catch (error) {
        try { await db.run('ROLLBACK'); } catch (_) {}
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/financing/:planId/installments/:installmentId/payment', async (req, res) => {
    try {
        const result = await db.run(`
            UPDATE financing_installments
            SET status = 'Pendiente', paid_at = NULL, paid_amount = NULL, payment_notes = NULL
            WHERE id = ? AND financing_id = ?
        `, [req.params.installmentId, req.params.planId]);
        if (!result.changes) return res.status(404).json({ error: 'La cuota no existe' });
        await db.run("UPDATE financing_plans SET status = 'Activo' WHERE id = ?", req.params.planId);
        res.json({ message: 'Pago anulado con éxito' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/financing/:id', async (req, res) => {
    let transactionStarted = false;
    try {
        await db.run('BEGIN TRANSACTION');
        transactionStarted = true;
        await db.run('DELETE FROM financing_installments WHERE financing_id = ?', req.params.id);
        const result = await db.run('DELETE FROM financing_plans WHERE id = ?', req.params.id);
        if (!result.changes) {
            await db.run('ROLLBACK');
            transactionStarted = false;
            return res.status(404).json({ error: 'La financiación no existe' });
        }
        await db.run('COMMIT');
        transactionStarted = false;
        res.json({ message: 'Financiación eliminada con éxito' });
    } catch (error) {
        if (transactionStarted) await db.run('ROLLBACK');
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
            SELECT v.id, v.brand, v.model, v.year, v.color, v.mileage, v.price, v.fuel, v.license_plate, v.status, v.is_offer, v.offer_price, v.is_hotsale,
                   (CASE WHEN v.status = 'Nuevo Ingreso' 
                         OR (v.created_at >= date('now', '-14 days') AND v.created_at > '2026-04-16 14:45:00') THEN 1 ELSE 0 END) as is_new_arrival,
                   (SELECT COUNT(*) FROM photos p WHERE p.vehicle_id = v.id) as photoCount
            FROM vehicles v
            LEFT JOIN sales s ON v.id = s.vehicle_id
            WHERE v.status IN ('Disponible', 'Muy Visto', 'Nuevo Ingreso', 'Reservado')
               OR (v.status = 'Vendido' AND (s.sale_date >= date('now', '-1 month') OR s.sale_date IS NULL))
            ORDER BY 
                CASE WHEN v.status = 'Vendido' THEN 4
                     WHEN v.status = 'Muy Visto' THEN 0 
                     WHEN v.status = 'Nuevo Ingreso' OR (v.created_at >= date('now', '-14 days') AND v.created_at > '2026-04-16 14:45:00') THEN 1
                     WHEN v.status = 'Reservado' THEN 3
                     ELSE 2 END ASC,
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

// ═══════════════════════════════════════════
//  MAINTENANCE API
// ═══════════════════════════════════════════
app.get('/api/maintenance/optimize-all', async (req, res) => {
    try {
        const photos = await db.all('SELECT * FROM photos');
        let count = 0;
        for (const photo of photos) {
            const filePath = path.join(uploadsDir, photo.filename);
            if (fs.existsSync(filePath) && !photo.filename.startsWith('optimized-')) {
                const newFilename = `optimized-${Date.now()}-${photo.filename.split('.')[0]}.jpg`;
                const outputPath = path.join(uploadsDir, newFilename);

                await sharp(filePath)
                    .rotate() // <--- TAMBIÉN AQUÍ PARA LAS VIEJAS
                    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 80 })
                    .toFile(outputPath);

                // Update database
                await db.run('UPDATE photos SET filename = ? WHERE id = ?', [newFilename, photo.id]);
                
                // Optionally delete old file
                // fs.unlinkSync(filePath);
                
                count++;
            }
        }
        res.json({ message: `Optimización completada. ${count} fotos procesadas.` });
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
