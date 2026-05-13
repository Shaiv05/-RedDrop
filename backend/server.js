const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const donorRoutes = require("./routes/donors");
const hospitalRoutes = require("./routes/hospitals");
const requestRoutes = require("./routes/requests");
const contactRoutes = require("./routes/contact");
const dashboardRoutes = require("./routes/dashboard");
const userDashboardRoutes = require("./routes/userDashboard");
const errorHandler = require("./middleware/errorHandler");
const { upsertSampleData } = require("./services/seedService");

dotenv.config({ path: path.resolve(__dirname, ".env") });

const app = express();

const configuredOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...configuredOrigins,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "15mb" }));

app.get("/", (req, res) => {
  res.json({ message: "Blood Connect Hub API running" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", authRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/donors", donorRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/user-dashboard", userDashboardRoutes);

app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5002;

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing in environment variables");
    }

    await connectDB();
    const { donorCount, hospitalCount, requestCount } = await upsertSampleData();
    console.log(`Sample data synced: ${donorCount} donors, ${hospitalCount} hospitals, ${requestCount} requests`);
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    server.on("error", (listenError) => {
      if (listenError?.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Stop the existing process or change PORT in backend/.env.`);
        process.exit(1);
      }
      console.error("Server failed to start:", listenError.message);
      process.exit(1);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
