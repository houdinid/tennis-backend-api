const { Client } = require('pg');
const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'tennis_pwa',
    password: '6uanberting0',
    port: 5432,
});

async function run() {
    try {
        await client.connect();
        console.log('--- Database Diagnostic ---');

        // Check tables
        const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));

        // Check Courts
        if (tables.rows.find(r => r.table_name === 'courts')) {
            const courts = await client.query('SELECT id, name FROM public.courts');
            console.log('Courts:', JSON.stringify(courts.rows));
        } else {
            console.log('ERROR: courts table not found');
        }

        // Check Reservations
        if (tables.rows.find(r => r.table_name === 'reservations')) {
            const resCount = await client.query('SELECT COUNT(*) FROM public.reservations');
            console.log('Total Reservations:', resCount.rows[0].count);

            const orphaned = await client.query('SELECT id, "court_id" FROM public.reservations WHERE "court_id" NOT IN (SELECT id FROM public.courts)');
            console.log('Orphaned Reservations (pointing to non-existent courts):', JSON.stringify(orphaned.rows));

            const c10 = await client.query('SELECT * FROM public.reservations WHERE "court_id" = 10');
            console.log('Reservations for Court 10:', JSON.stringify(c10.rows));
        } else {
            console.log('ERROR: reservations table not found');
        }

    } catch (err) {
        console.error('Diagnostic error:', err.message);
    } finally {
        await client.end();
    }
}

run();
