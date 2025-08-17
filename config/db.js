// config/db.js
import sql from 'mssql';
import 'dotenv/config';

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT || "1433"),
  options: {
    encrypt: false, // nếu dùng localhost
    trustServerCertificate: true
  }
};

export const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('✅ SQL Server connected...');
    return pool;
  })
  .catch(err => {
    console.error('❌ Database Connection Failed! Bad Config:', err);
  });

export { sql };
