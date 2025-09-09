#!/usr/bin/env node

/**
 * Aetheric Engine Hidden Message Decoder
 * AI-Assisted
 *
 * Deep dive analysis to extract potential hidden messages from the Aetheric Engine
 */

const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

class HiddenMessageDecoder {
  constructor(dbPath) {
    this.db = new sqlite3.Database(dbPath);
  }

  async investigateHiddenMessages() {
    console.log("🕵️ INVESTIGATING POTENTIAL HIDDEN MESSAGES...\n");

    await this.extractWordMessages();
    await this.extractNumericCodes();
    await this.extractBinaryAscii();
    await this.patternAnalysis();
    await this.steganographyAnalysis();

    this.close();
  }

  extractWordMessages() {
    return new Promise((resolve) => {
      console.log("🔤 EXTRACTING MESSAGES WITH RECOGNIZABLE WORDS...");

      const commonWords = [
        "the",
        "and",
        "or",
        "for",
        "to",
        "of",
        "in",
        "on",
        "at",
        "by",
        "with",
        "from",
        "is",
        "are",
        "was",
        "were",
        "be",
        "been",
        "have",
        "has",
        "had",
        "do",
        "does",
        "did",
        "will",
        "would",
        "could",
        "should",
        "may",
        "might",
        "can",
        "must",
        "shall",
        "this",
        "that",
        "these",
        "those",
        "i",
        "you",
        "he",
        "she",
        "it",
        "we",
        "they",
        "me",
        "him",
        "her",
        "us",
        "them",
        "my",
        "your",
        "his",
        "her",
        "its",
        "our",
        "their",
        "a",
        "an",
        "one",
        "two",
        "three",
        "four",
        "five",
        "six",
        "seven",
        "eight",
        "nine",
        "ten",
      ];

      this.db.all("SELECT rowid, payload FROM msgascii", (err, rows) => {
        if (err) {
          console.error(err);
          resolve();
          return;
        }

        let wordMessages = [];

        rows.forEach((row, index) => {
          const payload = row.payload.toLowerCase();
          let foundWords = [];

          commonWords.forEach((word) => {
            if (payload.includes(word)) {
              foundWords.push(word);
            }
          });

          if (foundWords.length > 0) {
            wordMessages.push({
              index: row.rowid,
              payload: row.payload,
              words: foundWords,
              wordCount: foundWords.length,
            });
          }
        });

        // Sort by most words found
        wordMessages.sort((a, b) => b.wordCount - a.wordCount);

        console.log(
          `   Found ${wordMessages.length} messages with common words:`
        );

        // Show top 10 most word-rich messages
        wordMessages.slice(0, 10).forEach((msg) => {
          console.log(
            `\n   Message ${msg.index} (${
              msg.wordCount
            } words: ${msg.words.join(", ")})`
          );
          console.log(
            `   Payload: "${msg.payload.substring(0, 100)}${
              msg.payload.length > 100 ? "..." : ""
            }"`
          );
        });

        // Look for complete sentences or phrases
        console.log("\n   🔍 Searching for sentence-like patterns...");
        const sentencePatterns = wordMessages.filter(
          (msg) =>
            msg.wordCount >= 3 &&
            (msg.payload.includes(" the ") ||
              msg.payload.includes(" and ") ||
              msg.payload.includes(" to "))
        );

        if (sentencePatterns.length > 0) {
          console.log(
            `   Found ${sentencePatterns.length} potential sentence patterns!`
          );
          sentencePatterns.slice(0, 5).forEach((msg) => {
            console.log(`   📝 Message ${msg.index}: "${msg.payload}"`);
          });
        } else {
          console.log("   No clear sentence patterns detected.");
        }

        resolve();
      });
    });
  }

  extractNumericCodes() {
    return new Promise((resolve) => {
      console.log("\n🔢 EXTRACTING NUMERIC ASCII CODES...");

      this.db.all("SELECT rowid, payload FROM msgascii", (err, rows) => {
        if (err) {
          console.error(err);
          resolve();
          return;
        }

        let hiddenMessages = [];

        rows.forEach((row) => {
          const payload = row.payload;

          // Look for sequences of 2-3 digit numbers that could be ASCII codes
          const numberMatches = payload.match(/\d{2,3}/g);
          if (numberMatches) {
            let decodedChars = [];
            numberMatches.forEach((num) => {
              const code = parseInt(num);
              if (code >= 32 && code <= 126) {
                // Printable ASCII range
                decodedChars.push(String.fromCharCode(code));
              }
            });

            if (decodedChars.length > 0) {
              const decodedMessage = decodedChars.join("");
              hiddenMessages.push({
                index: row.rowid,
                originalPayload: payload,
                decodedMessage,
                codes: numberMatches,
              });
            }
          }
        });

        console.log(
          `   Found ${hiddenMessages.length} messages with potential ASCII codes:`
        );

        // Show messages with the most meaningful decoded content
        hiddenMessages
          .filter((msg) => msg.decodedMessage.length > 3)
          .slice(0, 10)
          .forEach((msg) => {
            console.log(`\n   Message ${msg.index}:`);
            console.log(`   Codes: ${msg.codes.join(", ")}`);
            console.log(`   Decoded: "${msg.decodedMessage}"`);
            console.log(
              `   Original: "${msg.originalPayload.substring(0, 80)}..."`
            );
          });

        resolve();
      });
    });
  }

  extractBinaryAscii() {
    return new Promise((resolve) => {
      console.log("\n📝 EXTRACTING ASCII-LIKE CONTENT FROM BINARY MESSAGES...");

      this.db.all("SELECT rowid, payload FROM msgbinary", (err, rows) => {
        if (err) {
          console.error(err);
          resolve();
          return;
        }

        let asciiLikeMessages = [];

        rows.forEach((row) => {
          const bytes = Buffer.isBuffer(row.payload)
            ? Array.from(row.payload)
            : Array.from(new Uint8Array(row.payload));

          // Extract printable ASCII characters
          const asciiBytes = bytes.filter((byte) => byte >= 32 && byte <= 126);
          const asciiRatio = asciiBytes.length / bytes.length;

          if (asciiRatio > 0.7 && asciiBytes.length > 10) {
            // High ASCII content
            const asciiString = String.fromCharCode(...asciiBytes);
            asciiLikeMessages.push({
              index: row.rowid,
              asciiString,
              asciiRatio,
              totalLength: bytes.length,
              asciiLength: asciiBytes.length,
            });
          }
        });

        console.log(
          `   Found ${asciiLikeMessages.length} binary messages with high ASCII content:`
        );

        asciiLikeMessages.slice(0, 5).forEach((msg) => {
          console.log(
            `\n   Binary Message ${msg.index} (${(msg.asciiRatio * 100).toFixed(
              1
            )}% ASCII):`
          );
          console.log(
            `   ASCII Content: "${msg.asciiString.substring(0, 100)}${
              msg.asciiString.length > 100 ? "..." : ""
            }"`
          );
        });

        resolve();
      });
    });
  }

  patternAnalysis() {
    return new Promise((resolve) => {
      console.log("\n🎯 ADVANCED PATTERN ANALYSIS...");

      // Look for messages that might be encrypted with simple ciphers
      this.db.all(
        "SELECT rowid, payload FROM msgascii ORDER BY length(payload) DESC LIMIT 20",
        (err, rows) => {
          if (err) {
            console.error(err);
            resolve();
            return;
          }

          console.log("   Analyzing longest messages for cipher patterns...");

          rows.forEach((row, index) => {
            if (index < 5) {
              // Analyze top 5 longest messages
              console.log(
                `\n   Message ${row.rowid} (${row.payload.length} chars):`
              );

              // Check for Caesar cipher patterns
              this.analyzeForCaesarCipher(row.payload, row.rowid);

              // Check for Base64 patterns
              this.analyzeForBase64(row.payload, row.rowid);

              // Check for repeated character patterns
              this.analyzeForRepeatedPatterns(row.payload, row.rowid);
            }
          });

          resolve();
        }
      );
    });
  }

  analyzeForCaesarCipher(payload, messageId) {
    // Try different Caesar cipher shifts
    for (let shift = 1; shift <= 25; shift++) {
      let decoded = "";
      let validWords = 0;

      for (let char of payload) {
        if (char.match(/[a-zA-Z]/)) {
          const isUpperCase = char === char.toUpperCase();
          const charCode = char.toLowerCase().charCodeAt(0);
          const shiftedCode = ((charCode - 97 + shift) % 26) + 97;
          const shiftedChar = String.fromCharCode(shiftedCode);
          decoded += isUpperCase ? shiftedChar.toUpperCase() : shiftedChar;
        } else {
          decoded += char;
        }
      }

      // Check if decoded text contains common English words
      const commonWords = [
        "the",
        "and",
        "to",
        "of",
        "a",
        "in",
        "is",
        "it",
        "you",
        "that",
        "he",
        "was",
        "for",
        "on",
        "are",
        "as",
        "with",
        "his",
        "they",
        "i",
      ];
      commonWords.forEach((word) => {
        if (decoded.toLowerCase().includes(word)) {
          validWords++;
        }
      });

      if (validWords >= 3) {
        console.log(
          `      🔓 Potential Caesar cipher (shift ${shift}): "${decoded.substring(
            0,
            50
          )}..."`
        );
      }
    }
  }

  analyzeForBase64(payload, messageId) {
    // Check if the payload looks like Base64
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
    if (base64Pattern.test(payload) && payload.length % 4 === 0) {
      try {
        const decoded = Buffer.from(payload, "base64").toString("utf8");
        if (decoded.length > 0 && this.isPrintableText(decoded)) {
          console.log(
            `      🔓 Potential Base64 decoded: "${decoded.substring(
              0,
              50
            )}..."`
          );
        }
      } catch (e) {
        // Not valid Base64
      }
    }
  }

  analyzeForRepeatedPatterns(payload, messageId) {
    // Look for repeated substrings that might indicate patterns
    for (let length = 3; length <= 10; length++) {
      const substrings = {};
      for (let i = 0; i <= payload.length - length; i++) {
        const substr = payload.substring(i, i + length);
        substrings[substr] = (substrings[substr] || 0) + 1;
      }

      Object.entries(substrings).forEach(([substr, count]) => {
        if (count >= 3) {
          console.log(
            `      🔄 Repeated pattern "${substr}" appears ${count} times`
          );
        }
      });
    }
  }

  isPrintableText(text) {
    const printableChars = text.split("").filter((char) => {
      const code = char.charCodeAt(0);
      return (code >= 32 && code <= 126) || code === 10 || code === 13; // Include newlines
    });
    return printableChars.length / text.length > 0.8;
  }

  steganographyAnalysis() {
    return new Promise((resolve) => {
      console.log("\n🔍 STEGANOGRAPHY ANALYSIS...");

      // Check for messages that might have hidden data in specific positions
      this.db.all("SELECT rowid, payload FROM msgascii", (err, rows) => {
        if (err) {
          console.error(err);
          resolve();
          return;
        }

        console.log("   Checking for steganographic patterns...");

        // Extract first character of each message
        let firstChars = rows.map((row) => row.payload.charAt(0)).join("");
        console.log(`   First characters: "${firstChars.substring(0, 50)}..."`);

        // Extract last character of each message
        let lastChars = rows
          .map((row) => row.payload.charAt(row.payload.length - 1))
          .join("");
        console.log(`   Last characters: "${lastChars.substring(0, 50)}..."`);

        // Extract every nth character from concatenated messages
        let allMessages = rows.map((row) => row.payload).join("");
        for (let n of [2, 3, 5, 7, 10]) {
          let nthChars = "";
          for (let i = n - 1; i < allMessages.length; i += n) {
            nthChars += allMessages.charAt(i);
          }
          if (nthChars.length > 20) {
            console.log(
              `   Every ${n}th character: "${nthChars.substring(0, 50)}..."`
            );
          }
        }

        resolve();
      });
    });
  }

  close() {
    this.db.close();
    console.log("\n✅ Hidden message investigation complete!");
  }
}

// Run the decoder if this script is executed directly
if (require.main === module) {
  const decoder = new HiddenMessageDecoder("aetheric_messages.db");
  decoder.investigateHiddenMessages().catch(console.error);
}

module.exports = HiddenMessageDecoder;
