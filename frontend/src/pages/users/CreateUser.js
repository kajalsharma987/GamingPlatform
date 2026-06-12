import { useMemo, useState } from "react";
import { api, getCurrentUser } from "../../utils/api";

function CreateUser() {
  const user = getCurrentUser();
  const roles = useMemo(() => {
    if (user?.role === "super_admin") return ["master"];
    if (user?.role === "master") return ["agent"];
    if (user?.role === "agent") return ["client"];
    return [];
  }, [user?.role]);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(roles[0] || "client");
  const [commission, setCommission] = useState("0");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleCreate = async () => {
    if (!roles.length) {
      setMessage("Client cannot create users.");
      return;
    }
    if (!username || !password) {
      setMessage("Fill all fields.");
      return;
    }

    try {
      const data = await api("/create-user", {
        method: "POST",
        body: JSON.stringify({ username, email, phone, password, role, commission: Number(commission) })
      });
      setMessage(data.message || "User created successfully.");
      setUsername("");
      setEmail("");
      setPhone("");
      setPassword("");
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Create User</h2>
          <div className="muted">
            {user?.role === "master" && "Master can create only dealers."}
            {user?.role === "agent" && "Dealer can create only clients."}
            {user?.role === "super_admin" && "Super admin can create only masters. Only one super admin is allowed."}
          </div>
        </div>
        <span className="badge">{role}</span>
      </div>

      <div className="panel" style={{ maxWidth: 560 }}>
        <div style={formGrid}>
          <input className="form-control" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input className="form-control" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="form-control" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div className="input-action">
            <input className="form-control" type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="btn secondary" type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button>
          </div>
          <select className="form-control" value={role} onChange={(e) => setRole(e.target.value)} disabled={!roles.length}>
            {roles.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input className="form-control" placeholder="Commission %" value={commission} onChange={(e) => setCommission(e.target.value)} />
          <button className="btn" onClick={handleCreate} disabled={!roles.length}>Create User</button>
          {message && <div className="muted">{message}</div>}
        </div>
      </div>
    </div>
  );
}

const formGrid = {
  display: "grid",
  gap: 12
};

export default CreateUser;
