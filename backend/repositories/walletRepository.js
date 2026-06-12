async function insertLedger(
  connection,
  { userId, transactionType, amount, beforeBalance, afterBalance, remark, referenceId, fromUserId, toUserId, status = "SUCCESS" }
) {
  const [result] = await connection.query(
    `INSERT INTO wallet_transactions
      (user_id, transaction_type, amount, before_balance, after_balance, remark, reference_id, from_user_id, to_user_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, transactionType, amount, beforeBalance, afterBalance, remark || null, referenceId || null, fromUserId || null, toUserId || null, status]
  );
  return result.insertId;
}

module.exports = {
  insertLedger
};
