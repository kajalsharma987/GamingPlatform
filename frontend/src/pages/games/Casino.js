import { useEffect, useMemo, useState } from "react";
import { api, getCurrentUser } from "../../utils/api";

function Casino() {

  const user = getCurrentUser();

  const [games, setGames] = useState([]);
  const [settings, setSettings] = useState([]);

  const [selection, setSelection] =
    useState("Player");

  const [amount, setAmount] =
    useState("");

  const [bets, setBets] = useState([]);

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const casino =
    games.find(
      (game) =>
        game.game_key === "casino"
    );

  const setting =
    settings.find(
      (item) =>
        item.game_key === "casino"
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
            bet.game_key === "casino" &&
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

  const placeBet = async () => {

    if (!isClient) {

      setMessage(
        "Only CLIENT role can place bets."
      );

      return;
    }

    if (gameClosed) {

      setMessage("Game is closed.");

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
      Number(setting?.min_bet || 100)
    ) {

      setMessage(
        `Minimum bet is Rs. ${
          setting?.min_bet || 100
        }`
      );

      return;
    }

    if (
      Number(amount) >
      Number(setting?.max_bet || 25000)
    ) {

      setMessage(
        `Maximum bet is Rs. ${
          setting?.max_bet || 25000
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

            game_key: "casino",

            live_game_id:
              casino?.id,

            market:
              "Casino Live Table",

            selection,

            amount: Number(amount),

            odds: 1.95,

            request_id:
              `${Date.now()}-casino-${selection}`

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

  return (

    <div className="page">

      <div className="page-header">

        <div>

          <h2 className="page-title">
            Casino Live
          </h2>

          <div className="muted">

            Min Rs. {
              setting?.min_bet || 100
            }

            {" / "}

            Max Rs. {
              setting?.max_bet || 25000
            }

          </div>

        </div>

        <span className="badge">

          {
            casino?.status ||
            "LIVE"
          }

        </span>

      </div>

      <div className="split-grid">

        <div className="panel">

          <table className="table">

            <thead>

              <tr>

                <th>Table</th>
                <th>Player</th>
                <th>Banker</th>
                <th>Status</th>

              </tr>

            </thead>

            <tbody>

              <tr>

                <td>
                  <strong>
                    Live Table
                  </strong>
                </td>

                <td>1.95</td>

                <td>1.95</td>

                <td>

                  <span className="badge">

                    {
                      gameClosed
                        ? "Closed"
                        : "Open"
                    }

                  </span>

                </td>

              </tr>

            </tbody>

          </table>

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
                ? "Place Casino Bet"
                : "Betting Locked"
            }

          </h2>

          <div style={formGrid}>

            <select
              className="form-control"
              value={selection}
              onChange={(e) =>
                setSelection(
                  e.target.value
                )
              }
              disabled={
                !isClient ||
                gameClosed ||
                loading
              }
            >

              <option value="Player">
                Player
              </option>

              <option value="Banker">
                Banker
              </option>

            </select>

            <input
              className="form-control"
              value={amount}
              onChange={(e) =>
                setAmount(
                  e.target.value
                )
              }
              placeholder="Amount"
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
                  "casino"
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
              "casino"
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
          Casino Bets
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
                }

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

const formGrid = {
  display: "grid",
  gap: 12
};

export default Casino;