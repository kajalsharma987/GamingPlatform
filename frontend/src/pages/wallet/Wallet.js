import { useCallback, useEffect, useMemo, useState } from "react";
import { api, getCurrentUser } from "../../utils/api";

function Wallet() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("deposit");
  const [message, setMessage] = useState("");
  const [requests, setRequests] = useState([]);
  const currentUser = getCurrentUser();

  const loadUsers = useCallback(() => {
    api("/users")
      .then((data) => setUsers(Array.isArray(data) ? data.filter((u) => u.id !== currentUser?.id) : []))
      .catch(() => setUsers([]));
  }, [currentUser?.id]);

  const loadRequests = useCallback(() => {
    api("/wallet-requests")
      .then((data) => setRequests(Array.isArray(data) ? data : []))
      .catch(() => setRequests([]));
  }, []);

  useEffect(() => {
    loadUsers();
    loadRequests();
  }, [loadUsers, loadRequests]);

  const selected = useMemo(
    () => users.find((item) => String(item.id) === String(selectedUser)),
    [selectedUser, users]
  );
  const selectedIsSuperAdmin = selected?.role === "super_admin";

  const submitWallet = async () => {
    if (!selectedUser || !amount) {
      setMessage("Select user and amount.");
      return;
    }

    try {
      const data = await api("/wallet", {
        method: "POST",
        body: JSON.stringify({
          userId: selectedUser,
          amount: Number(amount),
          type
        })
      });
      setMessage(data.message || "Wallet updated successfully.");
      setAmount("");
      loadUsers();
      loadRequests();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleRequest = async (requestId, action) => {
    try {
      const data = await api(`/wallet-requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ action })
      });
      setMessage(data.message || "Request updated.");
      loadUsers();
      loadRequests();
    } catch (err) {
      setMessage(err.message);
    }
  };

  if (currentUser?.role === "client") {
    const submitRequest = async () => {
      const value = Number(amount);
      if (!value || value <= 0) {
        setMessage("Enter coin amount.");
        return;
      }
      if (type === "withdraw" && Number(currentUser?.wallet || 0) < value) {
        setMessage("Insufficient balance for withdraw request.");
        return;
      }

      try {
        const data = await api("/wallet-requests", {
          method: "POST",
          body: JSON.stringify({ type, amount: value })
        });
        setMessage(data.message || "Request sent.");
        setAmount("");
        loadRequests();
      } catch (err) {
        setMessage(err.message);
      }
    };

    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h2 className="page-title">Coin Wallet</h2>
            <div className="muted">Send deposit or withdraw requests to your panel.</div>
          </div>
          <span className="badge">User Portal</span>
        </div>
        <div className="grid">
          <div className="stat-card"><h3>Current Balance</h3><strong>Rs. {Number(currentUser?.wallet || 0).toLocaleString()}</strong></div>
          <div className="stat-card"><h3>Pending Requests</h3><strong>{requests.filter((request) => request.status === "pending").length}</strong></div>
        </div>
        <div className="panel" style={{ maxWidth: 480 }}>
          <div style={formGrid}>
            <select className="form-control" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="deposit">Deposit Coins</option>
              <option value="withdraw">Withdraw Coins</option>
            </select>
            <input className="form-control" placeholder="Coin amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <button className={`btn ${type === "withdraw" ? "danger" : "success"}`} onClick={submitRequest}>
              {type === "withdraw" ? "Request Withdraw" : "Request Deposit"}
            </button>
            {message && <div className="muted">{message}</div>}
          </div>
        </div>
        <div className="panel">
          <h2 className="page-title" style={{ marginBottom: 14 }}>My Coin Requests</h2>
          <table className="table">
            <thead>
              <tr><th>ID</th><th>Type</th><th>Amount</th><th>Status</th><th>Handled By</th><th>Date</th></tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.id}</td>
                  <td>{request.type}</td>
                  <td>Rs. {Number(request.amount || 0).toLocaleString()}</td>
                  <td><span className="badge">{request.status}</span></td>
                  <td>{request.handled_by_name || "-"}</td>
                  <td>{new Date(request.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Deposit / Withdraw</h2>
          <div className="muted">Super admin, master and agent can manage scoped user coins.</div>
        </div>
        <span className="badge">{users.length} scoped users</span>
      </div>

      <div className="split-grid">
        <div className="panel">
          <table className="table">
            <thead>
              <tr><th>User</th><th>Role</th><th>Parent</th><th>Wallet</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} onClick={() => setSelectedUser(u.id)} style={{ cursor: "pointer" }}>
                  <td><strong>{u.username}</strong></td>
                  <td>{u.role}</td>
                  <td>{u.parent_name || "-"}</td>
                  <td>Rs. {Number(u.wallet || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2 className="page-title" style={{ marginBottom: 14 }}>Wallet Entry</h2>
          <div style={formGrid}>
            <select className="form-control" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
              <option value="">Select User</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.username} ({u.role})</option>)}
            </select>
            {selected && <div className="muted">Current wallet: Rs. {Number(selected.wallet || 0).toLocaleString()}</div>}
            {selectedIsSuperAdmin ? (
              <div className="muted">SUPER_ADMIN is the root bank and cannot receive wallet entries.</div>
            ) : (
              <>
                <select className="form-control" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="deposit">Deposit</option>
                  <option value="withdraw">Withdraw</option>
                </select>
                <input className="form-control" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <button className={`btn ${type === "withdraw" ? "danger" : "success"}`} onClick={submitWallet}>
                  {type === "withdraw" ? "Withdraw" : "Deposit"}
                </button>
              </>
            )}
            {message && <div className="muted">{message}</div>}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="page-header" style={{ marginBottom: 14 }}>
          <h2 className="page-title">User Coin Requests</h2>
          <span className="badge">{requests.filter((request) => request.status === "pending").length} pending</span>
        </div>
        <table className="table">
          <thead>
            <tr><th>ID</th><th>User</th><th>Parent</th><th>Wallet</th><th>Type</th><th>Amount</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td>{request.id}</td>
                <td><strong>{request.username}</strong></td>
                <td>{request.parent_name || "-"}</td>
                <td>Rs. {Number(request.wallet || 0).toLocaleString()}</td>
                <td>{request.type}</td>
                <td>Rs. {Number(request.amount || 0).toLocaleString()}</td>
                <td><span className="badge">{request.status}</span></td>
                <td>
                  {request.status === "pending" ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn success" onClick={() => handleRequest(request.id, "approve")}>Approve</button>
                      <button className="btn danger" onClick={() => handleRequest(request.id, "reject")}>Reject</button>
                    </div>
                  ) : (
                    <span className="muted">{request.handled_by_name || "Handled"}</span>
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

const formGrid = {
  display: "grid",
  gap: 12
};

export default Wallet;
