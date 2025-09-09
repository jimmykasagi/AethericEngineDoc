#!/usr/bin/env node
// AI-Assisted: Command-line interface for Aetheric Engine client

const DatabaseManager = require("./database");
const AethericEngineClient = require("./server");

async function showStats() {
  const db = new DatabaseManager();
  try {
    await db.initialize();

    const totalMessages = await db.getTotalMessageCount();
    const asciiCount = await db.getAsciiMessageCount();
    const binaryCount = await db.getBinaryMessageCount();

    console.log("\n📊 Aetheric Engine Database Statistics:");
    console.log("=====================================");
    console.log(`Total Messages: ${totalMessages}`);
    console.log(`ASCII Messages: ${asciiCount}`);
    console.log(`Binary Messages: ${binaryCount}`);
    console.log("=====================================\n");

    if (totalMessages > 0) {
      const asciiMessages = await db.getAllAsciiMessages();
      const binaryMessages = await db.getAllBinaryMessages();

      if (asciiMessages.length > 0) {
        console.log("📝 Latest ASCII Messages:");
        asciiMessages.slice(-3).forEach((msg, i) => {
          console.log(
            `  ${asciiMessages.length - 2 + i}: "${msg.payload}" (${
              msg.timestamp
            })`
          );
        });
        console.log();
      }

      if (binaryMessages.length > 0) {
        console.log("🔢 Latest Binary Messages:");
        binaryMessages.slice(-3).forEach((msg, i) => {
          const hex =
            msg.payload.toString("hex").substring(0, 16) +
            (msg.payload.length > 8 ? "..." : "");
          console.log(
            `  ${binaryMessages.length - 2 + i}: ${msg.size} bytes, ${hex} (${
              msg.timestamp
            })`
          );
        });
        console.log();
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await db.close();
  }
}

async function clearDatabase() {
  const db = new DatabaseManager();
  try {
    await db.initialize();

    // Since we don't have a clear method, we'll recreate the tables
    console.log("🗑️  Clearing database...");

    // This is a simple approach - in production you'd want a proper clear method
    const sqlite3 = require("sqlite3").verbose();
    const dbInstance = db.db;

    await new Promise((resolve, reject) => {
      dbInstance.run("DELETE FROM msgascii", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      dbInstance.run("DELETE FROM msgbinary", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log("✅ Database cleared successfully");
  } catch (error) {
    console.error("Error clearing database:", error.message);
  } finally {
    await db.close();
  }
}

function printHelp() {
  console.log(`
🔧 Aetheric Engine CLI Tool

Usage: node cli.js [command]

Commands:
  stats     Show database statistics and recent messages
  clear     Clear all messages from database
  help      Show this help message
  start     Start the server (same as npm start)
  validate  Run validation (same as npm run validate)

Examples:
  node cli.js stats
  node cli.js clear
  node cli.js start

Environment Variables (from .env):
  SERVER_IP    = AE server IP address
  SERVER_PORT  = AE server port
  AUTH_TOKEN   = JWT authentication token

Files:
  server.js    = Main TCP client with WebSocket server
  validator.js = Independent validation application
  index.html   = Web monitoring interface
`);
}

async function startServer() {
  console.log("🚀 Starting Aetheric Engine Client...");
  const client = new AethericEngineClient();
  await client.initialize();
}

async function runValidator() {
  console.log("🔍 Running validation...");
  const { spawn } = require("child_process");

  const validator = spawn("node", ["validator.js"], {
    stdio: "inherit",
  });

  validator.on("close", (code) => {
    console.log(`Validator finished with code ${code}`);
  });
}

async function main() {
  const command = process.argv[2] || "help";

  switch (command.toLowerCase()) {
    case "stats":
    case "status":
      await showStats();
      break;

    case "clear":
      await clearDatabase();
      break;

    case "start":
      await startServer();
      break;

    case "validate":
    case "val":
      await runValidator();
      break;

    case "help":
    case "-h":
    case "--help":
    default:
      printHelp();
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { showStats, clearDatabase };
