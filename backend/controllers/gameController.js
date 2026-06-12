const { promisePool } = require("../config/database");
const betService = require("../services/betService");
const { asyncHandler, AppError } = require("../utils/errors");
const { normalizeRole } = require("../utils/roles");
const { emitEvent } = require("../sockets");

function scopedUserCondition(user) {
  const role = normalizeRole(user.role);
  if (role === "SUPER_ADMIN") return { sql: "1=1", params: [] };
  if (role === "MASTER") {
    return {
      sql: "(u.id=? OR u.parent_id=? OR u.parent_id IN (SELECT id FROM users WHERE parent_id=?))",
      params: [user.id, user.id, user.id]
    };
  }
  if (role === "DEALER") return { sql: "(u.id=? OR u.parent_id=?)", params: [user.id, user.id] };
  return { sql: "u.id=?", params: [user.id] };
}

function assertAdmin(user) {
  if (!["SUPER_ADMIN", "MASTER"].includes(normalizeRole(user.role))) {
    throw new AppError("Admin permission required", 403);
  }
}

exports.getGames = asyncHandler(async (req, res) => {
  const [settings] = await promisePool.query("SELECT * FROM game_settings ORDER BY game_name");
  const games = settings.map((item) => ({
    id: item.id,
    game_key: item.game_key,
    title: item.game_name,
    category: item.game_key.startsWith("matka")
      ? "Matka"
      : item.game_key.startsWith("casino")
        ? "Casino"
        : item.game_key === "cricket"
          ? "Cricket"
          : "Game",
    market: item.game_name,
    status: item.status,
    min_bet: item.min_bet,
    max_bet: item.max_bet,
    commission: item.commission,
    updated_at: item.updated_at
  }));
  const [matches] = await promisePool.query("SELECT * FROM live_matches ORDER BY updated_at DESC");
  const [markets] = await promisePool.query("SELECT * FROM match_markets ORDER BY updated_at DESC");
  const [runners] = await promisePool.query("SELECT * FROM market_runners ORDER BY updated_at DESC");
  res.json({ games, settings, matches, markets, runners });
});

exports.updateGameSetting = asyncHandler(async (req, res) => {
  assertAdmin(req.user);
  const { gameKey } = req.params;
  const { min_bet, max_bet, commission, status } = req.body;

  await promisePool.query(
    "UPDATE game_settings SET min_bet=?, max_bet=?, commission=?, status=? WHERE game_key=?",
    [min_bet, max_bet, commission, status, gameKey]
  );
  res.json({ message: "Game settings updated" });
});

exports.placeBet = asyncHandler(async (req, res) => {
  const result = await betService.placeBet(req.user, req.body);
  emitEvent("bet:placed", { userId: req.user.id, ...result });
  emitEvent("wallet:update", { userId: req.user.id, wallet_balance: result.wallet_balance });
  res.json({ message: "Bet placed successfully", ...result });
});

exports.getBets = asyncHandler(async (req, res) => {
  const scoped = scopedUserCondition(req.user);
  const [rows] = await promisePool.query(
    `SELECT b.*, u.username, u.role, lm.team_a, lm.team_b, mm.market_name
     FROM bets b
     JOIN users u ON b.user_id = u.id
     LEFT JOIN live_matches lm ON lm.id = b.match_id
     LEFT JOIN match_markets mm ON mm.id = b.market_id
     WHERE ${scoped.sql}
     ORDER BY b.created_at DESC`,
    scoped.params
  );
  res.json(rows);
});

exports.createMatch = asyncHandler(async (req, res) => {
  assertAdmin(req.user);
  const { match_id, team_a, team_b, score, overs, status, start_time } = req.body;
  if (!team_a || !team_b) throw new AppError("Team names are required");

  const [result] = await promisePool.query(
    `INSERT INTO live_matches (match_id, team_a, team_b, score, overs, status, start_time)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [match_id || null, team_a, team_b, score || "0/0", overs || "0.0", status || "LIVE", start_time || null]
  );
  emitEvent("match:update", { id: result.insertId });
  res.json({ message: "Match created", id: result.insertId });
});

exports.updateMatch = asyncHandler(async (req, res) => {
  assertAdmin(req.user);
  const { score, overs, wickets, crr, rr, status } = req.body;
  await promisePool.query(
    `UPDATE live_matches
     SET score=COALESCE(?, score), overs=COALESCE(?, overs), wickets=COALESCE(?, wickets),
         crr=COALESCE(?, crr), rr=COALESCE(?, rr), status=COALESCE(?, status)
     WHERE id=?`,
    [score ?? null, overs ?? null, wickets ?? null, crr ?? null, rr ?? null, status ?? null, req.params.id]
  );
  await promisePool.query(
    "INSERT INTO market_history (admin_id, match_id, action, new_value) VALUES (?, ?, 'MATCH_UPDATE', ?)",
    [req.user.id, req.params.id, JSON.stringify({ score, overs, wickets, crr, rr, status })]
  );
  emitEvent("match:update", { id: Number(req.params.id), score, overs, wickets, crr, rr, status }, `match:${req.params.id}`);
  res.json({ message: "Match updated" });
});

exports.createMarket = asyncHandler(async (req, res) => {
  assertAdmin(req.user);
  const { match_id, market_name, market_type } = req.body;
  const [result] = await promisePool.query(
    "INSERT INTO match_markets (match_id, market_name, market_type) VALUES (?, ?, ?)",
    [match_id, market_name, market_type]
  );
  emitEvent("market:update", { id: result.insertId, match_id });
  res.json({ message: "Market created", id: result.insertId });
});

exports.updateMarket = asyncHandler(async (req, res) => {
  assertAdmin(req.user);
  const { status, suspended } = req.body;
  const [beforeRows] = await promisePool.query("SELECT * FROM match_markets WHERE id=?", [req.params.id]);
  await promisePool.query(
    "UPDATE match_markets SET status=COALESCE(?, status), suspended=COALESCE(?, suspended) WHERE id=?",
    [status ?? null, suspended ?? null, req.params.id]
  );
  const action = Number(suspended) ? "MARKET_SUSPEND" : status === "OPEN" ? "MARKET_RESUME" : "MARKET_UPDATE";
  await promisePool.query(
    "INSERT INTO market_history (admin_id, market_id, action, old_value, new_value) VALUES (?, ?, ?, ?, ?)",
    [req.user.id, req.params.id, action, JSON.stringify(beforeRows[0] || null), JSON.stringify({ status, suspended })]
  );
  emitEvent(Number(suspended) ? "market:suspend" : "market:update", { id: Number(req.params.id), status, suspended });
  res.json({ message: "Market updated" });
});

exports.upsertRunner = asyncHandler(async (req, res) => {
  assertAdmin(req.user);
  const { market_id, runner_name, back_odds, lay_odds, status } = req.body;
  const [beforeRows] = await promisePool.query(
    "SELECT * FROM market_runners WHERE market_id=? AND runner_name=? ORDER BY id DESC LIMIT 1",
    [market_id, runner_name]
  );
  const [result] = await promisePool.query(
    beforeRows.length
      ? "UPDATE market_runners SET back_odds=?, lay_odds=?, status=? WHERE id=?"
      : "INSERT INTO market_runners (back_odds, lay_odds, status, market_id, runner_name) VALUES (?, ?, ?, ?, ?)",
    beforeRows.length
      ? [back_odds, lay_odds, status || "ACTIVE", beforeRows[0].id]
      : [back_odds, lay_odds, status || "ACTIVE", market_id, runner_name]
  );
  const runnerId = beforeRows[0]?.id || result.insertId;
  await promisePool.query(
    "INSERT INTO market_history (admin_id, market_id, runner_id, action, old_value, new_value) VALUES (?, ?, ?, 'ODDS_UPDATE', ?, ?)",
    [req.user.id, market_id, runnerId, JSON.stringify(beforeRows[0] || null), JSON.stringify({ runner_name, back_odds, lay_odds, status })]
  );
  emitEvent("odds:update", { market_id, runner_name, back_odds, lay_odds, status });
  res.json({ message: "Runner odds updated", id: runnerId });
});

exports.settleMarket = asyncHandler(async (req, res) => {
  const result = await betService.settleMarket({
    marketId: Number(req.params.marketId),
    winningRunnerId: req.body.winning_runner_id,
    winningSelection: req.body.winning_selection,
    result: req.body.result,
    adminUser: req.user
  });
  emitEvent("bet:settled", { marketId: Number(req.params.marketId), ...result });
  res.json({ message: "Market settled", ...result });
});

exports.getMarketHistory = asyncHandler(async (req, res) => {
  const [rows] = await promisePool.query(
    `SELECT mh.*, u.username AS admin_name, mm.market_name, lm.team_a, lm.team_b
     FROM market_history mh
     LEFT JOIN users u ON u.id = mh.admin_id
     LEFT JOIN match_markets mm ON mm.id = mh.market_id
     LEFT JOIN live_matches lm ON lm.id = COALESCE(mh.match_id, mm.match_id)
     ORDER BY mh.created_at DESC`
  );
  res.json(rows);
});
