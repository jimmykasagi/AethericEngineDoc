// AI-Assisted: Independent validation application for Aetheric Engine message parsing

const DatabaseManager = require("./database");
const {
  processAsciiMessage,
  processBinaryMessage,
  MessageParser,
} = require("./utils");

class MessageValidator {
  constructor() {
    this.db = new DatabaseManager();
    this.validationResults = {
      totalMessages: 0,
      validMessages: 0,
      invalidMessages: 0,
      asciiMessages: {
        total: 0,
        valid: 0,
        invalid: 0,
        errors: [],
      },
      binaryMessages: {
        total: 0,
        valid: 0,
        invalid: 0,
        errors: [],
      },
    };
  }

  async initialize() {
    await this.db.initialize();
    console.log("Validator initialized");
  }

  async validateStoredMessages() {
    console.log("Starting validation of stored messages...\n");

    await this.validateAsciiMessages();
    await this.validateBinaryMessages();

    this.printValidationReport();
    return this.validationResults;
  }

  async validateAsciiMessages() {
    console.log("Validating ASCII messages...");
    const messages = await this.db.getAllAsciiMessages();

    this.validationResults.asciiMessages.total = messages.length;

    for (const message of messages) {
      try {
        // Reconstruct the original message format
        const reconstructed = `$${message.payload};`;
        const parsed = processAsciiMessage(reconstructed);

        // Validate that the parsed payload matches stored payload
        if (parsed.payload === message.payload) {
          this.validationResults.asciiMessages.valid++;
        } else {
          this.validationResults.asciiMessages.invalid++;
          this.validationResults.asciiMessages.errors.push({
            id: message.id,
            error: "Payload mismatch",
            stored: message.payload,
            parsed: parsed.payload,
          });
        }
      } catch (error) {
        this.validationResults.asciiMessages.invalid++;
        this.validationResults.asciiMessages.errors.push({
          id: message.id,
          error: error.message,
          stored: message.payload,
        });
      }
    }

    console.log(
      `ASCII validation complete: ${this.validationResults.asciiMessages.valid}/${this.validationResults.asciiMessages.total} valid`
    );
  }

  async validateBinaryMessages() {
    console.log("Validating binary messages...");
    const messages = await this.db.getAllBinaryMessages();

    this.validationResults.binaryMessages.total = messages.length;

    for (const message of messages) {
      try {
        // Validate that stored size matches actual payload size
        if (message.size !== message.payload.length) {
          this.validationResults.binaryMessages.invalid++;
          this.validationResults.binaryMessages.errors.push({
            id: message.id,
            error: "Size mismatch",
            storedSize: message.size,
            actualSize: message.payload.length,
          });
          continue;
        }

        // Attempt to reconstruct and validate the binary message
        // We can't fully validate without the original header, but we can check data integrity
        const payload = message.payload;

        // Basic validation: ensure payload is a valid Buffer
        if (Buffer.isBuffer(payload)) {
          this.validationResults.binaryMessages.valid++;
        } else {
          this.validationResults.binaryMessages.invalid++;
          this.validationResults.binaryMessages.errors.push({
            id: message.id,
            error: "Invalid payload format",
            type: typeof payload,
          });
        }
      } catch (error) {
        this.validationResults.binaryMessages.invalid++;
        this.validationResults.binaryMessages.errors.push({
          id: message.id,
          error: error.message,
        });
      }
    }

    console.log(
      `Binary validation complete: ${this.validationResults.binaryMessages.valid}/${this.validationResults.binaryMessages.total} valid`
    );
  }

  printValidationReport() {
    console.log("\n" + "=".repeat(60));
    console.log("VALIDATION REPORT");
    console.log("=".repeat(60));

    const totalMessages =
      this.validationResults.asciiMessages.total +
      this.validationResults.binaryMessages.total;
    const totalValid =
      this.validationResults.asciiMessages.valid +
      this.validationResults.binaryMessages.valid;
    const totalInvalid =
      this.validationResults.asciiMessages.invalid +
      this.validationResults.binaryMessages.invalid;

    console.log(`Total Messages: ${totalMessages}`);
    console.log(
      `Valid Messages: ${totalValid} (${(
        (totalValid / totalMessages) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `Invalid Messages: ${totalInvalid} (${(
        (totalInvalid / totalMessages) *
        100
      ).toFixed(1)}%)`
    );
    console.log();

    // ASCII Messages
    console.log("ASCII MESSAGES:");
    console.log(`  Total: ${this.validationResults.asciiMessages.total}`);
    console.log(`  Valid: ${this.validationResults.asciiMessages.valid}`);
    console.log(`  Invalid: ${this.validationResults.asciiMessages.invalid}`);

    if (this.validationResults.asciiMessages.errors.length > 0) {
      console.log("  Errors:");
      this.validationResults.asciiMessages.errors
        .slice(0, 5)
        .forEach((error) => {
          console.log(`    - ID ${error.id}: ${error.error}`);
        });
      if (this.validationResults.asciiMessages.errors.length > 5) {
        console.log(
          `    ... and ${
            this.validationResults.asciiMessages.errors.length - 5
          } more errors`
        );
      }
    }
    console.log();

    // Binary Messages
    console.log("BINARY MESSAGES:");
    console.log(`  Total: ${this.validationResults.binaryMessages.total}`);
    console.log(`  Valid: ${this.validationResults.binaryMessages.valid}`);
    console.log(`  Invalid: ${this.validationResults.binaryMessages.invalid}`);

    if (this.validationResults.binaryMessages.errors.length > 0) {
      console.log("  Errors:");
      this.validationResults.binaryMessages.errors
        .slice(0, 5)
        .forEach((error) => {
          console.log(`    - ID ${error.id}: ${error.error}`);
        });
      if (this.validationResults.binaryMessages.errors.length > 5) {
        console.log(
          `    ... and ${
            this.validationResults.binaryMessages.errors.length - 5
          } more errors`
        );
      }
    }

    console.log("=".repeat(60));
  }

  async demonstrateMessageParsing() {
    console.log("\nDemonstrating message parsing capabilities...\n");

    // Test ASCII message parsing
    console.log("ASCII Message Parsing:");
    const testAsciiMessages = [
      "$Hello;",
      "$Test123;",
      "$RandomData987;",
      "$ABCDEFGHIJKLMNOP;",
    ];

    testAsciiMessages.forEach((msg) => {
      try {
        const result = processAsciiMessage(msg);
        console.log(
          `  ✓ "${msg}" → payload: "${result.payload}" (${result.size} chars)`
        );
      } catch (error) {
        console.log(`  ✗ "${msg}" → ERROR: ${error.message}`);
      }
    });

    console.log("\nBinary Message Parsing:");

    // Test binary message parsing (0xAA header)
    const testBinaryAA = Buffer.alloc(11);
    testBinaryAA[0] = 0xaa; // header
    testBinaryAA.writeUInt8(5, 1); // size: 5 bytes (little-endian)
    testBinaryAA.writeUInt8(0, 2);
    testBinaryAA.writeUInt8(0, 3);
    testBinaryAA.writeUInt8(0, 4);
    testBinaryAA.writeUInt8(0, 5);
    // payload: 5 random bytes
    testBinaryAA[6] = 0x01;
    testBinaryAA[7] = 0x02;
    testBinaryAA[8] = 0x03;
    testBinaryAA[9] = 0x04;
    testBinaryAA[10] = 0x05;

    try {
      const result = processBinaryMessage(testBinaryAA);
      console.log(
        `  ✓ 0xAA message → header: ${result.headerHex}, size: ${
          result.size
        }, payload: ${result.payload.toString("hex")}`
      );
    } catch (error) {
      console.log(`  ✗ 0xAA message → ERROR: ${error.message}`);
    }

    // Test binary message parsing (0xBB header)
    const testBinaryBB = Buffer.from(testBinaryAA);
    testBinaryBB[0] = 0xbb;

    try {
      const result = processBinaryMessage(testBinaryBB);
      console.log(
        `  ✓ 0xBB message → header: ${result.headerHex}, size: ${
          result.size
        }, payload: ${result.payload.toString("hex")}`
      );
    } catch (error) {
      console.log(`  ✗ 0xBB message → ERROR: ${error.message}`);
    }
  }

  async generateSampleData() {
    console.log("\nGenerating sample test data...");

    // Insert some sample ASCII messages
    const sampleAsciiPayloads = [
      "Hello",
      "World123",
      "TestData",
      "Sample",
      "ABCDEF",
    ];

    for (const payload of sampleAsciiPayloads) {
      await this.db.insertAsciiMessage(payload);
    }

    // Insert some sample binary messages
    for (let i = 0; i < 5; i++) {
      const payload = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05 + i]);
      await this.db.insertBinaryMessage(payload, payload.length);
    }

    console.log("Sample data generated successfully");
  }

  async close() {
    await this.db.close();
  }
}

async function main() {
  const validator = new MessageValidator();

  try {
    await validator.initialize();

    // Check if we have data to validate
    const totalMessages = await validator.db.getTotalMessageCount();

    if (totalMessages === 0) {
      console.log(
        "No messages found in database. Generating sample data for demonstration..."
      );
      await validator.generateSampleData();
    }

    // Demonstrate parsing capabilities
    await validator.demonstrateMessageParsing();

    // Validate stored messages
    await validator.validateStoredMessages();
  } catch (error) {
    console.error("Validation failed:", error);
  } finally {
    await validator.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = MessageValidator;
