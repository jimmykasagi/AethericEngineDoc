#!/usr/bin/env node

/**
 * Binary Header Checker
 * AI-Assisted
 *
 * Quick check for 0xBB headers in binary messages
 */

const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("aetheric_messages.db");

console.log("🔍 Checking for 0xBB binary message headers...");

db.all("SELECT rowid, payload FROM msgbinary", (err, rows) => {
  if (err) {
    console.error(err);
    return;
  }

  let bbCount = 0;
  let aaCount = 0;
  let otherHeaders = {};

  rows.forEach((row) => {
    const bytes = Buffer.isBuffer(row.payload)
      ? Array.from(row.payload)
      : Array.from(new Uint8Array(row.payload));

    if (bytes.length > 0) {
      const header = bytes[0];

      if (header === 0xbb) {
        bbCount++;
        console.log(`🚨 Found 0xBB header in row ${row.rowid}!`);
        console.log(
          `   First 10 bytes: ${bytes
            .slice(0, 10)
            .map((b) => "0x" + b.toString(16).padStart(2, "0"))
            .join(" ")}`
        );
      } else if (header === 0xaa) {
        aaCount++;
      } else {
        const headerStr = "0x" + header.toString(16).padStart(2, "0");
        otherHeaders[headerStr] = (otherHeaders[headerStr] || 0) + 1;
      }
    }
  });

  console.log("\n📊 Header Distribution:");
  console.log(`   0xAA headers: ${aaCount}`);
  console.log(`   0xBB headers: ${bbCount}`);

  if (bbCount === 0) {
    console.log("   ❌ No 0xBB headers found");

    // Show most common other headers
    console.log("\n   Most common other headers:");
    Object.entries(otherHeaders)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([header, count]) => {
        console.log(`     ${header}: ${count} messages`);
      });
  }

  db.close();
});
