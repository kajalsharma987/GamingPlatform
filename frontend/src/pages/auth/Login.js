import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) {
      setMessage("Username aur password enter karein.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        if (data.login_history_id) localStorage.setItem("login_history_id", data.login_history_id);
        navigate("/");
      } else {
        setMessage(data.message || "Login failed.");
      }
    } catch (err) {
      setMessage("Server error. Backend check karein.");
    }
  };

  return (
    <div style={page}>
      <div style={leftPane}>
        <div style={eyebrow}>IPL SUPER ADMIN</div>
        <h1 style={title}>Operate betting, users and settlement from one panel.</h1>
        <p style={text}>Secure login ke baad live games, Matka, Aviator, ledgers aur reports manage kar sakte hain.</p>
      </div>

      <div style={card}>
        <div style={brandMark}>IP</div>
        <h2 style={{ margin: "14px 0 6px" }}>Admin Login</h2>
        <p className="muted" style={{ marginTop: 0 }}>Sign in to continue</p>

        <div style={formGrid}>
          <input
            className="form-control"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <div className="input-action">
            <input
              className="form-control"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="btn secondary" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button className="btn" onClick={handleLogin}>Login</button>
          {message && <div className="muted">{message}</div>}
        </div>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 390px",
  alignItems: "center",
  gap: 32,
  padding: 36,
  background: "linear-gradient(135deg, #07111f, #0e7490)"
};

const leftPane = {
  color: "#fff",
  maxWidth: 680
};

const eyebrow = {
  fontSize: 12,
  fontWeight: 800,
  color: "#bae6fd"
};

const title = {
  fontSize: 42,
  lineHeight: 1.12,
  margin: "14px 0"
};

const text = {
  color: "#dbeafe",
  fontSize: 16
};

const card = {
  background: "#fff",
  borderRadius: 8,
  padding: 28,
  boxShadow: "0 24px 60px rgba(0,0,0,.22)"
};

const brandMark = {
  width: 46,
  height: 46,
  borderRadius: 8,
  display: "grid",
  placeItems: "center",
  background: "#0ea5e9",
  color: "#fff",
  fontWeight: 800
};

const formGrid = {
  display: "grid",
  gap: 12
};

export default Login;
