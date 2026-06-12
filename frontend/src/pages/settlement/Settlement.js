function Settlement() {
  const rows = [
    { user: "master_demo", type: "Receive", amount: "₹ 24,000", status: "Pending" },
    { user: "agent_mumbai", type: "Pay", amount: "₹ 8,500", status: "Clear" },
    { user: "client_101", type: "Receive", amount: "₹ 2,250", status: "Pending" }
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Settlement</h2>
          <div className="muted">Track payable and receivable balances.</div>
        </div>
        <button className="btn">Settle Selected</button>
      </div>

      <div className="grid">
        <div className="stat-card"><h3>Total Receivable</h3><strong>₹ 26,250</strong></div>
        <div className="stat-card"><h3>Total Payable</h3><strong>₹ 8,500</strong></div>
        <div className="stat-card"><h3>Net Balance</h3><strong>₹ 17,750</strong></div>
      </div>

      <div className="panel">
        <table className="table">
          <thead>
            <tr><th>User</th><th>Type</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.user}>
                <td>{row.user}</td>
                <td>{row.type}</td>
                <td>{row.amount}</td>
                <td><span className="badge">{row.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Settlement;
