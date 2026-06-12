function Reports() {
  const rows = [
    { name: "Match Profit Loss", value: "₹ 18,200", status: "Ready" },
    { name: "User Exposure", value: "₹ 42,800", status: "Updated" },
    { name: "Commission Report", value: "₹ 5,420", status: "Ready" }
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Reports</h2>
        <button className="btn">Export</button>
      </div>
      <div className="panel">
        <table className="table">
          <thead>
            <tr><th>Report</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}><td>{row.name}</td><td>{row.value}</td><td><span className="badge">{row.status}</span></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Reports;
