// AI-Assisted: Message processing utilities for Aetheric Engine

/**
 * Process ASCII message according to AE protocol
 * ASCII messages start with '$' and end with ';'
 * Payload consists of 5+ random printable ASCII characters (excluding '$' and ';')
 */
function processAsciiMessage(rawMessage) {
  if (!rawMessage || typeof rawMessage !== "string") {
    throw new Error("Invalid ASCII message: not a string");
  }

  if (!rawMessage.startsWith("$") || !rawMessage.endsWith(";")) {
    throw new Error("Invalid ASCII message: missing start or end marker");
  }

  if (rawMessage.length < 7) {
    // minimum: '$' + 5 chars + ';'
    throw new Error("Invalid ASCII message: payload too short");
  }

  // Extract payload (everything between '$' and ';')
  const payload = rawMessage.slice(1, -1);

  // Validate payload contains only printable ASCII (excluding '$' and ';')
  for (let i = 0; i < payload.length; i++) {
    const char = payload[i];
    const code = char.charCodeAt(0);

    // Check if printable ASCII (32-126) and not '$' or ';'
    if (code < 32 || code > 126 || char === "$" || char === ";") {
      throw new Error(
        `Invalid ASCII message: invalid character in payload at position ${i}`
      );
    }
  }

  return {
    type: "ascii",
    raw: rawMessage,
    payload: payload,
    size: payload.length,
  };
}

/**
 * Process binary message according to AE protocol
 * Binary message structure:
 * - Offset 0: 1 byte header (0xAA or 0xBB)
 * - Offset 1: 5 bytes payload size (little-endian)
 * - Offset 6: variable payload
 */
function processBinaryMessage(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Invalid binary message: not a buffer");
  }

  if (buffer.length < 6) {
    throw new Error("Invalid binary message: insufficient header data");
  }

  const header = buffer[0];
  if (header !== 0xaa && header !== 0xbb) {
    throw new Error(
      `Invalid binary message: invalid header 0x${header
        .toString(16)
        .padStart(2, "0")}`
    );
  }

  // Read 5-byte payload size (little-endian)
  const sizeBytes = buffer.slice(1, 6);
  let payloadSize = 0;
  for (let i = 0; i < 5; i++) {
    payloadSize += sizeBytes[i] * Math.pow(256, i);
  }

  if (buffer.length < 6 + payloadSize) {
    throw new Error(
      `Invalid binary message: insufficient payload data (expected ${payloadSize}, got ${
        buffer.length - 6
      })`
    );
  }

  const payload = buffer.slice(6, 6 + payloadSize);

  return {
    type: "binary",
    header: header,
    headerHex: `0x${header.toString(16).toUpperCase()}`,
    size: payloadSize,
    payload: payload,
    raw: buffer.slice(0, 6 + payloadSize),
    totalLength: 6 + payloadSize,
  };
}

/**
 * Parse incoming TCP data stream and extract complete messages
 * Handles both ASCII and binary messages with proper buffering
 */
class MessageParser {
  constructor() {
    this.buffer = Buffer.alloc(0);
    this.messageCount = 0;
  }

  addData(data) {
    this.buffer = Buffer.concat([this.buffer, data]);
  }

  parseMessages() {
    const messages = [];

    while (this.buffer.length > 0) {
      let messageFound = false;

      // Try to parse binary message first (0xAA or 0xBB header)
      if (
        this.buffer.length >= 6 &&
        (this.buffer[0] === 0xaa || this.buffer[0] === 0xbb)
      ) {
        try {
          const result = processBinaryMessage(this.buffer);
          if (this.buffer.length >= result.totalLength) {
            messages.push(result);
            this.buffer = this.buffer.slice(result.totalLength);
            this.messageCount++;
            messageFound = true;
            continue;
          }
        } catch (error) {
          // If binary parsing fails, might be corrupted data
          console.warn("Binary message parsing failed:", error.message);
          // Skip the bad byte and try again
          this.buffer = this.buffer.slice(1);
          continue;
        }
      }

      // Try to parse ASCII message
      const bufferStr = this.buffer.toString("ascii");
      const startIndex = bufferStr.indexOf("$");

      if (startIndex !== -1) {
        const endIndex = bufferStr.indexOf(";", startIndex);

        if (endIndex !== -1 && endIndex > startIndex) {
          const asciiMessage = bufferStr.substring(startIndex, endIndex + 1);
          try {
            const result = processAsciiMessage(asciiMessage);
            messages.push(result);

            // Remove processed message from buffer
            const messageBytes = Buffer.from(asciiMessage, "ascii");
            const messageStart = this.buffer.indexOf(messageBytes);
            if (messageStart !== -1) {
              this.buffer = Buffer.concat([
                this.buffer.slice(0, messageStart),
                this.buffer.slice(messageStart + messageBytes.length),
              ]);
            } else {
              // Fallback: remove by string replacement
              const remainingStr = bufferStr.replace(asciiMessage, "");
              this.buffer = Buffer.from(remainingStr, "ascii");
            }

            this.messageCount++;
            messageFound = true;
            continue;
          } catch (error) {
            console.warn("ASCII message parsing failed:", error.message);
          }
        }
      }

      // If no complete message found, break and wait for more data
      if (!messageFound) {
        // If we have a '$' but no ';', or partial binary header, wait for more data
        if (
          startIndex !== -1 ||
          (this.buffer.length > 0 &&
            (this.buffer[0] === 0xaa || this.buffer[0] === 0xbb))
        ) {
          break;
        }

        // Otherwise, skip unknown data
        if (this.buffer.length > 0) {
          this.buffer = this.buffer.slice(1);
        }
      }
    }

    return messages;
  }

  getMessageCount() {
    return this.messageCount;
  }

  getBufferLength() {
    return this.buffer.length;
  }

  reset() {
    this.buffer = Buffer.alloc(0);
    this.messageCount = 0;
  }
}

module.exports = {
  processAsciiMessage,
  processBinaryMessage,
  MessageParser,
};
