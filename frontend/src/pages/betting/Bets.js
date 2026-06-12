import { useEffect, useState } from "react";
import { api } from "../../utils/api";

function Bets() {
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("Loading bets...");

  useEffect(() => {
    api("/games/bets")
      .then((data) => {
        setRows(Array.isArray(data) ? data : []);
        setMessage("");
      })
      .catch((err) => setMessage(err.message));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Current Bets</h2>
          <div className="muted">Scoped betting records from your panel.</div>
        </div>
        <span className="badge">{rows.length} records</span>
      </div>
      <div className="panel">
        {message && <p className="muted">{message}</p>}
        <table className="table">
          <thead>
            <tr><th>ID</th><th>User</th><th>Match</th><th>Market</th><th>Odds</th><th>Stake</th><th>Profit/Loss</th><th>Result</th><th>Timestamp</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.username}</td>
                <td>{row.team_a ? `${row.team_a} vs ${row.team_b}` : row.game_key}</td>
                <td>{row.market || "-"}</td>
                <td>{Number(row.odds).toFixed(2)}x</td>
                <td>Rs. {Number(row.stake || row.amount).toLocaleString()}</td>
                <td>Rs. {Number(row.status === "won" ? row.win_amount : row.status === "lost" ? -(row.loss || row.amount) : row.profit || 0).toLocaleString()}</td>
                <td><span className="badge">{row.status}</span> {row.selection}</td>
                <td>{new Date(row.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Bets;
