import { useEffect, useMemo, useState } from "react";
import { api, getCurrentUser } from "../../utils/api";

function Aviator() {

  const user = getCurrentUser();

  const [multiplier, setMultiplier] =
    useState(1);

  const [status, setStatus] =
    useState("Flying");

  const [amount, setAmount] =
    useState("");

  const [autoCashout, setAutoCashout] =
    useState("2.00");

  const [games, setGames] =
    useState([]);

  const [settings, setSettings] =
    useState([]);

  const [bets, setBets] =
    useState([]);

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const aviatorGame =
    games.find(
      (game) =>
        game.game_key === "aviator"
    );

  const setting =
    settings.find(
      (item) =>
        item.game_key === "aviator"
    );

  const gameClosed =
    setting?.status !== "ACTIVE";

  const isClient =
    user?.role?.toUpperCase() ===
    "CLIENT";

  const liveExposure = useMemo(
    () =>
      bets
        .filter(
          (bet) =>
            bet.game_key === "aviator" &&
            bet.status === "open"
        )
        .reduce(
          (sum, bet) =>
            sum + Number(bet.amount || 0),
          0
        ),
    [bets]
  );

  const load = async () => {

    try {

      const gamesData =
        await api("/games");

      setGames(gamesData.games || []);

      setSettings(
        gamesData.settings || []
      );

      const betsData =
        await api("/games/bets");

      setBets(
        Array.isArray(betsData)
          ? betsData
          : []
      );

    } catch (err) {

      setMessage(
        err.message ||
        "Failed to load data"
      );

    }

  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {

    if (status !== "Flying") {
      return undefined;
    }

    const timer = setInterval(() => {

      setMultiplier((value) =>
        Number(
          (
            value +
            0.03 +
            Math.random() * 0.08
          ).toFixed(2)
        )
      );

    }, 500);

    return () => clearInterval(timer);

  }, [status]);

  const placeBet = async () => {

    if (!isClient) {

      setMessage(
        "Only CLIENT role can place bets."
      );

      return;
    }

    if (gameClosed) {

      setMessage(
        "Game is closed."
      );

      return;
    }

    if (!amount || Number(amount) <= 0) {

      setMessage(
        "Please enter valid amount."
      );

      return;
    }

    if (
      Number(amount) <
      Number(setting?.min_bet || 50)
    ) {

      setMessage(
        `Minimum bet is Rs. ${
          setting?.min_bet || 50
        }`
      );

      return;
    }

    if (
      Number(amount) >
      Number(setting?.max_bet || 20000)
    ) {

      setMessage(
        `Maximum bet is Rs. ${
          setting?.max_bet || 20000
        }`
      );

      return;
    }

    try {

      setLoading(true);

      const data = await api(
        "/games/bets",
        {
          method: "POST",

          body: JSON.stringify({

            game_key: "aviator",

            live_game_id:
              aviatorGame?.id,

            market: "Multiplier",

            selection:
              `${autoCashout}x cashout`,

            amount: Number(amount),

            odds: Number(
              autoCashout || 1
            ),

            request_id:
              `${Date.now()}-aviator-${autoCashout}`

          })
        }
      );

      setMessage(
        data.message ||
        "Bet placed successfully"
      );

      setAmount("");

      await load();

    } catch (err) {

      setMessage(
        err.message ||
        "Bet failed"
      );

    } finally {

      setLoading(false);

    }

  };

  const crashRound = () => {

    setStatus("Crashed");

  };

  const nextRound = () => {

    setMultiplier(1);

    setStatus("Flying");

  };

  return (

    <div className="page">

      <div className="page-header">

        <div>

          <h2 className="page-title">
            Aviator Live
          </h2>

          <div className="muted">

            Min Rs. {
              setting?.min_bet || 50
            }

            {" / "}

            Max Rs. {
              setting?.max_bet || 20000
            }

          </div>

        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap"
          }}
        >

          <button
            className="btn danger"
            onClick={crashRound}
          >
            Crash
          </button>

          <button
            className="btn success"
            onClick={nextRound}
          >
            Next Round
          </button>

        </div>

      </div>

      <div className="split-grid">

        <div style={hero}>

          <div style={plane}>
            A
          </div>

          <div>

            <span style={heroPill}>

              {
                gameClosed
                  ? "CLOSED"
                  : (
                    aviatorGame?.status ||
                    "LIVE"
                  )
              }

            </span>

            <h3 style={heroTitle}>
              {multiplier.toFixed(2)}x
            </h3>

            <div>{status}</div>

          </div>

        </div>

        <div className="panel">

          <h2
            className="page-title"
            style={{
              marginBottom: 14
            }}
          >

            {
              isClient
                ? "Place Bet"
                : "Betting Locked"
            }

          </h2>

          <div style={formGrid}>

            <input
              className="form-control"
              value={amount}
              onChange={(e) =>
                setAmount(
                  e.target.value
                )
              }
              placeholder="Bet amount"
              disabled={
                !isClient ||
                gameClosed ||
                loading
              }
            />

            <input
              className="form-control"
              value={autoCashout}
              onChange={(e) =>
                setAutoCashout(
                  e.target.value
                )
              }
              placeholder="Auto cashout x"
              disabled={
                !isClient ||
                gameClosed ||
                loading
              }
            />

            <button
              className="btn"
              onClick={placeBet}
              disabled={
                !isClient ||
                gameClosed ||
                loading
              }
            >

              {
                loading
                  ? "Processing..."
                  : "Place Bet"
              }

            </button>

            {
              !isClient && (

                <div className="muted">

                  Only CLIENT role
                  can place bets.

                </div>

              )
            }

            {
              gameClosed && (

                <div className="muted">

                  Game is closed

                </div>

              )
            }

            {
              message && (

                <div className="muted">

                  {message}

                </div>

              )
            }

          </div>

        </div>

      </div>

      <div className="grid">

        <div className="stat-card">

          <h3>Live Exposure</h3>

          <strong>

            Rs. {
              liveExposure.toLocaleString()
            }

          </strong>

        </div>

        <div className="stat-card">

          <h3>Total Bets</h3>

          <strong>

            {
              bets.filter(
                (bet) =>
                  bet.game_key ===
                  "aviator"
              ).length
            }

          </strong>

        </div>

        <div className="stat-card">

          <h3>Commission</h3>

          <strong>

            {
              setting?.commission || 0
            }%

          </strong>

        </div>

      </div>

      <BetTable
        bets={
          bets.filter(
            (bet) =>
              bet.game_key ===
              "aviator"
          )
        }
      />

    </div>

  );
}

function BetTable({ bets }) {

  return (

    <div className="panel">

      <div
        className="page-header"
        style={{
          marginBottom: 12
        }}
      >

        <h2 className="page-title">
          Aviator Bets
        </h2>

        <span className="badge">
          {bets.length} records
        </span>

      </div>

      <table className="table">

        <thead>

          <tr>

            <th>User</th>
            <th>Selection</th>
            <th>Amount</th>
            <th>Odds</th>
            <th>Status</th>
            <th>Time</th>

          </tr>

        </thead>

        <tbody>

          {bets.map((bet) => (

            <tr key={bet.id}>

              <td>
                {bet.username}
              </td>

              <td>
                {bet.selection}
              </td>

              <td>

                Rs. {
                  Number(
                    bet.amount
                  ).toLocaleString()
                }

              </td>

              <td>

                {
                  Number(
                    bet.odds
                  ).toFixed(2)
                }x

              </td>

              <td>

                <span className="badge">
                  {bet.status}
                </span>

              </td>

              <td>

                {
                  new Date(
                    bet.created_at
                  ).toLocaleString()
                }

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );
}

const hero = {
  minHeight: 260,
  borderRadius: 8,
  padding: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  color: "#fff",
  background:
    "radial-gradient(circle at 70% 30%, #f97316, #111827 62%)",
  boxShadow:
    "0 12px 30px rgba(15, 23, 42, 0.16)"
};

const plane = {
  width: 98,
  height: 98,
  borderRadius: "50%",
  background: "rgba(255,255,255,.14)",
  display: "grid",
  placeItems: "center",
  fontSize: 54,
  fontWeight: 800
};

const heroPill = {
  display: "inline-block",
  padding: "5px 10px",
  borderRadius: 999,
  background: "rgba(255,255,255,.18)",
  fontWeight: 700
};

const heroTitle = {
  margin: "16px 0 4px",
  fontSize: 64
};

const formGrid = {
  display: "grid",
  gap: 12
};

export default Aviator;