// config/db.js
import sql from 'mssql';
import 'dotenv/config';

export const poolPromise = sql.connect(process.env.DATABASE_URL)
  .then(pool => {
    console.log('✅ Connected to Azure SQL Database');
    return pool;
  })
  .catch(err => {
    console.error('❌ Azure DB Connection Failed:', err);
    throw err;
  });

export { sql };
