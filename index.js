// AI-Assisted: TCP client for Aetheric Engine
require("dotenv").config();
const net = require("net");
const { processAsciiLine } = require("./utils.js");

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
  // Check if data is ASCII (printable characters, delimited by $ and ;) or binary (header 0xAA)
  if (data[0] === 0xaa) {
    console.log("Received binary message");
  } else {
    // Simple ASCII check: all bytes are printable or whitespace
    const ascii = data.toString("ascii");
    const isAscii = /^[\x20-\x7E\r\n\t$;]+$/.test(ascii);
    if (isAscii) {
      console.log("Received ASCII message");
      processAsciiLine(data.toString("utf8"));
      //   console.log(data.toString("utf8"));
    } else {
      console.log("Received unknown message type");
    }
  }
});

client.on("close", () => {
  console.log("Connection closed");
});

client.on("error", (err) => {
  console.error("TCP Error:", err);
});
