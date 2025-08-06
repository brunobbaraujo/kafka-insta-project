import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createTable } from "./models/Post.js";
import kafkaProducer from "./config/kafka.js";
import postRoutes from "./routes/posts.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "post-service",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/posts", postRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// Initialize database and Kafka
async function initialize() {
  try {
    // Create database tables
    console.log("Creating database tables...");
    await createTable();
    console.log("Database tables created successfully");

    // Connect to Kafka and create topics
    console.log("Connecting to Kafka...");
    await kafkaProducer.connect();
    await kafkaProducer.createTopics();
    console.log("Kafka initialized successfully");
  } catch (error) {
    console.error("Initialization error:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await kafkaProducer.disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  await kafkaProducer.disconnect();
  process.exit(0);
});

// Start server
async function startServer() {
  await initialize();

  app.listen(PORT, () => {
    console.log(`Post Service running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
