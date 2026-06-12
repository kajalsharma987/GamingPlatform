const { AppError } = require("../utils/errors");
const { normalizeRole } = require("../utils/roles");

const userRepository =
require("../repositories/userRepository");

const walletRepository =
require("../repositories/walletRepository");

const withTransaction =
require("../transactions/withTransaction");

async function placeBet(user, payload) {

  if (
    normalizeRole(user.role) !==
    "CLIENT"
  ) {

    throw new AppError(
      "Only client can place bets",
      403
    );

  }

  const stake =
    Number(payload.amount);

  const odds =
    Number(payload.odds || 1);

  if (!stake || stake <= 0) {

    throw new AppError(
      "Invalid stake"
    );

  }

  return withTransaction(
    async (connection) => {

      const [settings] =
        await connection.query(
          `
          SELECT *
          FROM game_settings
          WHERE game_key=?
          `,
          [payload.game_key]
        );

      const setting =
        settings[0];

      if (!setting) {

        throw new AppError(
          "Game setting not found",
          404
        );

      }

      if (
        String(setting.status)
          .toUpperCase() !==
        "ACTIVE"
      ) {

        throw new AppError(
          "Game is closed"
        );

      }

      if (
        stake <
          Number(setting.min_bet) ||
        stake >
          Number(setting.max_bet)
      ) {

        throw new AppError(
          `Bet must be between ${setting.min_bet} and ${setting.max_bet}`
        );

      }

      if (payload.market_id) {

        const [markets] =
          await connection.query(
            `
            SELECT *
            FROM match_markets
            WHERE id=?
            FOR UPDATE
            `,
            [payload.market_id]
          );

        const market =
          markets[0];

        if (!market) {

          throw new AppError(
            "Market not found",
            404
          );

        }

        if (
          market.status !==
            "OPEN" ||
          Number(
            market.suspended
          )
        ) {

          throw new AppError(
            "Market is suspended"
          );

        }

      }

      if (payload.request_id) {

        const [existing] =
          await connection.query(
            `
            SELECT id
            FROM bets
            WHERE user_id=?
            AND request_id=?
            `,
            [
              user.id,
              payload.request_id
            ]
          );

        if (existing.length) {

          throw new AppError(
            "Duplicate bet request"
          );

        }

      }

      const walletUser =
        await userRepository.findById(
          connection,
          user.id,
          true
        );

      if (!walletUser) {

        throw new AppError(
          "User not found",
          404
        );

      }

      if (
        Number(
          walletUser
            .available_balance
        ) < stake ||

        Number(
          walletUser
            .wallet_balance
        ) < stake
      ) {

        throw new AppError(
          "Insufficient available balance"
        );

      }

      const beforeBalance =
        Number(
          walletUser
            .wallet_balance
        );

      const afterBalance =
        beforeBalance - stake;

      const exposureAfter =
        Number(
          walletUser
            .exposure_balance
        ) + stake;

      await connection.query(
        `
        UPDATE users
        SET
        wallet_balance=?,
        exposure_balance=?
        WHERE id=?
        `,
        [
          afterBalance,
          exposureAfter,
          user.id
        ]
      );

      await userRepository
        .syncBalances(
          connection,
          user.id
        );

      const profit =
        stake * odds;

      const loss = stake;

      const [betResult] =
        await connection.query(
          `
          INSERT INTO bets
          (
            user_id,
            game_key,
            live_game_id,
            match_id,
            market_id,
            runner_id,
            market,
            selection,
            bet_type,
            amount,
            stake,
            odds,
            profit,
            loss,
            request_id,
            status
          )
          VALUES
          (
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, 'open'
          )
          `,
          [
            user.id,

            payload.game_key,

            payload.live_game_id ||
              null,

            payload.match_id ||
              null,

            payload.market_id ||
              null,

            payload.runner_id ||
              null,

            payload.market ||
              null,

            payload.selection,

            payload.bet_type ||
              "BACK",

            stake,

            stake,

            odds,

            profit,

            loss,

            payload.request_id ||
              null
          ]
        );

      await walletRepository
        .insertLedger(
          connection,
          {
            userId: user.id,

            transactionType:
              "BET_PLACED",

            amount: stake,

            beforeBalance,

            afterBalance,

            remark:
              `${payload.game_key} bet placed`,

            referenceId:
              `BET-${betResult.insertId}`,

            fromUserId:
              user.id
          }
        );

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
        (
          ?, NULL, ?, 'BET', ?, ?
        )
        `,
        [
          user.id,
          stake,
          `${payload.game_key} bet`,
          user.id
        ]
      );

      return {

        betId:
          betResult.insertId,

        wallet_balance:
          afterBalance,

        exposure_balance:
          exposureAfter

      };

    }
  );

}

async function settleMarket({
  marketId,
  winningRunnerId,
  winningSelection,
  result,
  adminUser
}) {

  if (
    ![
      "SUPER_ADMIN",
      "MASTER"
    ].includes(
      normalizeRole(
        adminUser.role
      )
    )
  ) {

    throw new AppError(
      "Only admin can settle markets",
      403
    );

  }

  return withTransaction(
    async (connection) => {

      const [bets] =
        await connection.query(
          `
          SELECT *
          FROM bets
          WHERE market_id=?
          AND status='open'
          FOR UPDATE
          `,
          [marketId]
        );

      let settled = 0;

      for (const bet of bets) {

        const user =
          await userRepository
            .findById(
              connection,
              bet.user_id,
              true
            );

        if (!user) continue;

        const stake =
          Number(
            bet.stake ||
            bet.amount
          );

        const beforeBalance =
          Number(
            user.wallet_balance
          );

        let afterBalance =
          beforeBalance;

        let status = "lost";

        let creditAmount = 0;

        const isVoid =
          result === "VOID";

        const isWin =
          !isVoid &&
          (
            (
              winningRunnerId &&
              Number(
                bet.runner_id
              ) ===
              Number(
                winningRunnerId
              )
            ) ||

            (
              winningSelection &&
              bet.selection ===
                winningSelection
            )
          );

        if (isVoid) {

          creditAmount = stake;

          afterBalance += stake;

          status = "void";

        } else if (isWin) {

          creditAmount =
            Number(
              bet.profit ||
              (
                stake *
                Number(
                  bet.odds
                )
              )
            );

          afterBalance +=
            creditAmount;

          status = "won";

        }

        const exposureAfter =
          Math.max(
            0,
            Number(
              user
                .exposure_balance
            ) - stake
          );

        await connection.query(
          `
          UPDATE users
          SET
          wallet_balance=?,
          exposure_balance=?
          WHERE id=?
          `,
          [
            afterBalance,
            exposureAfter,
            bet.user_id
          ]
        );

        await userRepository
          .syncBalances(
            connection,
            bet.user_id
          );

        await connection.query(
          `
          UPDATE bets
          SET
          status=?,
          win_amount=?,
          settled_at=NOW()
          WHERE id=?
          `,
          [
            status,
            creditAmount,
            bet.id
          ]
        );

        await walletRepository
          .insertLedger(
            connection,
            {
              userId:
                bet.user_id,

              transactionType:
                isVoid
                  ? "REFUND"
                  : "BET_SETTLED",

              amount:
                creditAmount ||
                stake,

              beforeBalance,

              afterBalance,

              remark:
                `Market ${marketId} settled as ${result}`,

              referenceId:
                `BET-${bet.id}`
            }
          );

        settled += 1;

      }

      await connection.query(
        `
        UPDATE match_markets
        SET
        status='CLOSED',
        suspended=1
        WHERE id=?
        `,
        [marketId]
      );

      return {
        settled
      };

    }
  );

}

module.exports = {
  placeBet,
  settleMarket
};