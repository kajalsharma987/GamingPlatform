const { AppError } = require("../utils/errors");
const { canTransferTo, normalizeRole } = require("../utils/roles");
const userRepository = require("../repositories/userRepository");
const walletRepository = require("../repositories/walletRepository");
const withTransaction = require("../transactions/withTransaction");

async function transferCoins({ fromUserId, toUserId, amount, remark }) {

  const value = Number(amount);

  if (!toUserId || !value || value <= 0) {
    throw new AppError("Invalid transfer amount");
  }

  if (Number(fromUserId) === Number(toUserId)) {
    throw new AppError("Cannot transfer to same user");
  }

  return withTransaction(async (connection) => {

    const fromUser = await userRepository.findById(
      connection,
      fromUserId,
      true
    );

    const toUser = await userRepository.findById(
      connection,
      toUserId,
      true
    );

    if (!fromUser || !toUser) {
      throw new AppError("User not found", 404);
    }

    if (
      fromUser.status !== "active" ||
      toUser.status !== "active"
    ) {
      throw new AppError("User is blocked");
    }

    if (normalizeRole(toUser.role) === "SUPER_ADMIN") {
      throw new AppError(
        "Cannot transfer to SUPER_ADMIN",
        403
      );
    }

    if (
      normalizeRole(fromUser.role) ===
      normalizeRole(toUser.role)
    ) {
      throw new AppError(
        "Cannot transfer to same role",
        403
      );
    }

    if (Number(toUser.parent_id) !== Number(fromUser.id)) {
      throw new AppError(
        "Transfer allowed only to direct child user",
        403
      );
    }

    if (!canTransferTo(fromUser.role, toUser.role)) {
      throw new AppError(
        `${normalizeRole(fromUser.role)} cannot transfer coins to ${normalizeRole(toUser.role)}`,
        403
      );
    }

    if (Number(fromUser.wallet_balance) < value) {
      throw new AppError("Insufficient balance");
    }

    /*
    ==========================================
    LOCK USERS
    ==========================================
    */

    await connection.query(
      "SELECT id FROM users WHERE id=? FOR UPDATE",
      [fromUser.id]
    );

    await connection.query(
      "SELECT id FROM users WHERE id=? FOR UPDATE",
      [toUser.id]
    );

    /*
    ==========================================
    BALANCE CALCULATIONS
    ==========================================
    */

    const fromBefore = Number(fromUser.wallet_balance);
    const toBefore = Number(toUser.wallet_balance);

    const fromAfter = fromBefore - value;
    const toAfter = toBefore + value;

    /*
    ==========================================
    UPDATE WALLETS
    ==========================================
    */

    await connection.query(
      `
      UPDATE users
      SET wallet_balance=?
      WHERE id=?
      `,
      [fromAfter, fromUser.id]
    );

    await connection.query(
      `
      UPDATE users
      SET wallet_balance=?
      WHERE id=?
      `,
      [toAfter, toUser.id]
    );

    /*
    ==========================================
    SYNC AVAILABLE BALANCE
    ==========================================
    */

    await userRepository.syncBalances(
      connection,
      fromUser.id
    );

    await userRepository.syncBalances(
      connection,
      toUser.id
    );

    /*
    ==========================================
    REFERENCE ID
    ==========================================
    */

    const referenceId =
      `TRANSFER-${Date.now()}-${fromUser.id}-${toUser.id}`;

    /*
    ==========================================
    LEDGER ENTRY - SENDER
    ==========================================
    */

    await walletRepository.insertLedger(connection, {
      userId: fromUser.id,
      transactionType: "TRANSFER",
      amount: value,
      beforeBalance: fromBefore,
      afterBalance: fromAfter,
      remark:
        remark ||
        `Transfer to ${toUser.username}`,
      referenceId,
      fromUserId: fromUser.id,
      toUserId: toUser.id
    });

    /*
    ==========================================
    LEDGER ENTRY - RECEIVER
    ==========================================
    */

    await walletRepository.insertLedger(connection, {
      userId: toUser.id,
      transactionType: "DEPOSIT",
      amount: value,
      beforeBalance: toBefore,
      afterBalance: toAfter,
      remark:
        remark ||
        `Transfer from ${fromUser.username}`,
      referenceId,
      fromUserId: fromUser.id,
      toUserId: toUser.id
    });

    /*
    ==========================================
    TRANSACTION LOG
    ==========================================
    */

    await connection.query(
      `
      INSERT INTO transactions
      (
        from_id,
        to_id,
        amount,
        transaction_type,
        remark,
        created_by
      )
      VALUES
      (?, ?, ?, 'TRANSFER', ?, ?)
      `,
      [
        fromUser.id,
        toUser.id,
        value,
        remark || "Hierarchy coin transfer",
        fromUser.id
      ]
    );

    return {
      success: true,
      referenceId,
      fromBalance: fromAfter,
      toBalance: toAfter
    };

  });
}

async function withdrawFromChild({
  operatorId,
  childUserId,
  amount,
  remark
}) {

  const value = Number(amount);

  if (!childUserId || !value || value <= 0) {
    throw new AppError("Invalid withdraw amount");
  }

  return withTransaction(async (connection) => {

    const operator = await userRepository.findById(
      connection,
      operatorId,
      true
    );

    const child = await userRepository.findById(
      connection,
      childUserId,
      true
    );

    if (!operator || !child) {
      throw new AppError("User not found", 404);
    }

    if (Number(child.parent_id) !== Number(operator.id)) {
      throw new AppError(
        "Withdraw allowed only from direct child user",
        403
      );
    }

    if (!canTransferTo(operator.role, child.role)) {
      throw new AppError(
        "Invalid hierarchy for withdraw",
        403
      );
    }

    if (Number(child.wallet_balance) < value) {
      throw new AppError("Insufficient child balance");
    }

    /*
    ==========================================
    LOCK USERS
    ==========================================
    */

    await connection.query(
      "SELECT id FROM users WHERE id=? FOR UPDATE",
      [operator.id]
    );

    await connection.query(
      "SELECT id FROM users WHERE id=? FOR UPDATE",
      [child.id]
    );

    /*
    ==========================================
    BALANCE CALCULATIONS
    ==========================================
    */

    const operatorBefore =
      Number(operator.wallet_balance);

    const childBefore =
      Number(child.wallet_balance);

    const operatorAfter =
      operatorBefore + value;

    const childAfter =
      childBefore - value;

    /*
    ==========================================
    UPDATE BALANCES
    ==========================================
    */

    await connection.query(
      `
      UPDATE users
      SET wallet_balance=?
      WHERE id=?
      `,
      [operatorAfter, operator.id]
    );

    await connection.query(
      `
      UPDATE users
      SET wallet_balance=?
      WHERE id=?
      `,
      [childAfter, child.id]
    );

    /*
    ==========================================
    SYNC BALANCES
    ==========================================
    */

    await userRepository.syncBalances(
      connection,
      operator.id
    );

    await userRepository.syncBalances(
      connection,
      child.id
    );

    /*
    ==========================================
    REFERENCE ID
    ==========================================
    */

    const referenceId =
      `WITHDRAW-${Date.now()}-${child.id}-${operator.id}`;

    /*
    ==========================================
    LEDGER ENTRY - CHILD
    ==========================================
    */

    await walletRepository.insertLedger(connection, {
      userId: child.id,
      transactionType: "WITHDRAW",
      amount: value,
      beforeBalance: childBefore,
      afterBalance: childAfter,
      remark:
        remark ||
        `Withdraw by ${operator.username}`,
      referenceId,
      fromUserId: child.id,
      toUserId: operator.id
    });

    /*
    ==========================================
    LEDGER ENTRY - OPERATOR
    ==========================================
    */

    await walletRepository.insertLedger(connection, {
      userId: operator.id,
      transactionType: "TRANSFER",
      amount: value,
      beforeBalance: operatorBefore,
      afterBalance: operatorAfter,
      remark:
        remark ||
        `Withdraw from ${child.username}`,
      referenceId,
      fromUserId: child.id,
      toUserId: operator.id
    });

    /*
    ==========================================
    TRANSACTION LOG
    ==========================================
    */

    await connection.query(
      `
      INSERT INTO transactions
      (
        from_id,
        to_id,
        amount,
        transaction_type,
        remark,
        created_by
      )
      VALUES
      (?, ?, ?, 'WITHDRAW', ?, ?)
      `,
      [
        child.id,
        operator.id,
        value,
        remark || "Hierarchy wallet withdraw",
        operator.id
      ]
    );

    return {
      success: true,
      referenceId,
      fromBalance: childAfter,
      toBalance: operatorAfter
    };

  });
}

module.exports = {
  transferCoins,
  withdrawFromChild
};