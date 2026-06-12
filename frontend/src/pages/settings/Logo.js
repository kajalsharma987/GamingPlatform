import { useState } from "react";

const API_URL = "http://localhost:5000";

function Logo() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(`${API_URL}/uploads/logo.png`);
  const [message, setMessage] = useState("");

  const upload = async () => {
    if (!file) {
      setMessage("Please select a logo image first.");
      return;
    }

    const formData = new FormData();
    formData.append("logo", file);

    const res = await fetch(`${API_URL}/upload-logo`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      setMessage("Logo upload failed. Please check backend server.");
      return;
    }

    const version = Date.now().toString();
    localStorage.setItem("logoVersion", version);
    window.dispatchEvent(new Event("logo-updated"));
    setPreview(`${API_URL}/uploads/logo.png?v=${version}`);
    setMessage("Logo updated successfully.");
  };

  return (
    <div style={wrap}>
      <h2>Change Logo</h2>

      <div style={card}>
        <img src={preview} alt="Current logo" style={previewStyle} />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const selected = e.target.files[0];
            setFile(selected);
            setMessage("");
            if (selected) {
              setPreview(URL.createObjectURL(selected));
            }
          }}
        />

        <button onClick={upload} style={button}>Upload Logo</button>

        {message && <p style={note}>{message}</p>}
      </div>
    </div>
  );
}

const wrap = {
  maxWidth: 520
};

const card = {
  marginTop: 20,
  padding: 20,
  background: "#fff",
  color: "#0f172a",
  borderRadius: 8,
  display: "grid",
  gap: 16
};

const previewStyle = {
  width: 120,
  height: 80,
  objectFit: "contain",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  background: "#f8fafc"
};

const button = {
  width: 130,
  border: "none",
  borderRadius: 6,
  padding: "10px 14px",
  background: "#0284c7",
  color: "#fff",
  cursor: "pointer"
};

const note = {
  margin: 0,
  color: "#334155"
};

export default Logo;
