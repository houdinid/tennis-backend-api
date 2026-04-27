const { Client } = require('./node_modules/pg');
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
        const res = await client.query('SELECT id, email, name, role FROM public."user"');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
