// Script to read all ASCII messages from the database and print cleaned payloads

const DatabaseManager = require("./database.js");

async function readAndPrintAsciiMessages() {
  const dbManager = new DatabaseManager();

  try {
    // Initialize database connection
    await dbManager.initialize();
    console.log("Database initialized successfully\n");

    // Get all ASCII messages
    const messages = await dbManager.getAllAsciiMessages();

    if (messages.length === 0) {
      console.log("No ASCII messages found in the database.");
      return;
    }

    // console.log(`Found ${messages.length} ASCII messages:\n`);
    // console.log("=".repeat(50));

    // Process and print each message
    messages.forEach((message, index) => {
      // Remove symbols and numbers, but keep spaces and letters
      //   const cleanedPayload = message.payload.replace(/[^a-zA-Z\s]/g, "");

      //   console.log(`Message ${index + 1} (ID: ${message.id}):`);
      //   console.log(`Timestamp: ${message.timestamp}`);
      console.log(`${message.payload}`);
      //   console.log(`${cleanedPayload}`);
      //   console.log("-".repeat(30));
    });
  } catch (error) {
    console.error("Error reading ASCII messages:", error);
  } finally {
    // Close database connection
    await dbManager.close();
  }
}

// Run the script
readAndPrintAsciiMessages();
