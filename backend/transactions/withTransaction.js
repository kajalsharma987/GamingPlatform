const { promisePool } = require("../config/database");

async function withTransaction(work) {
  const connection = await promisePool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = withTransaction;
