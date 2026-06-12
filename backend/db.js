const { pool } = require("./config/database");

pool.getConnection((err, connection) => {
  if (err) {
    console.log("DB Error:", err);
    return;
  }

  connection.release();
  console.log("MySQL Connected");
});

module.exports = pool;
