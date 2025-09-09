// AI-Assisted: TCP client for Aetheric Engine
require("dotenv").config();
const net = require("net");

const SERVER_IP = process.env.SERVER_IP;
const SERVER_PORT = parseInt(process.env.SERVER_PORT, 10);
const AUTH_TOKEN = process.env.AUTH_TOKEN;

// Create TCP client
const client = new net.Socket();

client.connect(SERVER_PORT, SERVER_IP, () => {
  console.log(`Connected to AE at ${SERVER_IP}:${SERVER_PORT}`);
  // Send authentication
  client.write(`AUTH ${AUTH_TOKEN}\n`);
});

client.on("data", (data) => {
  console.log("Received:", data.toString());
  // TODO: Parse and handle AE messages
});

client.on("close", () => {
  console.log("Connection closed");
});

client.on("error", (err) => {
  console.error("TCP Error:", err);
});
