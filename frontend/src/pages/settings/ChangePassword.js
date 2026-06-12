import { useState } from "react";
import { api } from "../../utils/api";

function ChangePassword() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async () => {
    try {
      const data = await api("/change-password", {
        method: "POST",
        body: JSON.stringify({ oldPassword, newPassword })
      });
      setMessage(data.message);
      setOldPassword("");
      setNewPassword("");
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Change Password</h2>
        <span className="badge">bcrypt secured</span>
      </div>
      <div className="panel" style={{ maxWidth: 520 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <input className="form-control" type={showPassword ? "text" : "password"} placeholder="Old password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} />
          <div className="input-action">
            <input className="form-control" type={showPassword ? "text" : "password"} placeholder="New password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            <button className="btn secondary" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button>
          </div>
          <button className="btn" onClick={submit}>Change Password</button>
          {message && <div className="muted">{message}</div>}
        </div>
      </div>
    </div>
  );
}

export default ChangePassword;
