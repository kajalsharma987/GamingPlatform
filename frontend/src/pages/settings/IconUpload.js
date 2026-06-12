import { useState } from "react";

const API_URL = "http://localhost:5000";
const imageOptions = ["live", "settelment", "logo"];

function IconUpload() {
  const [file, setFile] = useState(null);
  const [name, setName] = useState("live");
  const [preview, setPreview] = useState(`${API_URL}/uploads/live.png`);
  const [message, setMessage] = useState("");

  const cleanName = name.trim().replace(/[^a-zA-Z0-9_-]/g, "");

  const upload = async () => {
    if (!cleanName) {
      setMessage("Please enter image name.");
      return;
    }

    if (!file) {
      setMessage("Please select an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("icon", file);

    const res = await fetch(`${API_URL}/upload-icon/${cleanName}`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      setMessage("Upload failed. Please check backend server.");
      return;
    }

    const version = Date.now();
    if (cleanName === "logo") {
      localStorage.setItem("logoVersion", version.toString());
      window.dispatchEvent(new Event("logo-updated"));
    }
    setPreview(`${API_URL}/uploads/${cleanName}.png?v=${version}`);
    setMessage(`${cleanName}.png updated successfully.`);
  };

  const selectName = (value) => {
    setName(value);
    setFile(null);
    setMessage("");
    setPreview(`${API_URL}/uploads/${value}.png?v=${Date.now()}`);
  };

  return (
    <div style={wrap}>
      <h2>Manual Image Upload</h2>

      <div style={card}>
        <label style={label}>Select Existing Image</label>
        <select value={name} onChange={(e) => selectName(e.target.value)} style={input}>
          {imageOptions.map((option) => (
            <option key={option} value={option}>{option}.png</option>
          ))}
        </select>

        <label style={label}>Or Type Image Name</label>
        <input
          value={name}
          placeholder="logo / live / settelment"
          onChange={(e) => {
            setName(e.target.value);
            setMessage("");
          }}
          style={input}
        />

        <img src={preview} alt="Selected upload preview" style={previewStyle} />

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

        <button onClick={upload} style={button}>Upload Image</button>

        {message && <p style={note}>{message}</p>}
      </div>
    </div>
  );
}

const wrap = {
  maxWidth: 560
};

const card = {
  marginTop: 20,
  padding: 20,
  background: "#fff",
  color: "#0f172a",
  borderRadius: 8,
  display: "grid",
  gap: 12
};

const label = {
  fontWeight: 700
};

const input = {
  padding: "10px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: 6
};

const previewStyle = {
  width: 140,
  height: 90,
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

export default IconUpload;
