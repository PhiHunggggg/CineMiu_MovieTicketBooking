const sql = require('mssql/msnodesqlv8');
require('dotenv').config();

const dbConfig = {
    connectionString: `Driver={SQL Server};Server=${process.env.DB_SERVER};Database=${process.env.DB_DATABASE};Trusted_Connection=yes;`
};

let pool;
async function connectToDb() {
    if (!pool) {
        pool = new sql.ConnectionPool(dbConfig);
        await pool.connect();
        console.log('Đã kết nối Database thành công!');
    }
    return pool;
}

module.exports = { connectToDb, sql };