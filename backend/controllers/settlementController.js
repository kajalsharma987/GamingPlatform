const settlementService =
require("../services/settlementService");

async function settle(req, res) {

  try {

    const result =
      await settlementService.settleMarket(
        req.body
      );

    return res.json(result);

  } catch (err) {

    console.log(err);

    return res.status(500).json({
      success: false,
      message: err.message
    });

  }

}

module.exports = {
  settle
};