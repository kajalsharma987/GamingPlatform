import { useEffect, useMemo, useState } from "react";
import { api, getCurrentUser } from "../../utils/api";

function Matka() {
  const user = getCurrentUser();
  const isClient = user?.role === "client";
  const [games, setGames] = useState([]);
  const [settings, setSettings] = useState([]);
  const [bets, setBets] = useState([]);
  const [session, setSession] = useState("open");
  const [digit, setDigit] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  const ghaziabad = games.find((game) => game.game_key === "matka_ghaziabad");
  const setting = settings.find((item) => item.game_key === "matka_ghaziabad");
  const matkaBets = bets.filter((bet) => bet.game_key === "matka_ghaziabad");
  const liveExposure = useMemo(
    () => matkaBets.filter((bet) => bet.status === "open").reduce((sum, bet) => sum + Number(bet.amount), 0),
    [matkaBets]
  );

  const load = () => {
    api("/games").then((data) => {
      setGames(data.games || []);
      setSettings(data.settings || []);
    }).catch((err) => setMessage(err.message));
    api("/games/bets").then((data) => setBets(Array.isArray(data) ? data : [])).catch(() => setBets([]));
  };

  useEffect(() => {
    load();
  }, []);

  const placeBet = async () => {
    if (!isClient) {
      setMessage("Only client can play and place bets.");
      return;
    }

    try {
      const data = await api("/games/bets", {
        method: "POST",
        body: JSON.stringify({
          game_key: "matka_ghaziabad",
          live_game_id: ghaziabad?.id,
          market: "Ghaziabad Matka",
          selection: `${session} ${digit}`,
          amount: Number(amount),
          odds: 9,
          request_id: `${Date.now()}-matka-${session}-${digit}`
        })
      });
      setMessage(data.message);
      setDigit("");
      setAmount("");
      load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Ghaziabad Matka Live</h2>
          <div className="muted">Min Rs. {setting?.min_bet || 10} / Max Rs. {setting?.max_bet || 10000}</div>
        </div>
        <span className="badge">{ghaziabad?.status || "live"}</span>
      </div>

      <div className="grid">
        <div className="stat-card"><h3>Market</h3><strong>{ghaziabad?.title || "Ghaziabad Matka"}</strong></div>
        <div className="stat-card"><h3>Live Exposure</h3><strong>Rs. {liveExposure.toLocaleString()}</strong></div>
        <div className="stat-card"><h3>Commission</h3><strong>{setting?.commission || 0}%</strong></div>
      </div>

      <div className="split-grid">
        <div className="panel">
          <div className="page-header" style={{ marginBottom: 12 }}>
            <h2 className="page-title">Live Market</h2>
            <span className="badge">Ghaziabad</span>
          </div>
          <table className="table">
            <thead>
              <tr><th>Market</th><th>Session</th><th>Open</th><th>Close</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Ghaziabad Matka</strong></td>
                <td>Open/Close</td>
                <td>235</td>
                <td>---</td>
                <td><span className="badge">{ghaziabad?.status || "live"}</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2 className="page-title" style={{ marginBottom: 14 }}>{isClient ? "Place Matka Bet" : "Betting Locked"}</h2>
          <div style={formGrid}>
            <select className="form-control" value={session} onChange={(e) => setSession(e.target.value)} disabled={!isClient}>
              <option value="open">Open</option>
              <option value="close">Close</option>
            </select>
            <input className="form-control" value={digit} onChange={(e) => setDigit(e.target.value)} placeholder="Digit / jodi / panna" disabled={!isClient} />
            <input className="form-control" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" disabled={!isClient} />
            <button className="btn" onClick={placeBet} disabled={!isClient}>Place Bet</button>
            {!isClient && <div className="muted">Admin/master/agent can monitor only. Client login can play.</div>}
            {message && <div className="muted">{message}</div>}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="page-header" style={{ marginBottom: 12 }}>
          <h2 className="page-title">Matka Bets</h2>
          <span className="badge">{matkaBets.length} records</span>
        </div>
        <table className="table">
          <thead>
            <tr><th>User</th><th>Selection</th><th>Amount</th><th>Odds</th><th>Status</th><th>Time</th></tr>
          </thead>
          <tbody>
            {matkaBets.map((bet) => (
              <tr key={bet.id}>
                <td>{bet.username}</td>
                <td>{bet.selection}</td>
                <td>Rs. {Number(bet.amount).toLocaleString()}</td>
                <td>{Number(bet.odds).toFixed(2)}x</td>
                <td><span className="badge">{bet.status}</span></td>
                <td>{new Date(bet.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const formGrid = {
  display: "grid",
  gap: 12
};

export default Matka;
