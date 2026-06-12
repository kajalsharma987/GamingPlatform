import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import API_URL, { api, getCurrentUser } from "../../utils/api";

const fallbackBalls = ["1", "4", "6", "W", "0", "2"];

function Market() {
  const { id } = useParams();
  const user = getCurrentUser();
  const [data, setData] = useState({ games: [], settings: [], matches: [], markets: [], runners: [] });
  const [amount, setAmount] = useState("");
  const [selection, setSelection] = useState("Home Team");
  const [message, setMessage] = useState("");

  const match = useMemo(() => {
    if (!data.matches?.length) return null;
    return data.matches.find((item) => Number(item.id) === Number(id)) || data.matches[0];
  }, [data.matches, id]);

  const markets = useMemo(
    () => data.markets?.filter((market) => Number(market.match_id) === Number(match?.id)) || [],
    [data.markets, match?.id]
  );
  const bookmaker = markets.find((market) => market.market_type === "BOOKMAKER") || markets[0];
  const runners = data.runners?.filter((runner) => Number(runner.market_id) === Number(bookmaker?.id)) || [];
  const setting = data.settings?.find((item) => item.game_key === "cricket");
  const isClient = user?.role === "client";

  useEffect(() => {
    api("/games")
      .then(setData)
      .catch((err) => setMessage(err.message));
  }, []);

  useEffect(() => {
    if (!match?.id) return undefined;
    const socket = io(API_URL, { transports: ["websocket", "polling"] });
    socket.emit("match:join", match.id);
    socket.on("match:update", (payload) => {
      setData((current) => ({
        ...current,
        matches: current.matches.map((item) => (Number(item.id) === Number(payload.id) ? { ...item, ...payload } : item))
      }));
    });
    socket.on("market:update", () => api("/games").then(setData).catch(() => {}));
    socket.on("odds:update", () => api("/games").then(setData).catch(() => {}));
    socket.on("bet:placed", (payload) => {
      if (Number(payload.userId) === Number(user?.id)) setMessage("Bet placed and wallet updated.");
    });
    return () => {
      socket.emit("match:leave", match.id);
      socket.disconnect();
    };
  }, [match?.id, user?.id]);

  const placeBet = async (runner, betType) => {
    if (!isClient) {
      setMessage("Only client can place bets.");
      return;
    }

    try {
      const odds = betType === "KHAI" || betType === "LAY" ? runner.lay_odds : runner.back_odds;
      const response = await api("/games/bets", {
        method: "POST",
        body: JSON.stringify({
          game_key: "cricket",
          match_id: match?.id,
          market_id: bookmaker?.id,
          runner_id: runner.id,
          market: bookmaker?.market_name || "Bookmaker",
          selection: runner.runner_name,
          bet_type: betType,
          amount: Number(amount),
          odds,
          request_id: `${Date.now()}-${runner.id}-${betType}`
        })
      });
      setSelection(runner.runner_name);
      setMessage(response.message);
      setAmount("");
    } catch (err) {
      setMessage(err.message);
    }
  };

  const visibleRunners = runners.length
    ? runners
    : [
        { id: "home", runner_name: "Home Team", back_odds: 1.82, lay_odds: 1.86 },
        { id: "away", runner_name: "Away Team", back_odds: 2.05, lay_odds: 2.1 }
      ];

  return (
    <div className="page match-page">
      <div className="match-hero">
        <div>
          <div className="muted">Live Cricket</div>
          <h2>{match ? `${match.team_a} vs ${match.team_b}` : "Home Team vs Away Team"}</h2>
          <div className="score-line">
            <strong>{match?.score || "0/0"}</strong>
            <span>{match?.overs || "0.0"} overs</span>
            <span>CRR {match?.crr || "-"}</span>
            <span>RR {match?.rr || "-"}</span>
          </div>
        </div>
        <span className={`market-state ${bookmaker?.suspended ? "danger" : ""}`}>
          {bookmaker?.suspended ? "SUSPENDED" : match?.status || "BALL_RUNNING"}
        </span>
      </div>

      <div className="live-balls" aria-label="Live balls">
        {fallbackBalls.map((ball, index) => (
          <span key={`${ball}-${index}`} className={ball === "W" ? "wicket" : ""}>{ball}</span>
        ))}
      </div>

      <div className="match-layout">
        <section className="panel video-panel">
          <div className="video-area">LIVE</div>
        </section>

        <aside className="panel bet-ticket">
          <h3>Bet Ticket</h3>
          <div className="muted">Min Rs. {setting?.min_bet || 100} / Max Rs. {setting?.max_bet || 50000}</div>
          <select className="form-control" value={selection} onChange={(event) => setSelection(event.target.value)} disabled={!isClient}>
            {visibleRunners.map((runner) => <option key={runner.id}>{runner.runner_name}</option>)}
          </select>
          <input
            className="form-control"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Stake"
            disabled={!isClient}
          />
          {message && <div className="muted">{message}</div>}
        </aside>
      </div>

      <section className="panel">
        <div className="market-title">
          <h3>{bookmaker?.market_name || "Bookmaker"}</h3>
          <span className="badge">{bookmaker?.suspended ? "SUSPENDED" : "BALL_RUNNING"}</span>
        </div>
        <table className="table odds-table">
          <thead>
            <tr><th>Runner</th><th>Lagai</th><th>Khai</th><th>Status</th></tr>
          </thead>
          <tbody>
            {visibleRunners.map((runner) => (
              <tr key={runner.id}>
                <td><strong>{runner.runner_name}</strong></td>
                <td><button className="odds-button back" onClick={() => placeBet(runner, "LAGAI")} disabled={!isClient || bookmaker?.suspended}>{runner.back_odds}</button></td>
                <td><button className="odds-button lay" onClick={() => placeBet(runner, "KHAI")} disabled={!isClient || bookmaker?.suspended}>{runner.lay_odds}</button></td>
                <td><span className="badge">{runner.status || "ACTIVE"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <div className="market-title">
          <h3>Fancy Market</h3>
          <span className="badge">YES / NO</span>
        </div>
        <table className="table odds-table">
          <tbody>
            <tr>
              <td><strong>Runs in next over</strong></td>
              <td><button className="odds-button back" disabled={!isClient}>YES 1.90</button></td>
              <td><button className="odds-button lay" disabled={!isClient}>NO 1.95</button></td>
              <td><span className="badge">OPEN</span></td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default Market;
