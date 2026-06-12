const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { promisePool } = require("../config/database");
const walletService = require("../services/walletService");
const { emitEvent } = require("../sockets");
const auditRepository = require("../repositories/auditRepository");
const { normalizeRole, toApiRole, canCreateRole } = require("../utils/roles");
const { asyncHandler, AppError } = require("../utils/errors");

const jwtSecret = process.env.JWT_SECRET || "dev_secret_change_me";

function scopedUserCondition(user, alias = "u") {
  const role = normalizeRole(user.role);
  if (role === "SUPER_ADMIN") return { sql: "1=1", params: [] };
  if (role === "MASTER") {
    return {
      sql: `(${alias}.id=? OR ${alias}.parent_id=? OR ${alias}.parent_id IN (SELECT id FROM users WHERE parent_id=?))`,
      params: [user.id, user.id, user.id]
    };
  }
  if (role === "DEALER") return { sql: `(${alias}.id=? OR ${alias}.parent_id=?)`, params: [user.id, user.id] };
  return { sql: `${alias}.id=?`, params: [user.id] };
}

function canOperateOnUser(operator, target) {
  if (!target) return false;
  const operatorRole = normalizeRole(operator.role);
  const targetRole = normalizeRole(target.role);
  if (operatorRole === "SUPER_ADMIN") return targetRole !== "SUPER_ADMIN";
  if (operatorRole === "MASTER") return target.id === operator.id || target.parent_id === operator.id || target.grand_parent_id === operator.id;
  if (operatorRole === "DEALER") return target.parent_id === operator.id && targetRole === "CLIENT";
  return target.id === operator.id;
}

function formatUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: toApiRole(user.role),
    email: user.email,
    phone: user.phone,
    wallet: user.wallet_balance ?? user.wallet,
    wallet_balance: user.wallet_balance,
    exposure_balance: user.exposure_balance,
    available_balance: user.available_balance,
    credit_limit: user.credit_limit,
    commission: user.commission,
    parent_id: user.parent_id,
    status: user.status
  };
}

exports.register = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) throw new AppError("All fields required");

  const [existing] = await promisePool.query("SELECT id FROM users WHERE role='SUPER_ADMIN' LIMIT 1");
  if (existing.length) throw new AppError("SUPER_ADMIN already exists", 409);

  const hash = await bcrypt.hash(password, 10);
  const [result] = await promisePool.query(
    `INSERT INTO users
      (username, email, phone, password, role, wallet, wallet_balance, exposure_balance, available_balance, credit_limit)
     VALUES (?, ?, ?, ?, 'SUPER_ADMIN', 999999999, 999999999, 0, 999999999, 0)`,
    [username, req.body.email || null, req.body.phone || null, hash]
  );
  await auditRepository.logAdminAction(promisePool, {
    adminId: result.insertId,
    targetUserId: result.insertId,
    action: "SUPER_ADMIN_CREATED",
    entityType: "users",
    entityId: result.insertId,
    ip: req.ip,
    browser: req.headers["user-agent"]
  });
  res.json({ message: "SUPER_ADMIN created" });
});

exports.login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await promisePool.query("SELECT * FROM users WHERE username=? AND deleted_at IS NULL", [username]);
  const user = rows[0];
  if (!user) throw new AppError("User not found", 400);
  if (user.status !== "active") throw new AppError("User is blocked", 403);

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new AppError("Wrong password", 400);

  const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: "1d" });
  const [history] = await promisePool.query(
    "INSERT INTO login_history (user_id, ip, browser) VALUES (?, ?, ?)",
    [user.id, req.ip, req.headers["user-agent"] || null]
  );

  res.json({ token, login_history_id: history.insertId, user: formatUser(user) });
});

exports.logout = asyncHandler(async (req, res) => {
  if (req.body.login_history_id) {
    await promisePool.query("UPDATE login_history SET logout_time=NOW() WHERE id=? AND user_id=?", [
      req.body.login_history_id,
      req.user.id
    ]);
  }
  res.json({ message: "Logged out" });
});

exports.createUser = asyncHandler(async (req, res) => {
  const { username, password, role, commission = 0, email = null, phone = null } = req.body;
  if (!username || !password || !role) throw new AppError("All fields required");

  const targetRole = normalizeRole(role);
  if (targetRole === "SUPER_ADMIN") throw new AppError("SUPER_ADMIN already exists", 409);
  if (!canCreateRole(req.user.role, targetRole)) {
    throw new AppError(`${req.user.role} cannot create ${targetRole}`, 403);
  }

  const hash = await bcrypt.hash(password, 10);
  const [result] = await promisePool.query(
    `INSERT INTO users
      (username, email, phone, password, role, wallet, wallet_balance, exposure_balance, available_balance, credit_limit, parent_id, commission)
     VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?, ?)`,
    [username, email, phone, hash, targetRole, req.user.id, Number(commission || 0)]
  );
  await auditRepository.logAdminAction(promisePool, {
    adminId: req.user.id,
    targetUserId: result.insertId,
    action: "USER_CREATED",
    entityType: "users",
    entityId: result.insertId,
    newValue: { username, email, phone, role: targetRole },
    ip: req.ip,
    browser: req.headers["user-agent"]
  });
  res.json({ message: `${toApiRole(targetRole)} created successfully` });
});

exports.getUsers = asyncHandler(async (req, res) => {
  const scoped = scopedUserCondition(req.user);
  const [rows] = await promisePool.query(
    `SELECT u.id, u.username, u.email, u.phone, u.role, u.wallet, u.wallet_balance, u.exposure_balance, u.available_balance,
            u.credit_limit, u.commission, u.parent_id, u.status, u.created_at, p.username AS parent_name
     FROM users u
     LEFT JOIN users p ON p.id = u.parent_id
     WHERE ${scoped.sql} AND u.deleted_at IS NULL
     ORDER BY u.id DESC`,
    scoped.params
  );
  res.json(rows.map((row) => ({ ...row, role: toApiRole(row.role), wallet: row.wallet_balance ?? row.wallet })));
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);
  if (!targetId || targetId === Number(req.user.id)) throw new AppError("Invalid user");

  const [rows] = await promisePool.query(
    `SELECT u.id, u.role, u.parent_id, p.parent_id AS grand_parent_id
     FROM users u LEFT JOIN users p ON p.id = u.parent_id WHERE u.id=? AND u.deleted_at IS NULL`,
    [targetId]
  );
  const target = rows[0];
  if (!canOperateOnUser(req.user, target)) throw new AppError("User out of your panel scope", 403);
  if (normalizeRole(target.role) === "SUPER_ADMIN") throw new AppError("Super admin cannot be deleted", 403);

  await promisePool.query("UPDATE users SET deleted_at=NOW(), status='inactive' WHERE id=?", [targetId]);
  await auditRepository.logAdminAction(promisePool, {
    adminId: req.user.id,
    targetUserId: targetId,
    action: "USER_SOFT_DELETED",
    entityType: "users",
    entityId: targetId,
    oldValue: target,
    ip: req.ip,
    browser: req.headers["user-agent"]
  });
  res.json({ message: "User deleted successfully" });
});

exports.updateUserStatus = asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);
  const status = req.body.status === "inactive" ? "inactive" : "active";
  const [rows] = await promisePool.query(
    `SELECT u.id, u.role, u.parent_id, p.parent_id AS grand_parent_id
     FROM users u LEFT JOIN users p ON p.id = u.parent_id WHERE u.id=? AND u.deleted_at IS NULL`,
    [targetId]
  );
  const target = rows[0];
  if (!canOperateOnUser(req.user, target)) throw new AppError("User out of your panel scope", 403);
  if (normalizeRole(target.role) === "SUPER_ADMIN") throw new AppError("Super admin cannot be blocked", 403);
  await promisePool.query("UPDATE users SET status=? WHERE id=?", [status, targetId]);
  await auditRepository.logAdminAction(promisePool, {
    adminId: req.user.id,
    targetUserId: targetId,
    action: status === "active" ? "USER_UNBLOCKED" : "USER_BLOCKED",
    entityType: "users",
    entityId: targetId,
    newValue: { status },
    ip: req.ip,
    browser: req.headers["user-agent"]
  });
  res.json({ message: `User ${status === "active" ? "unblocked" : "blocked"}` });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);
  const [rows] = await promisePool.query(
    `SELECT u.id, u.role, u.parent_id, p.parent_id AS grand_parent_id
     FROM users u LEFT JOIN users p ON p.id = u.parent_id WHERE u.id=? AND u.deleted_at IS NULL`,
    [targetId]
  );
  const target = rows[0];
  if (!canOperateOnUser(req.user, target)) throw new AppError("User out of your panel scope", 403);
  if (normalizeRole(target.role) === "SUPER_ADMIN") throw new AppError("SUPER_ADMIN password cannot be reset here", 403);

  const temporaryPassword = req.body.password || crypto.randomBytes(6).toString("base64url");
  const hash = await bcrypt.hash(temporaryPassword, 10);
  await promisePool.query("UPDATE users SET password=? WHERE id=?", [hash, targetId]);
  await auditRepository.logAdminAction(promisePool, {
    adminId: req.user.id,
    targetUserId: targetId,
    action: "PASSWORD_RESET",
    entityType: "users",
    entityId: targetId,
    ip: req.ip,
    browser: req.headers["user-agent"]
  });
  res.json({ message: "Password reset", temporaryPassword });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) throw new AppError("Old and new password required");
  const [rows] = await promisePool.query("SELECT password FROM users WHERE id=? AND deleted_at IS NULL", [req.user.id]);
  const match = await bcrypt.compare(oldPassword, rows[0]?.password || "");
  if (!match) throw new AppError("Old password is wrong", 400);
  const hash = await bcrypt.hash(newPassword, 10);
  await promisePool.query("UPDATE users SET password=? WHERE id=?", [hash, req.user.id]);
  res.json({ message: "Password changed" });
});

exports.updateWallet = (req, res) => {
  const value = Number(req.body.amount);
  if (!req.body.userId || !value || value <= 0) return res.status(400).json({ message: "Invalid wallet amount" });
  if (normalizeRole(req.user.role) === "CLIENT") return res.status(403).json({ message: "Client cannot deposit/withdraw" });

  const action = req.body.type === "withdraw"
    ? walletService.withdrawFromChild({ operatorId: req.user.id, childUserId: req.body.userId, amount: value, remark: req.body.remark })
    : walletService.transferCoins({ fromUserId: req.user.id, toUserId: req.body.userId, amount: value, remark: req.body.remark });

  action
    .then((result) => {
      emitEvent("wallet:update", result);
      res.json({ message: `Wallet ${req.body.type === "withdraw" ? "withdraw" : "deposit"} successful`, ...result });
    })
    .catch((err) => res.status(err.statusCode || 500).json({ message: err.message || "Wallet update failed" }));
};

exports.transferMoney = (req, res) => {
  walletService.transferCoins({
    fromUserId: req.user.id,
    toUserId: req.body.toUserId,
    amount: req.body.amount,
    remark: req.body.remark
  })
    .then((result) => {
      emitEvent("wallet:update", result);
      res.json({ message: "Transfer successful", ...result });
    })
    .catch((err) => res.status(err.statusCode || 500).json({ message: err.message || "Transfer failed" }));
};

exports.createWalletRequest = asyncHandler(async (req, res) => {
  if (normalizeRole(req.user.role) !== "CLIENT") throw new AppError("Only clients can send coin requests", 403);
  const value = Number(req.body.amount);
  const type = req.body.type === "withdraw" ? "withdraw" : "deposit";
  if (!value || value <= 0) throw new AppError("Invalid coin amount");

  const [rows] = await promisePool.query("SELECT wallet_balance FROM users WHERE id=? AND deleted_at IS NULL", [req.user.id]);
  if (type === "withdraw" && Number(rows[0]?.wallet_balance || 0) < value) throw new AppError("Insufficient balance");
  await promisePool.query("INSERT INTO wallet_requests (user_id, amount, type, status) VALUES (?, ?, ?, 'pending')", [
    req.user.id,
    value,
    type
  ]);
  res.json({ message: `${type === "withdraw" ? "Withdraw" : "Deposit"} request sent` });
});

exports.getWalletRequests = asyncHandler(async (req, res) => {
  const scoped = scopedUserCondition(req.user, "u");
  const [rows] = await promisePool.query(
    `SELECT wr.id, wr.amount, wr.type, wr.status, wr.remark, wr.created_at, wr.handled_at,
            u.username, u.wallet_balance AS wallet, u.role, u.parent_id, p.username AS parent_name, h.username AS handled_by_name
     FROM wallet_requests wr
     JOIN users u ON u.id = wr.user_id
     LEFT JOIN users p ON p.id = u.parent_id
     LEFT JOIN users h ON h.id = wr.handled_by
     WHERE ${scoped.sql} AND u.deleted_at IS NULL
     ORDER BY FIELD(wr.status, 'pending', 'approved', 'rejected'), wr.id DESC`,
    scoped.params
  );
  res.json(rows);
});

exports.handleWalletRequest = asyncHandler(async (req, res) => {
  const requestId = Number(req.params.id);
  const action = req.body.action === "reject" ? "reject" : "approve";
  if (normalizeRole(req.user.role) === "CLIENT") throw new AppError("Client cannot approve requests", 403);

  const [rows] = await promisePool.query(
    `SELECT wr.*, u.role, u.parent_id, p.parent_id AS grand_parent_id
     FROM wallet_requests wr
     JOIN users u ON u.id = wr.user_id
     LEFT JOIN users p ON p.id = u.parent_id
     WHERE wr.id=?`,
    [requestId]
  );
  const request = rows[0];
  if (!request) throw new AppError("Request not found", 404);
  if (request.status !== "pending") throw new AppError("Request already handled");
  if (!canOperateOnUser(req.user, request)) throw new AppError("Request out of your panel scope", 403);

  if (action === "reject") {
    await promisePool.query("UPDATE wallet_requests SET status='rejected', handled_by=?, handled_at=NOW(), remark=? WHERE id=?", [
      req.user.id,
      req.body.remark || "Rejected",
      requestId
    ]);
    return res.json({ message: "Request rejected" });
  }

  if (request.type === "withdraw") {
    await walletService.withdrawFromChild({ operatorId: req.user.id, childUserId: request.user_id, amount: request.amount, remark: "Wallet request approved" });
  } else {
    await walletService.transferCoins({ fromUserId: req.user.id, toUserId: request.user_id, amount: request.amount, remark: "Wallet request approved" });
  }
  await promisePool.query("UPDATE wallet_requests SET status='approved', handled_by=?, handled_at=NOW(), remark=? WHERE id=?", [
    req.user.id,
    req.body.remark || "Approved",
    requestId
  ]);
  res.json({ message: "Request approved and wallet updated" });
});

exports.getTransactions = asyncHandler(async (req, res) => {
  const scoped = scopedUserCondition(req.user, "u");
  const [rows] = await promisePool.query(
    `SELECT wt.*, sender.username AS sender, receiver.username AS receiver, u.username AS username
     FROM wallet_transactions wt
     JOIN users u ON u.id = wt.user_id
     LEFT JOIN users sender ON sender.id = wt.from_user_id
     LEFT JOIN users receiver ON receiver.id = wt.to_user_id
     WHERE ${scoped.sql} AND u.deleted_at IS NULL
     ORDER BY wt.created_at DESC`,
    scoped.params
  );
  res.json(rows);
});

exports.getLoginHistory = asyncHandler(async (req, res) => {
  const scoped = scopedUserCondition(req.user, "u");
  const [rows] = await promisePool.query(
    `SELECT lh.*, u.username, u.role
     FROM login_history lh
     JOIN users u ON u.id = lh.user_id
     WHERE ${scoped.sql}
     ORDER BY lh.login_time DESC`,
    scoped.params
  );
  res.json(rows);
});

exports.getAdminAuditLogs = asyncHandler(async (req, res) => {
  if (normalizeRole(req.user.role) !== "SUPER_ADMIN") throw new AppError("Only SUPER_ADMIN can view audit logs", 403);
  const [rows] = await promisePool.query(
    `SELECT aal.*, admin.username AS admin_name, target.username AS target_username
     FROM admin_audit_logs aal
     LEFT JOIN users admin ON admin.id = aal.admin_id
     LEFT JOIN users target ON target.id = aal.target_user_id
     ORDER BY aal.created_at DESC
     LIMIT 500`
  );
  res.json(rows);
});

exports.dashboardStats = asyncHandler(async (req, res) => {
  const [counts] = await promisePool.query(
    `SELECT
      SUM(role='MASTER') AS total_masters,
      SUM(role='DEALER') AS total_dealers,
      SUM(role='CLIENT') AS total_clients,
      SUM(wallet_balance) AS total_platform_balance,
      SUM(exposure_balance) AS total_exposure
     FROM users
     WHERE deleted_at IS NULL`
  );
  const [bets] = await promisePool.query("SELECT COUNT(*) AS live_bets FROM bets WHERE status='open'");
  const [transfers] = await promisePool.query(
    `SELECT wt.*, s.username AS sender, r.username AS receiver
     FROM wallet_transactions wt
     LEFT JOIN users s ON s.id=wt.from_user_id
     LEFT JOIN users r ON r.id=wt.to_user_id
     WHERE wt.transaction_type IN ('TRANSFER','DEPOSIT','WITHDRAW')
     ORDER BY wt.created_at DESC LIMIT 8`
  );
  res.json({ ...counts[0], live_bets: bets[0].live_bets, recent_transfers: transfers });
});

exports.myLedger = exports.getTransactions;
exports.allMasterLedger = exports.getTransactions;
exports.masterLedger = exports.getTransactions;

exports.totalProfit = asyncHandler(async (req, res) => {
  const [rows] = await promisePool.query(
    `SELECT
      SUM(CASE WHEN transaction_type IN ('DEPOSIT','BET_SETTLED','REFUND') THEN amount ELSE 0 END) AS total_credit,
      SUM(CASE WHEN transaction_type IN ('WITHDRAW','BET_PLACED','TRANSFER') THEN amount ELSE 0 END) AS total_debit
     FROM wallet_transactions`
  );
  const credit = Number(rows[0].total_credit || 0);
  const debit = Number(rows[0].total_debit || 0);
  res.json({ credit, debit, profit: credit - debit });
});
