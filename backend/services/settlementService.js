const { promisePool } = require("../config/database");

async function settleMarket({
  marketId,
  winnerRunnerId
}) {

  const connection = await promisePool.getConnection();

  try {

    await connection.beginTransaction();

    const [bets] = await connection.query(
      `
      SELECT *
      FROM bets
      WHERE market_id=?
      AND status='open'
      `,
      [marketId]
    );

    for (const bet of bets) {

      const isWinner =
        Number(bet.runner_id) ===
        Number(winnerRunnerId);

      const [users] = await connection.query(
        `
        SELECT *
        FROM users
        WHERE id=?
        FOR UPDATE
        `,
        [bet.user_id]
      );

      const user = users[0];

      if (!user) continue;

      let walletBalance =
        Number(user.wallet_balance);

      let exposureBalance =
        Number(user.exposure_balance);

      let availableBalance =
        Number(user.available_balance);

      if (isWinner) {

        const profit =
          Number(bet.amount) *
          Number(bet.odds);

        walletBalance += profit;

        exposureBalance -= Number(bet.amount);

        availableBalance =
          walletBalance - exposureBalance;

        await connection.query(
          `
          UPDATE bets
          SET
          status='won',
          win_amount=?,
          settled_at=NOW()
          WHERE id=?
          `,
          [profit, bet.id]
        );

      } else {

        exposureBalance -= Number(bet.amount);

        availableBalance =
          walletBalance - exposureBalance;

        await connection.query(
          `
          UPDATE bets
          SET
          status='lost',
          settled_at=NOW()
          WHERE id=?
          `,
          [bet.id]
        );

      }

      await connection.query(
        `
        UPDATE users
        SET
        wallet_balance=?,
        exposure_balance=?,
        available_balance=?
        WHERE id=?
        `,
        [
          walletBalance,
          exposureBalance,
          availableBalance,
          user.id
        ]
      );

      await connection.query(
        `
        INSERT INTO wallet_transactions
        (
          user_id,
          transaction_type,
          amount,
          before_balance,
          after_balance,
          remark,
          status
        )
        VALUES
        (?, 'BET_SETTLED', ?, ?, ?, ?, 'SUCCESS')
        `,
        [
          user.id,
          Number(bet.amount),
          Number(user.wallet_balance),
          walletBalance,
          `Bet settlement market ${marketId}`
        ]
      );

    }

    await connection.query(
      `
      UPDATE match_markets
      SET status='CLOSED'
      WHERE id=?
      `,
      [marketId]
    );

    await connection.commit();

    return {
      success: true
    };

  } catch (err) {

    await connection.rollback();

    throw err;

  } finally {

    connection.release();

  }

}

module.exports = {
  settleMarket
};