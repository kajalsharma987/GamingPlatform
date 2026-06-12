import { Link } from "react-router-dom";

function Settings() {
  return (
    <div>
      <h2>Super Admin Settings</h2>

      <div style={grid}>
        <div style={card}>
          <h3 style={heading}>Logo</h3>
          <p style={text}>Admin panel logo manually change karein.</p>
          <Link to="/settings/logo" style={button}>Change Logo</Link>
        </div>

        <div style={card}>
          <h3 style={heading}>Images</h3>
          <p style={text}>Logo, live, settlement aur baaki upload images replace karein.</p>
          <Link to="/settings/icons" style={button}>Upload Image</Link>
        </div>

        <div style={card}>
          <h3 style={heading}>Set Commission</h3>
          <input placeholder="Enter % commission" style={input} />
          <button style={button}>Save</button>
        </div>

        <div style={card}>
          <h3 style={heading}>System Controls</h3>
          <div>
            <button style={dangerButton}>Disable Betting</button>
            <button style={successButton}>Enable Betting</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 16,
  marginTop: 20
};

const card = {
  padding: 20,
  background: "#fff",
  color: "#0f172a",
  borderRadius: 8,
  boxShadow: "0 0 10px rgba(0,0,0,0.1)"
};

const heading = {
  marginTop: 0
};

const text = {
  color: "#475569"
};

const input = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  marginBottom: 12
};

const button = {
  display: "inline-block",
  border: "none",
  borderRadius: 6,
  padding: "10px 14px",
  background: "#0284c7",
  color: "#fff",
  cursor: "pointer",
  textDecoration: "none"
};

const dangerButton = {
  ...button,
  background: "#dc2626",
  marginRight: 10
};

const successButton = {
  ...button,
  background: "#16a34a"
};

export default Settings;
