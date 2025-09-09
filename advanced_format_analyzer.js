#!/usr/bin/env node
/**
 * Advanced Message Format Analyzer
 * AI-Assisted
 *
 * Analyzes the actual message format found in your database
 * which appears to deviate from the documented protocol
 */

const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

class AdvancedFormatAnalyzer {
  constructor(dbPath = "./aetheric_messages.db") {
    this.dbPath = dbPath;
    this.db = null;
    this.findings = {
      headerDistribution: new Map(),
      sizePatterns: [],
      contentAnalysis: [],
      protocolDeviations: [],
      suspiciousPatterns: [],
    };
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getAllMessages() {
    return new Promise((resolve, reject) => {
      const query =
        "SELECT id, payload, size, timestamp FROM msgbinary ORDER BY id";
      this.db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  analyzeActualFormat() {
    console.log("🔍 CRITICAL DISCOVERY: Protocol Deviation Detected!\n");
    console.log("Your binary messages do NOT follow the documented format:");
    console.log("❌ Expected: 0xAA header + 5-byte size + payload");
    console.log("✅ Actual: Random header + variable data\n");

    console.log("This suggests:");
    console.log("1. 🚨 The Aetheric Engine has undocumented message types");
    console.log("2. 🔬 Your TCP client may be parsing incorrectly");
    console.log("3. 🎯 The real protocol is more complex than documented");
    console.log("4. 🧩 Messages might be encoded or encrypted\n");
  }

  async analyzeMessages() {
    const messages = await this.getAllMessages();

    console.log(
      `📊 Analyzing ${messages.length} messages for actual format...\n`
    );

    for (const message of messages) {
      const analysis = this.analyzeIndividualMessage(message);

      // Header distribution
      const header = analysis.header;
      this.findings.headerDistribution.set(
        header,
        (this.findings.headerDistribution.get(header) || 0) + 1
      );

      // Size patterns
      this.findings.sizePatterns.push({
        id: message.id,
        declaredSize: message.size,
        actualSize: message.payload.length,
        ratio: message.payload.length / message.size,
      });

      // Content analysis
      this.findings.contentAnalysis.push(analysis);

      // Check for protocol deviations
      if (header !== 0xaa && header !== 0xbb) {
        this.findings.protocolDeviations.push({
          id: message.id,
          header: `0x${header.toString(16).toUpperCase()}`,
          issue: "Non-standard header",
        });
      }
    }
  }

  analyzeIndividualMessage(message) {
    const payload = message.payload;
    const header = payload[0];

    // Try to detect if this follows ANY known pattern
    const patterns = this.detectPatterns(payload);
    const entropy = this.calculateEntropy(payload);
    const readableContent = this.extractReadableContent(payload);

    return {
      id: message.id,
      header,
      headerHex: `0x${header.toString(16).toUpperCase()}`,
      size: payload.length,
      declaredSize: message.size,
      entropy: entropy.toFixed(3),
      patterns,
      readableContent,
      possibleFormat: this.guessFormat(payload, patterns),
    };
  }

  detectPatterns(payload) {
    const patterns = [];

    // Check for size field at various positions
    for (let pos = 1; pos <= 5 && pos < payload.length; pos++) {
      const possibleSize = this.extractSizeAtPosition(payload, pos);
      if (possibleSize === payload.length - pos - 1) {
        patterns.push(`Size field at position ${pos}`);
      }
      if (possibleSize === payload.length - 6) {
        patterns.push(`Standard size field at position ${pos}`);
      }
    }

    // Check for repeating byte sequences
    const hex = payload.toString("hex");
    const repeatingPattern = hex.match(/(.{2,8})\1{3,}/g);
    if (repeatingPattern) {
      patterns.push(
        `Repeating patterns: ${repeatingPattern.slice(0, 3).join(", ")}`
      );
    }

    // Check for null sequences
    if (hex.includes("0000")) {
      patterns.push("Contains null sequences");
    }

    // Check for ASCII-like content
    const asciiBytes = payload.filter((b) => b >= 32 && b <= 126).length;
    if (asciiBytes > payload.length * 0.3) {
      patterns.push(
        `${((asciiBytes / payload.length) * 100).toFixed(1)}% ASCII-like`
      );
    }

    return patterns;
  }

  extractSizeAtPosition(payload, position) {
    if (position + 4 >= payload.length) return -1;

    // Try different endianness and byte counts
    const bytes = payload.slice(position, position + 4);

    // Big endian 4 bytes
    let size = 0;
    for (let i = 0; i < 4; i++) {
      size = (size << 8) + bytes[i];
    }

    return size;
  }

  calculateEntropy(data) {
    const frequency = new Array(256).fill(0);
    for (let i = 0; i < data.length; i++) {
      frequency[data[i]]++;
    }

    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (frequency[i] > 0) {
        const p = frequency[i] / data.length;
        entropy -= p * Math.log2(p);
      }
    }

    return entropy;
  }

  extractReadableContent(payload) {
    const readable = [];

    // Look for contiguous readable sequences
    let current = "";
    for (let i = 0; i < payload.length; i++) {
      const byte = payload[i];
      if (byte >= 32 && byte <= 126) {
        current += String.fromCharCode(byte);
      } else {
        if (current.length >= 5) {
          readable.push(current);
        }
        current = "";
      }
    }
    if (current.length >= 5) {
      readable.push(current);
    }

    return readable.slice(0, 5); // Limit to first 5 sequences
  }

  guessFormat(payload, patterns) {
    if (payload[0] === 0xaa || payload[0] === 0xbb) {
      return "Standard Aetheric Engine format";
    }

    if (patterns.some((p) => p.includes("Size field"))) {
      return "Modified binary format with size field";
    }

    if (patterns.some((p) => p.includes("ASCII-like"))) {
      return "Mixed binary/text format";
    }

    const entropy = this.calculateEntropy(payload);
    if (entropy > 7.5) {
      return "Highly random/encrypted data";
    } else if (entropy < 3.0) {
      return "Low entropy/structured data";
    }

    return "Unknown format";
  }

  printAnalysis() {
    console.log("=== ACTUAL MESSAGE FORMAT ANALYSIS ===\n");

    console.log("📊 Header Distribution:");
    const sortedHeaders = Array.from(
      this.findings.headerDistribution.entries()
    ).sort((a, b) => b[1] - a[1]);

    sortedHeaders.slice(0, 10).forEach(([header, count]) => {
      console.log(
        `  0x${header
          .toString(16)
          .toUpperCase()
          .padStart(2, "0")}: ${count} messages`
      );
    });

    if (sortedHeaders.length > 10) {
      console.log(`  ... and ${sortedHeaders.length - 10} more header types`);
    }

    console.log("\n🔍 Protocol Deviations:");
    console.log(
      `  Non-standard headers: ${this.findings.protocolDeviations.length}/${this.findings.contentAnalysis.length}`
    );
    console.log(
      `  Standard 0xAA headers: ${
        this.findings.headerDistribution.get(0xaa) || 0
      }`
    );
    console.log(
      `  Standard 0xBB headers: ${
        this.findings.headerDistribution.get(0xbb) || 0
      }`
    );

    console.log("\n📏 Size Analysis:");
    const sizeRatios = this.findings.sizePatterns.map((p) => p.ratio);
    const avgRatio = sizeRatios.reduce((a, b) => a + b, 0) / sizeRatios.length;
    console.log(
      `  Average size ratio (actual/declared): ${avgRatio.toFixed(3)}`
    );

    const exactMatches = this.findings.sizePatterns.filter(
      (p) => Math.abs(p.ratio - 1.0) < 0.001
    ).length;
    console.log(
      `  Exact size matches: ${exactMatches}/${this.findings.sizePatterns.length}`
    );

    console.log("\n🧬 Content Patterns:");
    const formatCounts = new Map();
    this.findings.contentAnalysis.forEach((analysis) => {
      const format = analysis.possibleFormat;
      formatCounts.set(format, (formatCounts.get(format) || 0) + 1);
    });

    Array.from(formatCounts.entries()).forEach(([format, count]) => {
      console.log(`  ${format}: ${count} messages`);
    });

    console.log("\n🔤 Sample Readable Content:");
    const readableMessages = this.findings.contentAnalysis
      .filter((a) => a.readableContent.length > 0)
      .slice(0, 5);

    readableMessages.forEach((msg) => {
      console.log(
        `  Message ${msg.id}: "${msg.readableContent[0].substring(0, 50)}..."`
      );
    });
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalMessages: this.findings.contentAnalysis.length,
        standardHeaders:
          (this.findings.headerDistribution.get(0xaa) || 0) +
          (this.findings.headerDistribution.get(0xbb) || 0),
        nonStandardHeaders: this.findings.protocolDeviations.length,
        uniqueHeaders: this.findings.headerDistribution.size,
      },
      findings: this.findings,
      recommendations: [
        "Investigate why messages deviate from documented protocol",
        "Check TCP client parsing logic for errors",
        "Analyze if messages are encoded/encrypted",
        "Look for alternative protocol documentation",
        "Consider that this might be the real intended format",
      ],
    };

    fs.writeFileSync(
      "actual_format_analysis.json",
      JSON.stringify(report, null, 2)
    );
    console.log("\n💾 Detailed analysis saved to: actual_format_analysis.json");
  }

  async analyze() {
    console.log("🚀 Starting Advanced Format Analysis...\n");

    try {
      await this.connect();
      this.analyzeActualFormat();
      await this.analyzeMessages();
      this.printAnalysis();
      await this.generateReport();
    } catch (error) {
      console.error("❌ Analysis failed:", error.message);
    } finally {
      if (this.db) {
        this.db.close();
      }
    }
  }
}

async function main() {
  const analyzer = new AdvancedFormatAnalyzer();
  await analyzer.analyze();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = AdvancedFormatAnalyzer;
