const bcrypt = require("bcrypt");
const { promisePool } = require("./config/database");

async function run(sql, params = []) {
  try {
    await promisePool.query(sql, params);
  } catch (err) {
    if (
      ![
        "ER_DUP_FIELDNAME",
        "ER_DUP_KEYNAME",
        "ER_FK_DUP_NAME",
        "ER_CANT_DROP_FIELD_OR_KEY",
        "ER_BAD_FIELD_ERROR",
        "ER_DUP_ENTRY"
      ].includes(err.code)
    ) {
      console.log("Schema warning:", err.message);
    }
  }
}

async function ensureSchema() {

  /*
  ============================
  USERS
  ============================
  */

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,

      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(150) NULL,
      phone VARCHAR(30) NULL,

      password VARCHAR(255) NOT NULL,

      role ENUM(
        'SUPER_ADMIN',
        'MASTER',
        'DEALER',
        'CLIENT'
      ) NOT NULL DEFAULT 'CLIENT',

      wallet_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
      exposure_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
      available_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
      credit_limit DECIMAL(18,2) NOT NULL DEFAULT 0,
      max_exposure DECIMAL(18,2) NOT NULL DEFAULT 100000,

      commission DECIMAL(5,2) NOT NULL DEFAULT 0,

      parent_id INT NULL,

      status ENUM(
        'active',
        'blocked',
        'inactive'
      ) NOT NULL DEFAULT 'active',

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,

      deleted_at DATETIME NULL
    )
  `);

  await run(`
    CREATE INDEX idx_users_parent_id
    ON users(parent_id)
  `);

  await run(`
    CREATE INDEX idx_users_role_status
    ON users(role, status)
  `);

  await run(`
    CREATE INDEX idx_users_deleted_at
    ON users(deleted_at)
  `);

  /*
  ============================
  SINGLE SUPER ADMIN
  ============================
  */

  await promisePool.query(`
    DELETE FROM users
    WHERE role='SUPER_ADMIN'
    AND username != 'admin'
  `);

  /*
  ============================
  TRANSACTIONS
  ============================
  */

  await run(`
    CREATE TABLE IF NOT EXISTS transactions (

      id INT AUTO_INCREMENT PRIMARY KEY,

      from_id INT NULL,
      to_id INT NULL,

      amount DECIMAL(18,2) NOT NULL,

      transaction_type ENUM(
        'TRANSFER',
        'DEPOSIT',
        'WITHDRAW'
      ) NOT NULL DEFAULT 'TRANSFER',

      remark VARCHAR(255) NULL,

      created_by INT NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE INDEX idx_transactions_from_id
    ON transactions(from_id)
  `);

  await run(`
    CREATE INDEX idx_transactions_to_id
    ON transactions(to_id)
  `);

  /*
  ============================
  WALLET TRANSACTIONS
  ============================
  */

  await run(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (

      id INT AUTO_INCREMENT PRIMARY KEY,

      user_id INT NOT NULL,

      transaction_type ENUM(
        'DEPOSIT',
        'WITHDRAW',
        'BET_PLACED',
        'BET_SETTLED',
        'REFUND',
        'TRANSFER'
      ) NOT NULL,

      amount DECIMAL(18,2) NOT NULL,

      before_balance DECIMAL(18,2) NOT NULL,
      after_balance DECIMAL(18,2) NOT NULL,

      remark VARCHAR(255) NULL,

      reference_id VARCHAR(100) NULL,

      from_user_id INT NULL,
      to_user_id INT NULL,

      status ENUM(
        'SUCCESS',
        'FAILED',
        'PENDING'
      ) NOT NULL DEFAULT 'SUCCESS',

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE INDEX idx_wallet_tx_user_id
    ON wallet_transactions(user_id)
  `);

  await run(`
    CREATE INDEX idx_wallet_tx_reference_id
    ON wallet_transactions(reference_id)
  `);

  /*
  ============================
  LIVE MATCHES
  ============================
  */

  await run(`
    CREATE TABLE IF NOT EXISTS live_matches (

      id INT AUTO_INCREMENT PRIMARY KEY,

      match_id VARCHAR(80) UNIQUE,

      team_a VARCHAR(120) NOT NULL,
      team_b VARCHAR(120) NOT NULL,

      score VARCHAR(80) NULL,
      overs VARCHAR(20) NULL,

      wickets INT NOT NULL DEFAULT 0,

      crr DECIMAL(10,2) NULL,
      rr DECIMAL(10,2) NULL,

      status ENUM(
        'OPEN',
        'SUSPENDED',
        'BALL_RUNNING',
        'CLOSED'
      ) NOT NULL DEFAULT 'OPEN',

      created_by INT NULL,

      start_time DATETIME NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  /*
  ============================
  MATCH MARKETS
  ============================
  */

  await run(`
    CREATE TABLE IF NOT EXISTS match_markets (

      id INT AUTO_INCREMENT PRIMARY KEY,

      match_id INT NOT NULL,

      market_name VARCHAR(120) NOT NULL,

      market_type VARCHAR(40) NOT NULL,

      status ENUM(
        'OPEN',
        'SUSPENDED',
        'BALL_RUNNING',
        'CLOSED'
      ) NOT NULL DEFAULT 'OPEN',

      suspended TINYINT(1) NOT NULL DEFAULT 0,

      created_by INT NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  /*
  ============================
  MARKET RUNNERS
  ============================
  */

  await run(`
    CREATE TABLE IF NOT EXISTS market_runners (

      id INT AUTO_INCREMENT PRIMARY KEY,

      market_id INT NOT NULL,

      runner_name VARCHAR(120) NOT NULL,

      back_odds DECIMAL(10,2) NOT NULL DEFAULT 1,
      lay_odds DECIMAL(10,2) NOT NULL DEFAULT 1,

      status ENUM(
        'ACTIVE',
        'SUSPENDED',
        'INACTIVE'
      ) NOT NULL DEFAULT 'ACTIVE',

      created_by INT NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  /*
  ============================
  BETS
  ============================
  */

  await run(`
    CREATE TABLE IF NOT EXISTS bets (

      id INT AUTO_INCREMENT PRIMARY KEY,

      user_id INT NOT NULL,

      game_key VARCHAR(40) NOT NULL,

      match_id INT NULL,
      market_id INT NULL,
      runner_id INT NULL,

      selection VARCHAR(100) NOT NULL,

      bet_type ENUM(
        'BACK',
        'LAY'
      ) NOT NULL DEFAULT 'BACK',

      amount DECIMAL(18,2) NOT NULL,
      stake DECIMAL(18,2) NOT NULL DEFAULT 0,

      odds DECIMAL(10,2) NOT NULL DEFAULT 1,

      profit DECIMAL(18,2) NOT NULL DEFAULT 0,
      loss DECIMAL(18,2) NOT NULL DEFAULT 0,

      win_amount DECIMAL(18,2) NOT NULL DEFAULT 0,

      request_id VARCHAR(100) NULL,

      bet_delay_seconds INT NOT NULL DEFAULT 1,

      status ENUM(
        'open',
        'won',
        'lost',
        'refund',
        'void',
        'settled'
      ) NOT NULL DEFAULT 'open',

      settled_at DATETIME NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE UNIQUE INDEX uniq_bet_request
    ON bets(user_id, request_id)
  `);

  await run(`
    CREATE INDEX idx_bets_user_id
    ON bets(user_id)
  `);

  await run(`
    CREATE INDEX idx_bets_match_id
    ON bets(match_id)
  `);

  await run(`
    CREATE INDEX idx_bets_market_id
    ON bets(market_id)
  `);

  /*
  ============================
  LOGIN HISTORY
  ============================
  */

  await run(`
    CREATE TABLE IF NOT EXISTS login_history (

      id INT AUTO_INCREMENT PRIMARY KEY,

      user_id INT NOT NULL,

      ip VARCHAR(80) NULL,

      browser VARCHAR(255) NULL,

      login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      logout_time DATETIME NULL
    )
  `);

  /*
  ============================
  MARKET HISTORY
  ============================
  */

  await run(`
    CREATE TABLE IF NOT EXISTS market_history (

      id INT AUTO_INCREMENT PRIMARY KEY,

      admin_id INT NULL,

      match_id INT NULL,
      market_id INT NULL,
      runner_id INT NULL,

      action VARCHAR(60) NOT NULL,

      old_value JSON NULL,
      new_value JSON NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /*
  ============================
  ADMIN AUDIT LOGS
  ============================
  */

  await run(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (

      id INT AUTO_INCREMENT PRIMARY KEY,

      admin_id INT NULL,

      target_user_id INT NULL,

      action VARCHAR(80) NOT NULL,

      entity_type VARCHAR(60) NULL,

      entity_id INT NULL,

      old_value JSON NULL,
      new_value JSON NULL,

      ip VARCHAR(80) NULL,

      browser VARCHAR(255) NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /*
  ============================
  FOREIGN KEYS
  ============================
  */

  await run(`
    ALTER TABLE users
    ADD CONSTRAINT fk_users_parent
    FOREIGN KEY (parent_id)
    REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
  `);

  await run(`
    ALTER TABLE wallet_transactions
    ADD CONSTRAINT fk_wallet_transactions_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
  `);

  await run(`
    ALTER TABLE match_markets
    ADD CONSTRAINT fk_match_markets_match
    FOREIGN KEY (match_id)
    REFERENCES live_matches(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
  `);

  await run(`
    ALTER TABLE market_runners
    ADD CONSTRAINT fk_market_runners_market
    FOREIGN KEY (market_id)
    REFERENCES match_markets(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
  `);

  await run(`
    ALTER TABLE bets
    ADD CONSTRAINT fk_bets_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
  `);

  /*
  ============================
  UPDATE BALANCES
  ============================
  */

  await run(`
    UPDATE users
    SET available_balance =
    wallet_balance -
    exposure_balance +
    credit_limit
  `);

  /*
  ============================
  SEED ROOT ADMIN
  ============================
  */

  const [adminRows] = await promisePool.query(`
    SELECT id
    FROM users
    WHERE role='SUPER_ADMIN'
    LIMIT 1
  `);

  if (adminRows.length === 0) {

    const hash = await bcrypt.hash("admin123", 10);

    await promisePool.query(`
      INSERT INTO users (
        username,
        password,
        role,
        wallet_balance,
        exposure_balance,
        available_balance,
        commission
      )
      VALUES (
        'admin',
        ?,
        'SUPER_ADMIN',
        999999999,
        0,
        999999999,
        0
      )
    `, [hash]);

  }

  await run(`
CREATE TABLE IF NOT EXISTS wallet_requests (

id INT AUTO_INCREMENT PRIMARY KEY,

user_id INT NOT NULL,

request_type ENUM(
'DEPOSIT',
'WITHDRAW'
) NOT NULL,

amount DECIMAL(18,2) NOT NULL,

status ENUM(
'PENDING',
'APPROVED',
'REJECTED'
) NOT NULL DEFAULT 'PENDING',

remark VARCHAR(255) NULL,

created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
ON UPDATE CURRENT_TIMESTAMP

)
`);
await run(`
CREATE TABLE IF NOT EXISTS game_settings (

id INT AUTO_INCREMENT PRIMARY KEY,

game_key VARCHAR(80) NOT NULL UNIQUE,

game_name VARCHAR(120) NOT NULL,

status ENUM(
'ACTIVE',
'INACTIVE',
'SUSPENDED'
) NOT NULL DEFAULT 'ACTIVE',

min_bet DECIMAL(18,2) NOT NULL DEFAULT 100,

max_bet DECIMAL(18,2) NOT NULL DEFAULT 50000,

max_profit DECIMAL(18,2) NOT NULL DEFAULT 100000,

bet_delay_seconds INT NOT NULL DEFAULT 1,

created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
ON UPDATE CURRENT_TIMESTAMP

)
`);

await run(`
INSERT IGNORE INTO game_settings
(
game_key,
game_name,
status,
min_bet,
max_bet
)
VALUES

(
'cricket',
'Live Cricket',
'ACTIVE',
100,
50000
),

(
'casino',
'Live Casino',
'ACTIVE',
100,
50000
),

(
'aviator',
'Aviator',
'ACTIVE',
100,
50000
),

(
'matka_ghaziabad',
'Ghaziabad Matka',
'ACTIVE',
100,
50000
),

(
'matka_kalyan',
'Kalyan Matka',
'ACTIVE',
100,
50000
),

(
'matka_milan',
'Milan Day Matka',
'ACTIVE',
100,
50000
),

(
'matka_delhi',
'Delhi Bazar Matka',
'ACTIVE',
100,
50000
),

(
'casino_teen_patti',
'Teen Patti',
'ACTIVE',
100,
25000
),

(
'casino_dragon_tiger',
'Dragon Tiger',
'ACTIVE',
100,
25000
),

(
'casino_andar_bahar',
'Andar Bahar',
'ACTIVE',
100,
25000
),

(
'casino_roulette',
'Roulette',
'ACTIVE',
100,
25000
),

(
'casino_lucky7',
'Lucky 7',
'ACTIVE',
100,
25000
),

(
'casino_baccarat',
'Baccarat',
'ACTIVE',
100,
25000
)
`);

  await run(`ALTER TABLE bets ADD COLUMN live_game_id INT NULL`);
  await run(`ALTER TABLE bets ADD COLUMN market VARCHAR(120) NULL`);

  await run(`ALTER TABLE game_settings ADD COLUMN commission DECIMAL(5,2) NOT NULL DEFAULT 0`);

  await run(`
    ALTER TABLE transactions
    MODIFY transaction_type ENUM(
      'TRANSFER',
      'DEPOSIT',
      'WITHDRAW',
      'BET'
    ) NOT NULL DEFAULT 'TRANSFER'
  `);

  await run(`ALTER TABLE wallet_requests ADD COLUMN handled_by INT NULL`);
  await run(`ALTER TABLE wallet_requests ADD COLUMN handled_at DATETIME NULL`);

  await run(`
    CREATE TABLE IF NOT EXISTS matka_markets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      market_key VARCHAR(60) NOT NULL UNIQUE,
      market_name VARCHAR(120) NOT NULL,
      open_time TIME NOT NULL DEFAULT '10:00:00',
      close_time TIME NOT NULL DEFAULT '18:00:00',
      status ENUM('OPEN','CLOSED','SUSPENDED') NOT NULL DEFAULT 'OPEN',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS matka_results (
      id INT AUTO_INCREMENT PRIMARY KEY,
      market_key VARCHAR(60) NOT NULL,
      result_date DATE NOT NULL,
      open_panna VARCHAR(10) NULL,
      open_digit TINYINT NULL,
      close_panna VARCHAR(10) NULL,
      close_digit TINYINT NULL,
      jodi VARCHAR(10) NULL,
      declared_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_matka_day (market_key, result_date)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS matka_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      market_key VARCHAR(60) NOT NULL,
      session_date DATE NOT NULL,
      session_type ENUM('open','close') NOT NULL,
      status ENUM('OPEN','CLOSED','DECLARED') NOT NULL DEFAULT 'OPEN',
      betting_closes_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_matka_session (market_key, session_date, session_type)
    )
  `);

  await run(`
    INSERT IGNORE INTO matka_markets (market_key, market_name, open_time, close_time)
    VALUES
    ('ghaziabad', 'Ghaziabad', '10:30:00', '16:00:00'),
    ('kalyan', 'Kalyan', '15:45:00', '17:45:00'),
    ('milan', 'Milan Day', '15:00:00', '17:00:00'),
    ('delhi', 'Delhi Bazar', '17:00:00', '20:00:00')
  `);

  console.log("Schema Ready");
}

module.exports = ensureSchema;