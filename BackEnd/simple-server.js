// Very basic server
console.log("Step 1: Starting...");

const express = require("express");
console.log("Step 2: Express loaded");

const app = express();
console.log("Step 3: App created");

const Port = 5000;
console.log("Step 4: Port set");

app.get("/", (req, res) => {
  res.send("Hello World!");
});
console.log("Step 5: Route added");

app.listen(Port, () => {
  console.log(`✅ Server running on port ${Port}`);
});
console.log("Step 6: Starting listener...");
