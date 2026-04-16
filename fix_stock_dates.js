const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function fixDates() {
    const dbPath = path.join(__dirname, 'server', 'database.sqlite');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    console.log('Actualizando fechas del stock actual...');
    // Ponemos la fecha de creación a hace 15 días para que no aparezcan como nuevos
    await db.exec("UPDATE vehicles SET created_at = datetime('now', '-15 days')");
    console.log('¡Listo! El stock actual ya no se marcará como nuevo automáticamente.');
    
    await db.close();
}

fixDates().catch(console.error);
