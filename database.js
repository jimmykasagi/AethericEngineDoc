// AI-Assisted: Database utilities for Aetheric Engine message storage

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

class DatabaseManager {
  constructor(dbPath = "./aetheric_messages.db") {
    this.dbPath = dbPath;
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log("Connected to SQLite database:", this.dbPath);
        this.createTables().then(resolve).catch(reject);
      });
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      const createAsciiTable = `
        CREATE TABLE IF NOT EXISTS msgascii (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          payload TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createBinaryTable = `
        CREATE TABLE IF NOT EXISTS msgbinary (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          payload BLOB NOT NULL,
          size INTEGER NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      this.db.serialize(() => {
        this.db.run(createAsciiTable, (err) => {
          if (err) {
            reject(err);
            return;
          }
          console.log("Created/verified msgascii table");
        });

        this.db.run(createBinaryTable, (err) => {
          if (err) {
            reject(err);
            return;
          }
          console.log("Created/verified msgbinary table");
          resolve();
        });
      });
    });
  }

  async insertAsciiMessage(payload) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare("INSERT INTO msgascii (payload) VALUES (?)");
      stmt.run([payload], function (err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.lastID);
      });
      stmt.finalize();
    });
  }

  async insertBinaryMessage(payload, size) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(
        "INSERT INTO msgbinary (payload, size) VALUES (?, ?)"
      );
      stmt.run([payload, size], function (err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.lastID);
      });
      stmt.finalize();
    });
  }

  async getAsciiMessageCount() {
    return new Promise((resolve, reject) => {
      this.db.get("SELECT COUNT(*) as count FROM msgascii", (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row.count);
      });
    });
  }

  async getBinaryMessageCount() {
    return new Promise((resolve, reject) => {
      this.db.get("SELECT COUNT(*) as count FROM msgbinary", (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row.count);
      });
    });
  }

  async getTotalMessageCount() {
    const [asciiCount, binaryCount] = await Promise.all([
      this.getAsciiMessageCount(),
      this.getBinaryMessageCount(),
    ]);
    return asciiCount + binaryCount;
  }

  async getAllAsciiMessages() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM msgascii ORDER BY timestamp", (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  async getAllBinaryMessages() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM msgbinary ORDER BY timestamp", (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          console.log("Database connection closed");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = DatabaseManager;
