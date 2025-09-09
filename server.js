// AI-Assisted: Node.js TCP client + WebSocket bridge for Aetheric Engine
const net = require("net");
const WebSocket = require("ws");
const http = require("http");
require("dotenv").config();

// Read AE credentials from .env
const SERVER_IP = process.env.SERVER_IP || "127.0.0.1";
const SERVER_PORT = parseInt(process.env.SERVER_PORT, 10) || 12345;
const AUTH_TOKEN = process.env.AUTH_TOKEN || "YOUR_AUTH_TOKEN";

let tcpClient = null;
let wsClients = [];
let collecting = false;
let messageCount = 0;

const server = http.createServer();
const wss = new WebSocket.Server({ server });

function broadcast(type, data) {
  wsClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data }));
    }
  });
}

function parseAscii(buffer) {
  // ASCII message: starts with '$', ends with ';'
  const str = buffer.toString("ascii");
  const start = str.indexOf("$");
  const end = str.indexOf(";", start);
  if (start !== -1 && end !== -1 && end > start) {
    return str.substring(start + 1, end);
  }
  return null;
}

function parseBinary(buffer) {
  // Binary message: header 0xAA, 5-byte payload size, variable payload
  if (buffer[0] === 0xaa && buffer.length >= 6) {
    const size = buffer.readUIntBE(1, 5);
    if (buffer.length >= 6 + size) {
      return buffer.slice(6, 6 + size);
    }
  }
  return null;
}

function startTcpConnection() {
  if (tcpClient) return;
  tcpClient = new net.Socket();
  tcpClient.connect(SERVER_PORT, SERVER_IP, () => {
    tcpClient.write(`AUTH ${AUTH_TOKEN}`);
    collecting = true;
    messageCount = 0;
    broadcast("status", "Connected to AE");
  });

  let buffer = Buffer.alloc(0);

  tcpClient.on("data", (data) => {
    buffer = Buffer.concat([buffer, data]);
    // Try to parse ASCII
    let asciiPayload = parseAscii(buffer);
    if (asciiPayload) {
      broadcast("ascii", {
        raw: buffer.toString("ascii"),
        payload: asciiPayload,
      });
      buffer = Buffer.from(buffer.toString("ascii").replace(/\$.*?;/, ""));
      messageCount++;
    }
    // Try to parse binary
    if (buffer.length >= 6 && buffer[0] === 0xaa) {
      const size = buffer.readUIntBE(1, 5);
      if (buffer.length >= 6 + size) {
        const payload = parseBinary(buffer);
        if (payload) {
          broadcast("binary", {
            raw: buffer.slice(0, 6 + size).toString("hex"),
            payload: payload.toString("hex"),
          });
          buffer = buffer.slice(6 + size);
          messageCount++;
        }
      }
    }
    // Stop after 600 messages
    if (messageCount >= 600 && collecting) {
      collecting = false;
      tcpClient.write("STATUS");
      broadcast("status", "Collected 600 messages, sent STATUS");
    }
  });

  tcpClient.on("close", () => {
    broadcast("status", "Disconnected from AE");
    tcpClient = null;
  });

  tcpClient.on("error", (err) => {
    broadcast("status", `TCP Error: ${err.message}`);
  });
}

function stopTcpConnection() {
  if (tcpClient) {
    tcpClient.end();
    tcpClient = null;
    broadcast("status", "TCP connection stopped");
  }
}

function resetTcpConnection() {
  stopTcpConnection();
  messageCount = 0;
  broadcast("reset", "Reset state");
}

wss.on("connection", (ws) => {
  wsClients.push(ws);
  ws.on("message", (msg) => {
    const { action } = JSON.parse(msg);
    if (action === "start") startTcpConnection();
    if (action === "stop") stopTcpConnection();
    if (action === "reset") resetTcpConnection();
  });
  ws.on("close", () => {
    wsClients = wsClients.filter((c) => c !== ws);
  });
});

server.listen(8080, () => {
  console.log("WebSocket server running on ws://localhost:8080");
});
