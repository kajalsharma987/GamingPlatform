import { useCallback, useEffect, useMemo, useState } from "react";
import { api, getCurrentUser } from "../../utils/api";

function UserList() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("Loading users...");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const user = getCurrentUser();

  const loadUsers = useCallback(() => {
    api("/users")
      .then((data) => {
        setUsers(Array.isArray(data) ? data : []);
        setMessage("");
      })
      .catch((err) => setMessage(err.message));
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const visibleUsers = useMemo(() => users.filter((item) => {
    const matchesSearch = !search || item.username.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || item.role === roleFilter;
    const matchesStatus = !statusFilter || (item.status || "active") === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  }), [roleFilter, search, statusFilter, users]);

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

  const toggleStatus = async (target) => {
    const nextStatus = (target.status || "active") === "active" ? "inactive" : "active";
    try {
      const data = await api(`/users/${target.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      setMessage(data.message);
      loadUsers();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const resetPassword = async (target) => {
    try {
      const data = await api(`/users/${target.id}/reset-password`, { method: "POST", body: JSON.stringify({}) });
      setMessage(`Temporary password for ${target.username}: ${data.temporaryPassword}`);
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">User Records</h2>
          <div className="muted">Passwords are hashed. Use reset to generate a temporary password.</div>
        </div>
        <span className="badge">{visibleUsers.length} users</span>
      </div>

      <div className="panel">
        <div className="filter-row">
          <input className="form-control" placeholder="Search users" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="form-control" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="">All roles</option>
            <option value="master">Master</option>
            <option value="agent">Dealer</option>
            <option value="client">Client</option>
          </select>
          <select className="form-control" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {message && <p className="muted">{message}</p>}
        <table className="table">
          <thead>
            <tr>
              <th>ID</th><th>Username</th><th>Email</th><th>Phone</th><th>Role</th><th>Parent</th><th>Password</th>
              <th>Wallet</th><th>Exposure</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.username}</td>
                <td>{u.email || "-"}</td>
                <td>{u.phone || "-"}</td>
                <td>{u.role === "agent" ? "dealer" : u.role}</td>
                <td>{u.parent_name || "-"}</td>
                <td><span className="badge">Hashed</span></td>
                <td>Rs. {Number(u.wallet || 0).toLocaleString()}</td>
                <td>Rs. {Number(u.exposure_balance || 0).toLocaleString()}</td>
                <td><span className="badge">{u.status || "active"}</span></td>
                <td>
                  {u.id !== user?.id && u.role !== "super_admin" ? (
                    <div className="action-row">
                      <button className="btn secondary" onClick={() => resetPassword(u)}>Reset</button>
                      <button className="btn" onClick={() => toggleStatus(u)}>{(u.status || "active") === "active" ? "Block" : "Unblock"}</button>
                      <button className="btn danger" onClick={() => deleteUser(u)}>Delete</button>
                    </div>
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

export default UserList;
