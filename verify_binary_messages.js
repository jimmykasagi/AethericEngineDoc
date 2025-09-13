// verify_msgbinary_rows.js
// Script to verify each record in msgbinary table for header, size, and payload structure

const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("aetheric_messages.db");

function verifyRow(row, idx) {
  const buffer = Buffer.from(row.payload);

  if (buffer.length < 6) {
    console.log(`Row ${idx}: Too short (length=${buffer.length})`);
    return;
  }
  const header = buffer[0];

  // Print first 6 bytes for debugging
  const first6Bytes = buffer.slice(0, 6);
  console.log(
    `Row ${idx}: first 6 bytes = ${Array.from(first6Bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ")}`
  );

  // --- Change Applied Here ---
  // Read the 2-byte size field as a big-endian integer.
  // This is the correct way to handle big-endian byte order.
  const size = buffer.readUIntBE(1, 2);
  // --- End of Change ---

  // Offset 6, payload size = 'size'
  const payload = buffer.slice(6, 6 + size);

  const validHeader = header === 0xaa || header === 0xbb;
  const validSize = payload.length === size;

  console.log(
    `Row ${idx}: header=0x${header
      .toString(16)
      .padStart(2, "0")}, size=${size}, payload length=${
      payload.length
    }, validHeader=${validHeader}, validSize=${validSize}`
  );

  if (!validHeader) {
    console.log(`  Invalid header byte!`);
  }

  if (!validSize) {
    console.log(
      `  Payload size mismatch! Expected ${size}, got ${payload.length}`
    );
  }

  // Print first 20 bytes of payload
  console.log(
    `  Payload[0..19]: ${payload.slice(0, 20).toString("hex")}${
      payload.length > 20 ? "..." : ""
    }`
  );
}

function verifyAllRows() {
  db.all("SELECT * FROM msgbinary ORDER BY timestamp ASC", (err, rows) => {
    if (err) {
      console.error("Error reading msgbinary:", err);
      db.close();
      return;
    }
    console.log(`Verifying ${rows.length} rows from msgbinary...`);
    rows.forEach(verifyRow);
    db.close();
  });
}

verifyAllRows();
