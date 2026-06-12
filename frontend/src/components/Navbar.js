import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api";

function Navbar() {
  const navigate = useNavigate();
  const [logoVersion, setLogoVersion] = useState(localStorage.getItem("logoVersion") || "1");

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch (err) {
      return {};
    }
  }, []);

  useEffect(() => {
    const refreshLogo = () => {
      setLogoVersion(localStorage.getItem("logoVersion") || Date.now().toString());
    };

    window.addEventListener("storage", refreshLogo);
    window.addEventListener("logo-updated", refreshLogo);

    return () => {
      window.removeEventListener("storage", refreshLogo);
      window.removeEventListener("logo-updated", refreshLogo);
    };
  }, []);
  const portalNames = {
    super_admin: ["Super Admin Panel", "Live betting operations"],
    master: ["Master Portal", "Agent and client management"],
    agent: ["Agent Portal", "Client betting operations"],
    client: ["User Portal", "Games and coin wallet"]
  };
  const [portalTitle, portalSubtitle] = portalNames[user.role] || portalNames.client;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <img
          src={`http://localhost:5000/uploads/logo.png?v=${logoVersion}`}
          alt="logo"
          className="topbar-logo"
        />
        <div>
          <strong>{portalTitle}</strong>
          <span>{portalSubtitle}</span>
        </div>
      </div>

      <div className="topbar-right">
        <div className="system-status">
          <span className="status-dot" />
          System Online
        </div>
        <div className="user-chip">{user.username || "Admin"}</div>
        <button
          className="btn danger"
          onClick={() => {
            api("/logout", {
              method: "POST",
              body: JSON.stringify({ login_history_id: localStorage.getItem("login_history_id") })
            }).finally(() => {
              localStorage.clear();
              navigate("/login");
            });
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;
