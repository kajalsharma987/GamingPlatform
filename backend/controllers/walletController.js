const walletService = require("../services/walletService");
const { asyncHandler } = require("../utils/errors");

exports.transfer = asyncHandler(async (req, res) => {
  const result = await walletService.transferCoins({
    fromUserId: req.user.id,
    toUserId: req.body.toUserId,
    amount: req.body.amount,
    remark: req.body.remark
  });

  res.json({ message: "Transfer successful", ...result });
});
