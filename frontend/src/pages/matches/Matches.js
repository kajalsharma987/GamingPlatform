import { useNavigate } from "react-router-dom";
import { useState } from "react";

function Matches() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("cricket");

  const matches = [
    { id: 1, name: "India vs Australia", time: "7:30 PM", status: "In Play" },
    { id: 2, name: "MI vs CSK", time: "3:00 PM", status: "Upcoming" },
    { id: 3, name: "RCB vs KKR", time: "9:00 PM", status: "Open" }
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Live Matches</h2>
        <button className="btn">Add Match</button>
      </div>

      <div className="panel">
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          {["cricket", "football", "tennis"].map((tab) => (
            <div key={tab} className={`tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
              {tab[0].toUpperCase() + tab.slice(1)}
            </div>
          ))}
        </div>

        <table className="table">
          <thead>
            <tr><th>Match</th><th>Time</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {matches.map((match) => (
              <tr key={match.id}>
                <td>{match.name}</td>
                <td>{match.time}</td>
                <td><span className="badge">{match.status}</span></td>
                <td><button className="btn" onClick={() => navigate(`/market/${match.id}`)}>Open Market</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Matches;
