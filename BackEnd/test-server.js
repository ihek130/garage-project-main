// Test server to debug issues
const express = require("express");
const cors = require("cors");

const app = express();
const Port = 5000;

console.log("Starting server...");

app.use(cors());
app.use(express.json());

console.log("Middleware configured...");

// Test endpoint
app.get("/test", (req, res) => {
  res.json({ message: "Server is working!" });
});

console.log("Routes configured...");

// Start server
app.listen(Port, () => {
  console.log(`✅ Server is running on port ${Port}`);
  console.log(`Test endpoint: http://localhost:${Port}/test`);
});

console.log("Server setup complete, attempting to start...");
