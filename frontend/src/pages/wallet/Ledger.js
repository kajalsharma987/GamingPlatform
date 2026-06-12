import { useEffect, useState } from "react";
import { api } from "../../utils/api";

function Ledger() {
  const [walletRows, setWalletRows] = useState([]);
  const [loginRows, setLoginRows] = useState([]);
  const [marketRows, setMarketRows] = useState([]);
  const [auditRows, setAuditRows] = useState([]);
  const [tab, setTab] = useState("wallet");
  const [message, setMessage] = useState("Loading history...");

  useEffect(() => {
    Promise.all([
      api("/history/wallet"),
      api("/history/login"),
      api("/games/history/markets"),
      api("/history/admin-audit").catch(() => [])
    ])
      .then(([wallet, login, market, audit]) => {
        setWalletRows(Array.isArray(wallet) ? wallet : []);
        setLoginRows(Array.isArray(login) ? login : []);
        setMarketRows(Array.isArray(market) ? market : []);
        setAuditRows(Array.isArray(audit) ? audit : []);
        setMessage("");
      })
      .catch((err) => setMessage(err.message));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">History</h2>
        <div className="filter-row">
          {["wallet", "login", "market", "audit"].map((item) => (
            <button key={item} className={`btn ${tab === item ? "" : "secondary"}`} onClick={() => setTab(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        {message && <p className="muted">{message}</p>}
        {tab === "wallet" && (
          <table className="table">
            <thead>
              <tr><th>Time</th><th>Sender</th><th>Receiver</th><th>User</th><th>Type</th><th>Amount</th><th>Before</th><th>After</th></tr>
            </thead>
            <tbody>
              {walletRows.map((t) => (
                <tr key={t.id}>
                  <td>{new Date(t.created_at).toLocaleString()}</td>
                  <td>{t.sender || "-"}</td>
                  <td>{t.receiver || "-"}</td>
                  <td>{t.username}</td>
                  <td><span className="badge">{t.transaction_type}</span></td>
                  <td>Rs. {Number(t.amount || 0).toLocaleString()}</td>
                  <td>Rs. {Number(t.before_balance || 0).toLocaleString()}</td>
                  <td>Rs. {Number(t.after_balance || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "login" && (
          <table className="table">
            <thead>
              <tr><th>User</th><th>IP</th><th>Browser</th><th>Login</th><th>Logout</th></tr>
            </thead>
            <tbody>
              {loginRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.username}</td>
                  <td>{row.ip || "-"}</td>
                  <td>{row.browser || "-"}</td>
                  <td>{new Date(row.login_time).toLocaleString()}</td>
                  <td>{row.logout_time ? new Date(row.logout_time).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "market" && (
          <table className="table">
            <thead>
              <tr><th>Time</th><th>Admin</th><th>Match</th><th>Market</th><th>Action</th><th>New Value</th></tr>
            </thead>
            <tbody>
              {marketRows.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.created_at).toLocaleString()}</td>
                  <td>{row.admin_name || "-"}</td>
                  <td>{row.team_a ? `${row.team_a} vs ${row.team_b}` : "-"}</td>
                  <td>{row.market_name || "-"}</td>
                  <td><span className="badge">{row.action}</span></td>
                  <td><code>{row.new_value || "-"}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "audit" && (
          <table className="table">
            <thead>
              <tr><th>Time</th><th>Admin</th><th>Target</th><th>Action</th><th>Entity</th><th>Value</th></tr>
            </thead>
            <tbody>
              {auditRows.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.created_at).toLocaleString()}</td>
                  <td>{row.admin_name || "-"}</td>
                  <td>{row.target_username || "-"}</td>
                  <td><span className="badge">{row.action}</span></td>
                  <td>{row.entity_type || "-"} {row.entity_id || ""}</td>
                  <td><code>{row.new_value || row.old_value || "-"}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Ledger;
