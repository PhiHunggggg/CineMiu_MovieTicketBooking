const {connectToDb, sql} = require('../config/db.config');

async function getAll(){
    const pool = await connectToDb();

    const result = await pool.request().query(`
        SELECT * FROM Promotions
        WHERE is_active = 1
        ORDER BY created_at DESC
    `);
    return result.recordset; // Trả danh sách dữ liệu lấy từ database
}

async function getByCode(promoCode){
    const pool = await connectToDb();

    const result = await pool.request()
        .input('promoCode',sqlNVarChar, promoCode.trim().toUpperCase())
        .query(`
            SELECT *
            FROM promotions
            WHERE UPPER(promo_code) = @promoCode
            `);

  return result.recordset[0] || null;
}

async function countUserUses(promoId, userId) {
  const pool = await connectToDb();

  const result = await pool.request()
    .input('promoId', sql.Int, promoId)
    .input('userId', sql.Int, userId)
    .query(`
      SELECT COUNT(*) AS total
      FROM promo_usages
      WHERE promo_id = @promoId
        AND user_id = @userId
    `);

  return result.recordset[0].total;
}

module.exports = {
  getAll,
  getByCode,
  countUserUses
};