import { useCallback, useEffect, useState } from "react";
import { api, getCurrentUser } from "../../utils/api";

function RoleUsers({ role, title }) {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("Loading records...");
  const currentUser = getCurrentUser();

  const loadUsers = useCallback(() => {
    api("/users")
      .then((data) => {
        setUsers((Array.isArray(data) ? data : []).filter((user) => user.role === role));
        setMessage("");
      })
      .catch((err) => setMessage(err.message));
  }, [role]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const deleteUser = async (target) => {
    if (!window.confirm(`Delete ${target.username}?`)) return;

    try {
      const data = await api(`/users/${target.id}`, { method: "DELETE" });
      setMessage(data.message || "User deleted successfully.");
      loadUsers();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">{title}</h2>
        <span className="badge">{users.length} records</span>
      </div>
      <div className="panel">
        {message && <p className="muted">{message}</p>}
        <table className="table">
          <thead>
            <tr>
              <th>ID</th><th>Username</th><th>Email</th><th>Phone</th><th>Parent</th>
              <th>Wallet</th><th>Commission</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.email || "-"}</td>
                <td>{user.phone || "-"}</td>
                <td>{user.parent_name || "-"}</td>
                <td>Rs. {Number(user.wallet || 0).toLocaleString()}</td>
                <td>{Number(user.commission || 0)}%</td>
                <td><span className="badge">{user.status || "active"}</span></td>
                <td>
                  {user.id !== currentUser?.id ? (
                    <button className="btn danger" onClick={() => deleteUser(user)}>Delete</button>
                  ) : (
                    <span className="muted">Locked</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RoleUsers;
