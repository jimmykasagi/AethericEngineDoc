// Script to read all binary messages from the database and display information

const DatabaseManager = require("./database.js");

async function readAndPrintBinaryMessages() {
  const dbManager = new DatabaseManager();

  try {
    // Initialize database connection
    await dbManager.initialize();
    console.log("Database initialized successfully\n");

    // Get all binary messages
    const messages = await dbManager.getAllBinaryMessages();

    if (messages.length === 0) {
      console.log("No binary messages found in the database.");
      return;
    }

    console.log(`Found ${messages.length} binary messages:\n`);
    console.log("=".repeat(70));

    // Process and print each message
    messages.forEach((message, index) => {
      console.log(`Message ${index + 1} (ID: ${message.id}):`);
      console.log(`Timestamp: ${message.timestamp}`);
      console.log(`Size: ${message.size} bytes`);

      // Display binary data in different formats
      const buffer = Buffer.from(message.payload);

      // Show first 50 bytes as hex
      const hexPreview = buffer
        .slice(0, 50)
        .toString("hex")
        .match(/.{2}/g)
        .join(" ");
      console.log(
        `Hex Preview (first 50 bytes): ${hexPreview}${
          buffer.length > 50 ? "..." : ""
        }`
      );

      // Try to display as text (if it contains printable characters)
      const textPreview = buffer
        .slice(0, 100)
        .toString("utf8", 0, Math.min(100, buffer.length));
      const printableText = textPreview.replace(/[\x00-\x1F\x7F-\x9F]/g, ".");
      console.log(
        `Text Preview (first 100 chars): ${printableText}${
          buffer.length > 100 ? "..." : ""
        }`
      );

      // Show as base64 (useful for data transfer)
      const base64Preview = buffer.slice(0, 50).toString("base64");
      console.log(
        `Base64 Preview (first 50 bytes): ${base64Preview}${
          buffer.length > 50 ? "..." : ""
        }`
      );

      // Show byte values for first 20 bytes
      const byteValues = Array.from(buffer.slice(0, 20))
        .map((b) => b.toString().padStart(3, " "))
        .join(" ");
      console.log(
        `Byte Values (first 20): ${byteValues}${
          buffer.length > 20 ? "..." : ""
        }`
      );

      console.log("-".repeat(50));
    });

    // Summary statistics
    console.log("\nSummary Statistics:");
    console.log("=".repeat(30));
    const totalSize = messages.reduce((sum, msg) => sum + msg.size, 0);
    const averageSize = totalSize / messages.length;
    const minSize = Math.min(...messages.map((msg) => msg.size));
    const maxSize = Math.max(...messages.map((msg) => msg.size));

    console.log(`Total messages: ${messages.length}`);
    console.log(
      `Total size: ${totalSize} bytes (${(totalSize / 1024).toFixed(2)} KB)`
    );
    console.log(`Average size: ${averageSize.toFixed(2)} bytes`);
    console.log(`Size range: ${minSize} - ${maxSize} bytes`);
  } catch (error) {
    console.error("Error reading binary messages:", error);
  } finally {
    // Close database connection
    await dbManager.close();
  }
}

// Helper function to save a specific binary message to file
async function saveBinaryMessageToFile(messageId, outputPath) {
  const dbManager = new DatabaseManager();

  try {
    await dbManager.initialize();

    const messages = await dbManager.getAllBinaryMessages();
    const message = messages.find((msg) => msg.id === messageId);

    if (!message) {
      console.log(`Message with ID ${messageId} not found.`);
      return;
    }

    const fs = require("fs");
    fs.writeFileSync(outputPath, message.payload);
    console.log(`Binary message ${messageId} saved to: ${outputPath}`);
    console.log(`Size: ${message.size} bytes`);
  } catch (error) {
    console.error("Error saving binary message:", error);
  } finally {
    await dbManager.close();
  }
}

// Run the script
if (require.main === module) {
  // Check if user wants to save a specific message
  const args = process.argv.slice(2);

  if (args.length >= 2 && args[0] === "save") {
    const messageId = parseInt(args[1]);
    const outputPath = args[2] || `binary_message_${messageId}.bin`;
    saveBinaryMessageToFile(messageId, outputPath);
  } else {
    readAndPrintBinaryMessages();
  }
}

// Export functions for use in other scripts
module.exports = {
  readAndPrintBinaryMessages,
  saveBinaryMessageToFile,
};
