async function findById(connection, userId, lock = false) {
  const [rows] = await connection.query(
    `SELECT id, username, role, parent_id, status,
            wallet, wallet_balance, exposure_balance, available_balance, credit_limit
     FROM users
     WHERE id=? AND deleted_at IS NULL ${lock ? "FOR UPDATE" : ""}`,
    [userId]
  );
  return rows[0] || null;
}

async function syncBalances(connection, userId) {
  await connection.query(
    `UPDATE users
     SET available_balance = wallet_balance - exposure_balance + credit_limit,
         wallet = wallet_balance
     WHERE id=?`,
    [userId]
  );
  return findById(connection, userId, false);
}

module.exports = {
  findById,
  syncBalances
};
