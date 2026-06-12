const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { loginLimiter, walletLimiter } = require("../middleware/rateLimiters");
const validate = require("../middleware/validate");
const { loginSchema, createUserSchema, changePasswordSchema } = require("../validators/authValidators");

const {
  register,
  login,
  createUser,
  updateWallet,
  transferMoney,
  createWalletRequest,
  getWalletRequests,
  handleWalletRequest,
  getUsers,
  deleteUser,
  updateUserStatus,
  resetPassword,
  changePassword,
  logout,
  getTransactions,
  getLoginHistory,
  getAdminAuditLogs,
  myLedger,
  allMasterLedger,
  masterLedger,
  totalProfit,
  dashboardStats
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/logout", auth, logout);
router.post("/create-user", auth, validate(createUserSchema), createUser);

router.get("/users", auth, getUsers);
router.delete("/users/:id", auth, deleteUser);
router.patch("/users/:id/status", auth, updateUserStatus);
router.post("/users/:id/reset-password", auth, resetPassword);
router.post("/change-password", auth, validate(changePasswordSchema), changePassword);
router.post("/wallet", auth, walletLimiter, updateWallet);
router.post("/wallet/transfer", auth, walletLimiter, transferMoney);
router.post("/wallet-requests", auth, createWalletRequest);
router.get("/wallet-requests", auth, getWalletRequests);
router.patch("/wallet-requests/:id", auth, handleWalletRequest);

router.get("/transactions", auth, getTransactions);
router.get("/history/wallet", auth, getTransactions);
router.get("/history/login", auth, getLoginHistory);
router.get("/history/admin-audit", auth, getAdminAuditLogs);
router.get("/ledger", auth, myLedger);
router.get("/ledger/masters", auth, allMasterLedger);
router.get("/ledger/master/:masterId", auth, masterLedger);
router.get("/ledger/profit", auth, totalProfit);
router.get("/dashboard/stats", auth, dashboardStats);

module.exports = router;
