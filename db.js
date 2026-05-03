const sql = require('mssql');
require('dotenv').config();

let pool = null;

function buildConfig() {
    const useTrusted = process.env.DB_TRUSTED === 'true';

    const base = {
        server: process.env.DB_SERVER || 'localhost\\SQLEXPRESS',
        database: process.env.DB_DATABASE || 'pr_Maksimenkov_skins',
        options: {
            trustServerCertificate: true,
            enableArithAbort: true,
            encrypt: false,
        },
        connectionTimeout: 30000,
        requestTimeout: 30000,
    };

    if (!base.server.includes('\\')) {
        base.port = parseInt(process.env.DB_PORT) || 1433;
    }

    if (useTrusted) {
        return {
            ...base,
            driver: 'msnodesqlv8',
            options: {
                ...base.options,
                trustedConnection: true,
            },
        };
    } else {
        return {
            ...base,
            user: process.env.DB_USER || 'sa',
            password: process.env.DB_PASSWORD || '',
        };
    }
}

async function getPool() {
    if (!pool) {
        const config = buildConfig();
        try {
            pool = await sql.connect(config);
            console.log('✅ Подключено к SQL Server:', process.env.DB_DATABASE);
        } catch (err) {
            pool = null;
            console.error('❌ Ошибка подключения:', err.message);
            throw err;
        }
    }
    return pool;
}

async function query(queryString, params = {}) {
    const p = await getPool();
    const request = p.request();
    for (const [key, { type, value }] of Object.entries(params)) {
        request.input(key, type, value);
    }
    return request.query(queryString);
}

module.exports = { sql, query, getPool };
const config = {
    server: process.env.DB_SERVER,
    port: 1433,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        trustServerCertificate: true,
        encrypt: false,
        enableArithAbort: true,
    },
    connectionTimeout: 30000,
    requestTimeout: 30000,
};