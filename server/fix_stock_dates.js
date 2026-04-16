const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function fixDates() {
    // Si el script está en server/, la base de datos está en el mismo directorio
    const dbPath = path.join(__dirname, 'database.sqlite');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    console.log('Actualizando fechas del stock actual...');
    await db.exec("UPDATE vehicles SET created_at = datetime('now', '-30 days')");
    console.log('¡Listo! El stock actual ya no se marcará como nuevo automáticamente.');
    
    await db.close();
}

fixDates().catch(console.error);
