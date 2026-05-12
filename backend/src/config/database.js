import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || process.env.INTERNAL_DATABASE_URL;
const host = process.env.DB_HOST || 'localhost';
const envPortRaw = process.env.DB_PORT;
const envPort =
  envPortRaw === undefined || envPortRaw === null || envPortRaw === ''
    ? null
    : Number(envPortRaw);

const selectedPort = envPort || 5432;

const shouldUseSsl =
  process.env.DB_SSL === 'true' ||
  (databaseUrl && !databaseUrl.includes('.internal') && !databaseUrl.includes('localhost'));

const poolConfig = databaseUrl
  ? {
      connectionString: databaseUrl,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
    }
  : {
      host,
      port: selectedPort,
      database: process.env.DB_NAME || 'dmat_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

console.log(
  'DB CONFIG USED:',
  databaseUrl
    ? {
        connectionString: 'DATABASE_URL provided',
        ssl: Boolean(poolConfig.ssl),
      }
    : { ...poolConfig, password: '***' },
);

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('Database connected successfully');
  console.log(
    databaseUrl
      ? 'Database connected via DATABASE_URL'
      : `Database host:port ${host}:${selectedPort}`,
  );
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);
});

export default pool;
