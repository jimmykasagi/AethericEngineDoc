// AI-Assisted: Main server with TCP client and WebSocket bridge for Aetheric Engine

const net = require("net");
const WebSocket = require("ws");
const http = require("http");
require("dotenv").config();

const DatabaseManager = require("./database");
const { MessageParser } = require("./utils");

// Read AE credentials from .env
const SERVER_IP = process.env.SERVER_IP || "127.0.0.1";
const SERVER_PORT = parseInt(process.env.SERVER_PORT, 10) || 8080;
const AUTH_TOKEN = process.env.AUTH_TOKEN || "YOUR_AUTH_TOKEN";
const WS_PORT = 8081; // WebSocket server port

class AethericEngineClient {
  constructor() {
    this.tcpClient = null;
    this.wsClients = [];
    this.db = new DatabaseManager();
    this.parser = new MessageParser();
    this.collecting = false;
    this.targetMessageCount = 1000;
    this.isConnected = false;

    // Statistics
    this.stats = {
      totalMessages: 0,
      asciiMessages: 0,
      binaryMessages: 0,
      startTime: null,
      errors: 0,
    };
  }

  async initialize() {
    try {
      await this.db.initialize();
      this.setupWebSocketServer();
      console.log("AethericEngineClient initialized successfully");
    } catch (error) {
      console.error("Failed to initialize:", error);
      throw error;
    }
  }

  setupWebSocketServer() {
    const server = http.createServer();
    const wss = new WebSocket.Server({ server });

    wss.on("connection", (ws) => {
      this.wsClients.push(ws);
      console.log("WebSocket client connected");

      // Send current status to new client
      this.broadcast("status", {
        connected: this.isConnected,
        collecting: this.collecting,
        stats: this.stats,
      });

      ws.on("message", async (msg) => {
        try {
          const { action, data } = JSON.parse(msg);
          await this.handleWebSocketMessage(action, data);
        } catch (error) {
          console.error("WebSocket message error:", error);
          ws.send(
            JSON.stringify({
              type: "error",
              data: `Invalid message: ${error.message}`,
            })
          );
        }
      });

      ws.on("close", () => {
        this.wsClients = this.wsClients.filter((client) => client !== ws);
        console.log("WebSocket client disconnected");
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    });

    server.listen(WS_PORT, () => {
      console.log(`WebSocket server running on ws://localhost:${WS_PORT}`);
    });
  }

  async handleWebSocketMessage(action, data) {
    switch (action) {
      case "start":
        await this.startTcpConnection();
        break;
      case "stop":
        await this.stopTcpConnection();
        break;
      case "reset":
        await this.resetConnection();
        break;
      case "getStats":
        await this.sendStatistics();
        break;
      default:
        this.broadcast("error", `Unknown action: ${action}`);
    }
  }

  broadcast(type, data) {
    const message = JSON.stringify({
      type,
      data,
      timestamp: new Date().toISOString(),
    });
    this.wsClients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
        } catch (error) {
          console.error("Broadcast error:", error);
        }
      }
    });
  }

  async startTcpConnection() {
    if (this.tcpClient) {
      this.broadcast("error", "TCP connection already active");
      return;
    }

    try {
      this.tcpClient = new net.Socket();
      this.parser.reset();
      this.collecting = true;
      this.stats.startTime = new Date();
      this.stats.totalMessages = 0;
      this.stats.asciiMessages = 0;
      this.stats.binaryMessages = 0;
      this.stats.errors = 0;

      this.tcpClient.connect(SERVER_PORT, SERVER_IP, () => {
        this.isConnected = true;
        console.log(`Connected to AE server at ${SERVER_IP}:${SERVER_PORT}`);

        // Send authentication
        this.tcpClient.write(`AUTH ${AUTH_TOKEN}`);
        this.broadcast("status", {
          connected: true,
          collecting: true,
          message: "Connected to AE and authenticated",
        });
      });

      this.tcpClient.on("data", async (data) => {
        try {
          await this.handleTcpData(data);
        } catch (error) {
          console.error("Data handling error:", error);
          this.stats.errors++;
          this.broadcast("error", `Data processing error: ${error.message}`);
        }
      });

      this.tcpClient.on("close", () => {
        this.isConnected = false;
        this.collecting = false;
        console.log("TCP connection closed");
        this.broadcast("status", {
          connected: false,
          collecting: false,
          message: "Disconnected from AE",
        });
        this.tcpClient = null;
      });

      this.tcpClient.on("error", (error) => {
        this.isConnected = false;
        this.collecting = false;
        console.error("TCP connection error:", error);
        this.stats.errors++;
        this.broadcast("error", `TCP Error: ${error.message}`);
        this.tcpClient = null;
      });
    } catch (error) {
      console.error("Failed to start TCP connection:", error);
      this.broadcast("error", `Connection failed: ${error.message}`);
    }
  }

  async handleTcpData(data) {
    this.parser.addData(data);
    const messages = this.parser.parseMessages();

    for (const message of messages) {
      await this.processMessage(message);
    }

    // Check if we've collected enough messages
    if (
      this.collecting &&
      this.stats.totalMessages >= this.targetMessageCount
    ) {
      console.log(
        `Collected ${this.targetMessageCount} messages, sending STATUS`
      );
      this.collecting = false;
      this.tcpClient.write("STATUS");
      this.broadcast("status", {
        collecting: false,
        message: `Collected ${this.targetMessageCount} messages, sent STATUS command`,
      });
    }
  }

  async processMessage(message) {
    try {
      if (message.type === "ascii") {
        await this.db.insertAsciiMessage(message.payload);
        this.stats.asciiMessages++;
        this.broadcast("ascii", {
          raw: message.raw,
          payload: message.payload,
          count: this.stats.asciiMessages,
        });
      } else if (message.type === "binary") {
        await this.db.insertBinaryMessage(message.payload, message.size);
        this.stats.binaryMessages++;
        this.broadcast("binary", {
          headerHex: message.headerHex,
          size: message.size,
          payloadHex: message.payload.toString("hex"),
          count: this.stats.binaryMessages,
        });
      }

      this.stats.totalMessages++;

      // Send periodic updates
      if (this.stats.totalMessages % 50 === 0) {
        await this.sendStatistics();
      }
    } catch (error) {
      console.error("Message processing error:", error);
      this.stats.errors++;
      this.broadcast("error", `Failed to store message: ${error.message}`);
    }
  }

  async sendStatistics() {
    try {
      const dbStats = {
        totalInDb: await this.db.getTotalMessageCount(),
        asciiInDb: await this.db.getAsciiMessageCount(),
        binaryInDb: await this.db.getBinaryMessageCount(),
      };

      const stats = {
        ...this.stats,
        ...dbStats,
        parserBufferLength: this.parser.getBufferLength(),
        collecting: this.collecting,
        connected: this.isConnected,
      };

      this.broadcast("statistics", stats);
    } catch (error) {
      console.error("Statistics error:", error);
    }
  }

  async stopTcpConnection() {
    if (this.tcpClient) {
      this.collecting = false;
      // Drain the TCP pipe before disconnecting
      if (this.tcpClient.writableLength > 0) {
        this.tcpClient.once("drain", () => {
          this.tcpClient.end();
          this.broadcast("status", {
            collecting: false,
            message: "TCP connection stopped (drained)",
          });
        });
      } else {
        this.tcpClient.end();
        this.broadcast("status", {
          collecting: false,
          message: "TCP connection stopped",
        });
      }
    }
  }

  async resetConnection() {
    await this.stopTcpConnection();
    this.parser.reset();
    this.stats = {
      totalMessages: 0,
      asciiMessages: 0,
      binaryMessages: 0,
      startTime: null,
      errors: 0,
    };
    this.broadcast("reset", "Connection and statistics reset");
  }

  async shutdown() {
    console.log("Shutting down...");
    await this.stopTcpConnection();
    await this.db.close();
    process.exit(0);
  }
}

// Initialize and start the application
async function main() {
  const client = new AethericEngineClient();

  try {
    await client.initialize();

    // Graceful shutdown handlers
    process.on("SIGINT", () => client.shutdown());
    process.on("SIGTERM", () => client.shutdown());

    console.log("Aetheric Engine Client is ready!");
    console.log(`WebSocket interface: ws://localhost:${WS_PORT}`);
    console.log(
      "Send WebSocket messages with actions: start, stop, reset, getStats"
    );
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = AethericEngineClient;
