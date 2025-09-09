#!/usr/bin/env node

/**
 * Aetheric Engine Message Analyzer
 * AI-Assisted
 *
 * This script analyzes ASCII and binary messages from the Aetheric Engine
 * to detect hidden patterns, messages, or anomalies in the payload data.
 */

const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const crypto = require("crypto");

class MessageAnalyzer {
  constructor(dbPath) {
    this.db = new sqlite3.Database(dbPath);
    this.results = {
      ascii: {
        total: 0,
        patterns: {},
        frequencies: {},
        anomalies: [],
        statistics: {},
      },
      binary: {
        total: 0,
        patterns: {},
        frequencies: {},
        anomalies: [],
        statistics: {},
      },
    };
  }

  async analyzeAllMessages() {
    console.log("🔍 Starting Aetheric Engine Message Analysis...\n");

    await this.analyzeAsciiMessages();
    await this.analyzeBinaryMessages();
    await this.crossAnalysis();

    this.generateReport();
    this.close();
  }

  analyzeAsciiMessages() {
    return new Promise((resolve, reject) => {
      console.log("📝 Analyzing ASCII Messages...");

      this.db.all("SELECT payload FROM msgascii", (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        this.results.ascii.total = rows.length;
        console.log(`   Found ${rows.length} ASCII messages`);

        rows.forEach((row, index) => {
          this.analyzeAsciiPayload(row.payload, index);
        });

        this.calculateAsciiStatistics();
        resolve();
      });
    });
  }

  analyzeAsciiPayload(payload, index) {
    // Length analysis
    const length = payload.length;
    if (!this.results.ascii.patterns.lengths) {
      this.results.ascii.patterns.lengths = {};
    }
    this.results.ascii.patterns.lengths[length] =
      (this.results.ascii.patterns.lengths[length] || 0) + 1;

    // Character frequency analysis
    for (let char of payload) {
      if (!this.results.ascii.frequencies[char]) {
        this.results.ascii.frequencies[char] = 0;
      }
      this.results.ascii.frequencies[char]++;
    }

    // Look for patterns
    this.detectAsciiPatterns(payload, index);

    // Check for anomalies
    this.detectAsciiAnomalies(payload, index);
  }

  detectAsciiPatterns(payload, index) {
    // Repeated characters
    const repeatedPattern = /(.)\1{2,}/g;
    let match;
    while ((match = repeatedPattern.exec(payload)) !== null) {
      if (!this.results.ascii.patterns.repeated) {
        this.results.ascii.patterns.repeated = [];
      }
      this.results.ascii.patterns.repeated.push({
        index,
        pattern: match[0],
        position: match.index,
      });
    }

    // Sequential characters (like ABC, 123)
    for (let i = 0; i < payload.length - 2; i++) {
      const char1 = payload.charCodeAt(i);
      const char2 = payload.charCodeAt(i + 1);
      const char3 = payload.charCodeAt(i + 2);

      if (char2 === char1 + 1 && char3 === char2 + 1) {
        if (!this.results.ascii.patterns.sequential) {
          this.results.ascii.patterns.sequential = [];
        }
        this.results.ascii.patterns.sequential.push({
          index,
          pattern: payload.substring(i, i + 3),
          position: i,
        });
      }
    }

    // Common words or phrases
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
    ];
    for (let word of commonWords) {
      if (payload.toLowerCase().includes(word)) {
        if (!this.results.ascii.patterns.words) {
          this.results.ascii.patterns.words = [];
        }
        this.results.ascii.patterns.words.push({
          index,
          word,
          payload,
        });
      }
    }

    // Hidden ASCII codes (like embedded numbers that could be ASCII)
    const numberPattern = /\d{2,3}/g;
    let numberMatch;
    while ((numberMatch = numberPattern.exec(payload)) !== null) {
      const num = parseInt(numberMatch[0]);
      if (num >= 32 && num <= 126) {
        // Printable ASCII range
        if (!this.results.ascii.patterns.hiddenAscii) {
          this.results.ascii.patterns.hiddenAscii = [];
        }
        this.results.ascii.patterns.hiddenAscii.push({
          index,
          number: num,
          character: String.fromCharCode(num),
          position: numberMatch.index,
        });
      }
    }
  }

  detectAsciiAnomalies(payload, index) {
    // Very long messages
    if (payload.length > 100) {
      this.results.ascii.anomalies.push({
        type: "long_message",
        index,
        length: payload.length,
        payload: payload.substring(0, 50) + "...",
      });
    }

    // Messages with unusual character distributions
    const uniqueChars = new Set(payload).size;
    const ratio = uniqueChars / payload.length;
    if (ratio < 0.3 || ratio > 0.9) {
      this.results.ascii.anomalies.push({
        type: "unusual_distribution",
        index,
        uniqueRatio: ratio,
        payload,
      });
    }

    // Messages that might be encoded (high entropy)
    const entropy = this.calculateEntropy(payload);
    if (entropy > 4.5) {
      this.results.ascii.anomalies.push({
        type: "high_entropy",
        index,
        entropy,
        payload,
      });
    }
  }

  analyzeBinaryMessages() {
    return new Promise((resolve, reject) => {
      console.log("🔢 Analyzing Binary Messages...");

      this.db.all("SELECT payload FROM msgbinary", (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        this.results.binary.total = rows.length;
        console.log(`   Found ${rows.length} binary messages`);

        rows.forEach((row, index) => {
          this.analyzeBinaryPayload(row.payload, index);
        });

        this.calculateBinaryStatistics();
        resolve();
      });
    });
  }

  analyzeBinaryPayload(payload, index) {
    // Convert Buffer to Uint8Array if needed
    const bytes = Buffer.isBuffer(payload)
      ? Array.from(payload)
      : Array.from(new Uint8Array(payload));

    // Length analysis
    const length = bytes.length;
    if (!this.results.binary.patterns.lengths) {
      this.results.binary.patterns.lengths = {};
    }
    this.results.binary.patterns.lengths[length] =
      (this.results.binary.patterns.lengths[length] || 0) + 1;

    // Byte frequency analysis
    bytes.forEach((byte) => {
      if (!this.results.binary.frequencies[byte]) {
        this.results.binary.frequencies[byte] = 0;
      }
      this.results.binary.frequencies[byte]++;
    });

    // Look for patterns
    this.detectBinaryPatterns(bytes, index);

    // Check for anomalies
    this.detectBinaryAnomalies(bytes, index);
  }

  detectBinaryPatterns(bytes, index) {
    // Repeated bytes
    for (let i = 0; i < bytes.length - 2; i++) {
      if (bytes[i] === bytes[i + 1] && bytes[i + 1] === bytes[i + 2]) {
        if (!this.results.binary.patterns.repeated) {
          this.results.binary.patterns.repeated = [];
        }
        this.results.binary.patterns.repeated.push({
          index,
          byte: bytes[i],
          position: i,
          length: this.getRepeatedLength(bytes, i),
        });
      }
    }

    // Sequential bytes
    for (let i = 0; i < bytes.length - 2; i++) {
      if (bytes[i + 1] === bytes[i] + 1 && bytes[i + 2] === bytes[i + 1] + 1) {
        if (!this.results.binary.patterns.sequential) {
          this.results.binary.patterns.sequential = [];
        }
        this.results.binary.patterns.sequential.push({
          index,
          start: bytes[i],
          position: i,
        });
      }
    }

    // ASCII-like bytes (printable range)
    const asciiBytes = bytes.filter((byte) => byte >= 32 && byte <= 126);
    if (asciiBytes.length > bytes.length * 0.8) {
      if (!this.results.binary.patterns.asciiLike) {
        this.results.binary.patterns.asciiLike = [];
      }
      this.results.binary.patterns.asciiLike.push({
        index,
        asciiString: String.fromCharCode(...asciiBytes),
        asciiRatio: asciiBytes.length / bytes.length,
      });
    }

    // Magic numbers or headers
    const commonHeaders = [0xff, 0xfe, 0x89, 0x50, 0x4e, 0x47]; // PNG, etc.
    if (commonHeaders.includes(bytes[0])) {
      if (!this.results.binary.patterns.headers) {
        this.results.binary.patterns.headers = [];
      }
      this.results.binary.patterns.headers.push({
        index,
        header: bytes[0],
        firstBytes: bytes.slice(0, Math.min(10, bytes.length)),
      });
    }
  }

  detectBinaryAnomalies(bytes, index) {
    // Very long messages
    if (bytes.length > 1000) {
      this.results.binary.anomalies.push({
        type: "long_message",
        index,
        length: bytes.length,
      });
    }

    // Messages with unusual byte distributions
    const uniqueBytes = new Set(bytes).size;
    const ratio = uniqueBytes / bytes.length;
    if (ratio < 0.1 || ratio > 0.8) {
      this.results.binary.anomalies.push({
        type: "unusual_distribution",
        index,
        uniqueRatio: ratio,
        length: bytes.length,
      });
    }

    // Check for entropy
    const entropy = this.calculateBinaryEntropy(bytes);
    if (entropy < 2.0 || entropy > 7.5) {
      this.results.binary.anomalies.push({
        type: entropy < 2.0 ? "low_entropy" : "high_entropy",
        index,
        entropy,
        length: bytes.length,
      });
    }
  }

  getRepeatedLength(bytes, startIndex) {
    let length = 1;
    const byte = bytes[startIndex];
    for (let i = startIndex + 1; i < bytes.length && bytes[i] === byte; i++) {
      length++;
    }
    return length;
  }

  calculateEntropy(str) {
    const frequency = {};
    for (let char of str) {
      frequency[char] = (frequency[char] || 0) + 1;
    }

    let entropy = 0;
    const length = str.length;
    for (let char in frequency) {
      const p = frequency[char] / length;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  calculateBinaryEntropy(bytes) {
    const frequency = {};
    bytes.forEach((byte) => {
      frequency[byte] = (frequency[byte] || 0) + 1;
    });

    let entropy = 0;
    const length = bytes.length;
    for (let byte in frequency) {
      const p = frequency[byte] / length;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  calculateAsciiStatistics() {
    const lengths = Object.keys(this.results.ascii.patterns.lengths || {}).map(
      Number
    );
    this.results.ascii.statistics = {
      avgLength:
        lengths.reduce(
          (sum, len, _, arr) =>
            sum + len * (this.results.ascii.patterns.lengths[len] || 0),
          0
        ) / this.results.ascii.total,
      minLength: Math.min(...lengths),
      maxLength: Math.max(...lengths),
      totalCharacters: Object.values(this.results.ascii.frequencies).reduce(
        (sum, count) => sum + count,
        0
      ),
      uniqueCharacters: Object.keys(this.results.ascii.frequencies).length,
    };
  }

  calculateBinaryStatistics() {
    const lengths = Object.keys(this.results.binary.patterns.lengths || {}).map(
      Number
    );
    this.results.binary.statistics = {
      avgLength:
        lengths.reduce(
          (sum, len, _, arr) =>
            sum + len * (this.results.binary.patterns.lengths[len] || 0),
          0
        ) / this.results.binary.total,
      minLength: Math.min(...lengths),
      maxLength: Math.max(...lengths),
      totalBytes: Object.values(this.results.binary.frequencies).reduce(
        (sum, count) => sum + count,
        0
      ),
      uniqueBytes: Object.keys(this.results.binary.frequencies).length,
    };
  }

  async crossAnalysis() {
    console.log("🔄 Performing Cross-Analysis...");

    // Look for correlations between ASCII and binary message timing/patterns
    // This would require timestamps, but we can look for statistical correlations

    this.results.crossAnalysis = {
      totalMessages: this.results.ascii.total + this.results.binary.total,
      asciiRatio:
        this.results.ascii.total /
        (this.results.ascii.total + this.results.binary.total),
      binaryRatio:
        this.results.binary.total /
        (this.results.ascii.total + this.results.binary.total),
    };
  }

  generateReport() {
    console.log("\n📊 AETHERIC ENGINE MESSAGE ANALYSIS REPORT");
    console.log("=".repeat(50));

    console.log("\n📝 ASCII MESSAGES ANALYSIS:");
    console.log(`   Total Messages: ${this.results.ascii.total}`);
    console.log(
      `   Average Length: ${this.results.ascii.statistics.avgLength?.toFixed(
        2
      )} characters`
    );
    console.log(
      `   Length Range: ${this.results.ascii.statistics.minLength} - ${this.results.ascii.statistics.maxLength} characters`
    );
    console.log(
      `   Unique Characters: ${this.results.ascii.statistics.uniqueCharacters}`
    );

    if (this.results.ascii.patterns.words?.length > 0) {
      console.log(
        `\n   🔤 Found ${this.results.ascii.patterns.words.length} messages with recognizable words!`
      );
      this.results.ascii.patterns.words.slice(0, 5).forEach((item) => {
        console.log(
          `      Message ${item.index}: Contains "${item.word}" - "${item.payload}"`
        );
      });
    }

    if (this.results.ascii.patterns.hiddenAscii?.length > 0) {
      console.log(
        `\n   🔢 Found ${this.results.ascii.patterns.hiddenAscii.length} potential hidden ASCII codes:`
      );
      this.results.ascii.patterns.hiddenAscii.slice(0, 10).forEach((item) => {
        console.log(
          `      Message ${item.index}: ${item.number} → "${item.character}"`
        );
      });
    }

    if (this.results.ascii.anomalies.length > 0) {
      console.log(
        `\n   ⚠️  Found ${this.results.ascii.anomalies.length} ASCII anomalies:`
      );
      this.results.ascii.anomalies.slice(0, 5).forEach((anomaly) => {
        console.log(`      ${anomaly.type}: Message ${anomaly.index}`);
      });
    }

    console.log("\n🔢 BINARY MESSAGES ANALYSIS:");
    console.log(`   Total Messages: ${this.results.binary.total}`);
    console.log(
      `   Average Length: ${this.results.binary.statistics.avgLength?.toFixed(
        2
      )} bytes`
    );
    console.log(
      `   Length Range: ${this.results.binary.statistics.minLength} - ${this.results.binary.statistics.maxLength} bytes`
    );
    console.log(
      `   Unique Bytes: ${this.results.binary.statistics.uniqueBytes}`
    );

    if (this.results.binary.patterns.asciiLike?.length > 0) {
      console.log(
        `\n   📝 Found ${this.results.binary.patterns.asciiLike.length} ASCII-like binary messages:`
      );
      this.results.binary.patterns.asciiLike.slice(0, 5).forEach((item) => {
        console.log(
          `      Message ${item.index}: "${item.asciiString}" (${(
            item.asciiRatio * 100
          ).toFixed(1)}% ASCII)`
        );
      });
    }

    if (this.results.binary.anomalies.length > 0) {
      console.log(
        `\n   ⚠️  Found ${this.results.binary.anomalies.length} binary anomalies:`
      );
      this.results.binary.anomalies.slice(0, 5).forEach((anomaly) => {
        console.log(`      ${anomaly.type}: Message ${anomaly.index}`);
      });
    }

    console.log("\n🔄 CROSS-ANALYSIS:");
    console.log(
      `   Total Messages: ${this.results.crossAnalysis.totalMessages}`
    );
    console.log(
      `   ASCII Ratio: ${(this.results.crossAnalysis.asciiRatio * 100).toFixed(
        1
      )}%`
    );
    console.log(
      `   Binary Ratio: ${(
        this.results.crossAnalysis.binaryRatio * 100
      ).toFixed(1)}%`
    );

    // Save detailed results to file
    const reportFile = "analysis_report.json";
    fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Detailed analysis saved to: ${reportFile}`);

    console.log("\n🔍 POTENTIAL HIDDEN MESSAGES:");
    this.detectPotentialHiddenMessages();
  }

  detectPotentialHiddenMessages() {
    // Combine various clues to suggest potential hidden messages
    let suspiciousCount = 0;

    if (this.results.ascii.patterns.words?.length > 0) {
      console.log(
        `   • Found recognizable words in ASCII messages - potential steganography`
      );
      suspiciousCount++;
    }

    if (this.results.binary.patterns.asciiLike?.length > 0) {
      console.log(`   • Found ASCII-like binary data - potential encoded text`);
      suspiciousCount++;
    }

    if (this.results.ascii.patterns.hiddenAscii?.length > 0) {
      console.log(
        `   • Found numeric patterns that decode to ASCII characters`
      );
      suspiciousCount++;
    }

    const highEntropyAscii = this.results.ascii.anomalies.filter(
      (a) => a.type === "high_entropy"
    );
    if (highEntropyAscii.length > 0) {
      console.log(
        `   • Found ${highEntropyAscii.length} high-entropy ASCII messages - potential encryption`
      );
      suspiciousCount++;
    }

    if (suspiciousCount === 0) {
      console.log(`   • No obvious hidden patterns detected`);
      console.log(`   • Messages appear to be truly random as expected`);
    } else {
      console.log(
        `\n   🚨 RECOMMENDATION: Investigate the ${suspiciousCount} suspicious pattern(s) above!`
      );
    }
  }

  close() {
    this.db.close();
    console.log("\n✅ Analysis complete!");
  }
}

// Run the analyzer if this script is executed directly
if (require.main === module) {
  const analyzer = new MessageAnalyzer("aetheric_messages.db");
  analyzer.analyzeAllMessages().catch(console.error);
}

module.exports = MessageAnalyzer;
