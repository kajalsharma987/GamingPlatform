import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../utils/api";

function Dashboard() {

  const navigate = useNavigate();

  const [games, setGames] = useState([]);
  const [bets, setBets] = useState([]);
  const [users, setUsers] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  useEffect(() => {

    api("/games")
      .then((data) => setGames(data.games || []))
      .catch(() => setGames([]));

    api("/games/bets")
      .then((data) =>
        setBets(Array.isArray(data) ? data : [])
      )
      .catch(() => setBets([]));

    api("/users")
      .then((data) =>
        setUsers(Array.isArray(data) ? data : [])
      )
      .catch(() => setUsers([]));

    api("/dashboard/stats")
      .then(setDashboardStats)
      .catch(() => setDashboardStats(null));

  }, []);

  const liveExposure = useMemo(
    () =>
      bets
        .filter((bet) => bet.status === "open")
        .reduce(
          (sum, bet) => sum + Number(bet.amount || 0),
          0
        ),
    [bets]
  );

  const stats = [

    {
      label: "Total Masters",
      value:
        dashboardStats?.total_masters ??
        users.filter(
          (u) =>
            u.role?.toUpperCase() === "MASTER"
        ).length,
      trend: "Users"
    },

    {
      label: "Total Dealers",
      value:
        dashboardStats?.total_dealers ??
        users.filter(
          (u) =>
            u.role?.toUpperCase() === "DEALER"
        ).length,
      trend: "Users"
    },

    {
      label: "Total Clients",
      value:
        dashboardStats?.total_clients ??
        users.filter(
          (u) =>
            u.role?.toUpperCase() === "CLIENT"
        ).length,
      trend: "Users"
    },

    ...(user?.role?.toUpperCase() === "SUPER_ADMIN"
      ? [{
          label: "Platform Balance",
          value: `Rs. ${Number(
            dashboardStats?.total_platform_balance || 0
          ).toLocaleString()}`,
          trend: "Wallet"
        }]
      : []),

    {
      label: "Total Exposure",
      value: `Rs. ${Number(
        dashboardStats?.total_exposure ||
        liveExposure
      ).toLocaleString()}`,
      trend: "Live"
    },

    {
      label: "Wallet Balance",
      value: `Rs. ${Number(
        user?.wallet_balance || 0
      ).toLocaleString()}`,
      trend: "Balance"
    },

    {
      label: "Exposure",
      value: `Rs. ${Number(
        user?.exposure_balance || 0
      ).toLocaleString()}`,
      trend: "Exposure"
    },

    {
      label: "Available Balance",
      value: `Rs. ${Number(
        user?.available_balance || 0
      ).toLocaleString()}`,
      trend: "Available"
    },

    {
      label: "Live Bets",
      value:
        dashboardStats?.live_bets ??
        bets.filter(
          (bet) => bet.status === "open"
        ).length,
      trend: "Open"
    }

  ];

  const pathForGame = (key) => {

    if (key === "aviator") {
      return "/aviator";
    }

    if (key === "matka_ghaziabad") {
      return "/matka";
    }

    if (key === "casino") {
      return "/casino";
    }

    return "/market";
  };

  const actions = [
    {
      title: "Create User",
      text: "Role-based master, dealer, client",
      path: "/users"
    },
    {
      title: "Deposit / Withdraw",
      text: "Panel wallet entries",
      path: "/wallet"
    },
    {
      title: "Current Bets",
      text: "Scoped betting records",
      path: "/bets"
    },
    {
      title: "Settlement",
      text: "Payable and receivable",
      path: "/settlement"
    }
  ];

  return (

    <div className="page">

      <div style={hero}>

        <div>

          <div style={eyebrow}>
            SUPER ADMIN PANEL
          </div>

          <h1 style={heroTitle}>
            Live betting operations
          </h1>

          <div style={heroText}>
            Cricket, casino, aviator,
            Ghaziabad matka, wallet,
            users and settlement
            connected to backend.
          </div>

        </div>

        <div style={heroActions}>

          <button
            className="btn"
            onClick={() => navigate("/bets")}
          >
            Open Bets
          </button>

          <button
            className="btn secondary"
            onClick={() => navigate("/wallet")}
          >
            Wallet
          </button>

        </div>

      </div>

      <div className="grid">

        {stats.map((stat) => (

          <div
            className="stat-card"
            key={stat.label}
          >

            <div style={statTop}>

              <h3>{stat.label}</h3>

              <span className="badge">
                {stat.trend}
              </span>

            </div>

            <strong>{stat.value}</strong>

          </div>

        ))}

      </div>

      <div className="split-grid">

        <div className="panel">

          <div
            className="page-header"
            style={{ marginBottom: 12 }}
          >

            <h2 className="page-title">
              Live Games
            </h2>

            <span className="badge">
              Backend live board
            </span>

          </div>

          <table className="table">

            <thead>
              <tr>
                <th>Game</th>
                <th>Category</th>
                <th>Market</th>
                <th>Status</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {games.map((game) => (

                <tr key={game.id}>

                  <td>
                    <strong>{game.title}</strong>
                  </td>

                  <td>{game.category}</td>

                  <td>{game.market || "-"}</td>

                  <td>
                    <span className="badge">
                      {game.status}
                    </span>
                  </td>

                  <td>
                    {new Date(
                      game.updated_at
                    ).toLocaleString()}
                  </td>

                  <td>

                    <button
                      className="btn"
                      onClick={() =>
                        navigate(
                          pathForGame(game.game_key)
                        )
                      }
                    >
                      Open
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

        <div className="panel">

          <h2
            className="page-title"
            style={{ marginBottom: 12 }}
          >
            Quick Actions
          </h2>

          <div style={actionList}>

            {actions.map((action) => (

              <button
                key={action.title}
                style={actionButton}
                onClick={() =>
                  navigate(action.path)
                }
              >

                <strong>{action.title}</strong>

                <span>{action.text}</span>

              </button>

            ))}

          </div>

          {dashboardStats?.recent_transfers
            ?.length > 0 && (

            <div style={{ marginTop: 18 }}>

              <h2
                className="page-title"
                style={{ marginBottom: 12 }}
              >
                Recent Transfers
              </h2>

              <div style={actionList}>

                {dashboardStats.recent_transfers.map(
                  (item) => (

                    <div
                      key={item.id}
                      style={transferItem}
                    >

                      <strong>
                        Rs. {Number(
                          item.amount || 0
                        ).toLocaleString()}
                      </strong>

                      <span>
                        {item.sender || "-"} to{" "}
                        {item.receiver || "-"} ·{" "}
                        {item.transaction_type}
                      </span>

                    </div>

                  )
                )}

              </div>

            </div>

          )}

        </div>

      </div>

    </div>
  );
}

const hero = {
  minHeight: 210,
  borderRadius: 8,
  padding: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 20,
  color: "#fff",
  background:
    "linear-gradient(135deg, #0f172a, #0e7490 58%, #166534)",
  boxShadow:
    "0 16px 38px rgba(15, 23, 42, 0.18)"
};

const eyebrow = {
  fontSize: 12,
  fontWeight: 700,
  color: "#bae6fd"
};

const heroTitle = {
  margin: "10px 0",
  fontSize: 36,
  lineHeight: 1.15
};

const heroText = {
  color: "#dbeafe",
  maxWidth: 560
};

const heroActions = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap"
};

const statTop = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10
};

const actionList = {
  display: "grid",
  gap: 10
};

const actionButton = {
  width: "100%",
  textAlign: "left",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  background: "#f8fafc",
  padding: 14,
  cursor: "pointer",
  display: "grid",
  gap: 4,
  color: "#0f172a"
};

const transferItem = {
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  background: "#f8fafc",
  padding: 12,
  display: "grid",
  gap: 4
};

export default Dashboard;