require("dotenv").config();

const http = require("http");
const express = require("express");
const settlementRoutes =
require("./routes/settlementRoutes");
const cors = require("cors");
const helmet = require("helmet");
const multer = require("multer");
const ensureSchema = require("./initDb");
const { initSockets } = require("./sockets");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use(
  "/api/v1/settlement",
  settlementRoutes
);

app.use("/", require("./routes/authRoutes"));
app.use("/wallet", require("./routes/walletRoutes"));
app.use("/games", require("./routes/gameRoutes"));

ensureSchema();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, `${req.params.name}.png`);
  }
});

const upload = multer({ storage });

app.post(
  "/upload-logo",
  (req, res, next) => {
    req.params.name = "logo";
    next();
  },
  upload.single("logo"),
  (req, res) => {
    res.json({ message: "Logo uploaded", path: "/uploads/logo.png" });
  }
);

app.post("/upload-icon/:name", upload.single("icon"), (req, res) => {
  res.json({
    message: "Image uploaded",
    path: `/uploads/${req.params.name}.png`
  });
});

app.use((err, req, res, next) => {
  console.log("API Error:", err.message);
  res.status(err.statusCode || 500).json({ message: err.message || "Server error" });
});

const path = require("path");

// Frontend serve karo
app.use(express.static(path.join(__dirname, "../frontend/build")));

// API routes ke baad, error handler se pehle ye daal
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/build/index.html"));
});

initSockets(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
