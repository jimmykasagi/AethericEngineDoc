#!/usr/bin/env node
/**
 * Binary Message Analyzer for Aetheric Engine
 * AI-Assisted
 *
 * Analyzes binary content stored in msgbinary table to discover:
 * - Message types (0xAA, 0xBB, unknown)
 * - Fragmented messages
 * - Hidden patterns and readable content
 * - Message integrity validation
 * - Statistical analysis
 */

const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

class BinaryAnalyzer {
  constructor(dbPath = "./aetheric_messages.db") {
    this.dbPath = dbPath;
    this.db = null;
    this.fragments = new Map();
    this.results = {
      totalMessages: 0,
      messageTypes: {
        "0xAA": 0,
        "0xBB": 0,
        unknown: 0,
        corrupted: 0,
      },
      fragments: [],
      completeMessages: [],
      hiddenContent: [],
      statistics: {},
      integrityIssues: [],
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

  async getAllBinaryMessages() {
    return new Promise((resolve, reject) => {
      const query =
        "SELECT id, payload, size, timestamp FROM msgbinary ORDER BY id";
      this.db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  analyzeMessageType(payload) {
    if (!payload || payload.length === 0) {
      return "corrupted";
    }

    const header = payload[0];
    switch (header) {
      case 0xaa:
        return "0xAA";
      case 0xbb:
        return "0xBB";
      default:
        return "unknown";
    }
  }

  validateMessageIntegrity(payload) {
    const issues = [];

    if (!payload || payload.length < 6) {
      issues.push("Message too short for valid binary format");
      return { isValid: false, issues };
    }

    try {
      // Extract declared size (5 bytes starting at offset 1)
      const sizeBytes = payload.slice(1, 6);
      const declaredSize = this.bytesToInt(sizeBytes);
      const actualPayloadSize = payload.length - 6;

      if (declaredSize !== actualPayloadSize) {
        if (declaredSize > actualPayloadSize) {
          issues.push(
            `Fragment detected: declared ${declaredSize}, actual ${actualPayloadSize}`
          );
        } else {
          issues.push(
            `Size mismatch: declared ${declaredSize}, actual ${actualPayloadSize}`
          );
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
        declaredSize,
        actualPayloadSize,
        isFragment: declaredSize > actualPayloadSize,
      };
    } catch (error) {
      issues.push(`Error parsing size field: ${error.message}`);
      return { isValid: false, issues };
    }
  }

  bytesToInt(bytes) {
    let result = 0;
    for (let i = 0; i < bytes.length; i++) {
      result = (result << 8) + bytes[i];
    }
    return result;
  }

  extractHiddenContent(payload) {
    const findings = [];

    if (payload.length <= 6) return findings;

    const data = payload.slice(6); // Skip header + size

    // Check for readable text
    try {
      const text = data.toString("utf8");
      const printableChars = text.match(/[\x20-\x7E]/g);
      if (printableChars && printableChars.length > data.length * 0.3) {
        findings.push({
          type: "readable_text",
          content: text.substring(0, 200) + (text.length > 200 ? "..." : ""),
          confidence:
            ((printableChars.length / data.length) * 100).toFixed(2) + "%",
        });
      }
    } catch (e) {
      // Not valid UTF-8
    }

    // Check for patterns
    const entropy = this.calculateEntropy(data);
    if (entropy < 3.0) {
      findings.push({
        type: "low_entropy",
        entropy: entropy.toFixed(3),
        description: "Possible pattern or repeated data",
      });
    }

    // Check for null sequences
    const nullMatches = data.toString("hex").match(/00{4,}/g);
    if (nullMatches) {
      findings.push({
        type: "null_sequences",
        count: nullMatches.length,
        description: "Contains long null byte sequences",
      });
    }

    // Check for magic bytes/signatures
    const hex = data.toString("hex");
    const magicSignatures = {
      ffd8ff: "JPEG image",
      "89504e47": "PNG image",
      "504b0304": "ZIP archive",
      "255044462d": "PDF document",
      474946383761: "GIF image",
    };

    for (const [signature, description] of Object.entries(magicSignatures)) {
      if (hex.startsWith(signature)) {
        findings.push({
          type: "file_signature",
          signature,
          description,
        });
      }
    }

    return findings;
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

  detectFragmentGroups() {
    const fragmentGroups = new Map();

    for (const fragment of this.results.fragments) {
      // Simple grouping by declared size and message type
      const key = `${fragment.messageType}_${fragment.declaredSize}`;
      if (!fragmentGroups.has(key)) {
        fragmentGroups.set(key, []);
      }
      fragmentGroups.get(key).push(fragment);
    }

    return Array.from(fragmentGroups.entries()).map(([key, fragments]) => ({
      groupKey: key,
      fragments: fragments.sort((a, b) => a.id - b.id),
      totalFragments: fragments.length,
      totalSize: fragments.reduce((sum, f) => sum + f.actualPayloadSize, 0),
    }));
  }

  generateStatistics() {
    const stats = {
      messageTypeDistribution: { ...this.results.messageTypes },
      fragmentationRate:
        (
          (this.results.fragments.length / this.results.totalMessages) *
          100
        ).toFixed(2) + "%",
      averageMessageSize: 0,
      sizeDistribution: {
        small: 0, // < 1KB
        medium: 0, // 1KB - 1MB
        large: 0, // 1MB - 100MB
        huge: 0, // > 100MB
      },
      hiddenContentTypes: {},
    };

    let totalSize = 0;
    for (const msg of [
      ...this.results.completeMessages,
      ...this.results.fragments,
    ]) {
      totalSize += msg.actualPayloadSize || 0;

      const size = msg.actualPayloadSize || 0;
      if (size < 1024) stats.sizeDistribution.small++;
      else if (size < 1024 * 1024) stats.sizeDistribution.medium++;
      else if (size < 100 * 1024 * 1024) stats.sizeDistribution.large++;
      else stats.sizeDistribution.huge++;
    }

    stats.averageMessageSize = Math.round(
      totalSize / this.results.totalMessages
    );

    // Count hidden content types
    for (const content of this.results.hiddenContent) {
      for (const finding of content.findings) {
        stats.hiddenContentTypes[finding.type] =
          (stats.hiddenContentTypes[finding.type] || 0) + 1;
      }
    }

    return stats;
  }

  async analyze() {
    console.log("🔍 Starting Binary Message Analysis...\n");

    try {
      await this.connect();
      const messages = await this.getAllBinaryMessages();

      console.log(`📊 Found ${messages.length} binary messages to analyze\n`);
      this.results.totalMessages = messages.length;

      let processedCount = 0;
      for (const message of messages) {
        processedCount++;
        if (processedCount % 100 === 0) {
          console.log(
            `Progress: ${processedCount}/${messages.length} messages analyzed`
          );
        }

        const messageType = this.analyzeMessageType(message.payload);
        this.results.messageTypes[messageType]++;

        const integrity = this.validateMessageIntegrity(message.payload);
        const hiddenContent = this.extractHiddenContent(message.payload);

        const analysis = {
          id: message.id,
          messageType,
          declaredSize: integrity.declaredSize || 0,
          actualPayloadSize: integrity.actualPayloadSize || 0,
          isFragment: integrity.isFragment,
          timestamp: message.timestamp,
          findings: hiddenContent,
        };

        if (integrity.isFragment) {
          this.results.fragments.push(analysis);
        } else if (integrity.isValid) {
          this.results.completeMessages.push(analysis);
        }

        if (!integrity.isValid) {
          this.results.integrityIssues.push({
            id: message.id,
            issues: integrity.issues,
          });
        }

        if (hiddenContent.length > 0) {
          this.results.hiddenContent.push({
            id: message.id,
            findings: hiddenContent,
          });
        }
      }

      this.results.statistics = this.generateStatistics();
      this.results.fragmentGroups = this.detectFragmentGroups();

      console.log("\n✅ Analysis complete!\n");
      this.printSummary();
    } catch (error) {
      console.error("❌ Analysis failed:", error.message);
    } finally {
      if (this.db) {
        this.db.close();
      }
    }
  }

  printSummary() {
    console.log("=== BINARY MESSAGE ANALYSIS SUMMARY ===\n");

    console.log("📈 Message Type Distribution:");
    for (const [type, count] of Object.entries(this.results.messageTypes)) {
      const percentage = ((count / this.results.totalMessages) * 100).toFixed(
        1
      );
      console.log(`  ${type}: ${count} (${percentage}%)`);
    }

    console.log(`\n🧩 Fragmentation:`);
    console.log(`  Total fragments: ${this.results.fragments.length}`);
    console.log(`  Fragment groups: ${this.results.fragmentGroups.length}`);
    console.log(
      `  Fragmentation rate: ${this.results.statistics.fragmentationRate}`
    );

    console.log(`\n🔍 Hidden Content:`);
    console.log(
      `  Messages with hidden content: ${this.results.hiddenContent.length}`
    );
    for (const [type, count] of Object.entries(
      this.results.statistics.hiddenContentTypes
    )) {
      console.log(`  ${type}: ${count}`);
    }

    console.log(`\n📏 Size Distribution:`);
    for (const [size, count] of Object.entries(
      this.results.statistics.sizeDistribution
    )) {
      console.log(`  ${size}: ${count}`);
    }

    console.log(
      `\n⚠️  Integrity Issues: ${this.results.integrityIssues.length}`
    );

    if (this.results.fragmentGroups.length > 0) {
      console.log(`\n🔗 Fragment Groups:`);
      this.results.fragmentGroups.slice(0, 5).forEach((group, i) => {
        console.log(
          `  Group ${i + 1}: ${group.fragments.length} fragments, ${
            group.totalSize
          } bytes total`
        );
      });
      if (this.results.fragmentGroups.length > 5) {
        console.log(
          `  ... and ${this.results.fragmentGroups.length - 5} more groups`
        );
      }
    }
  }

  async saveReport(filename = "binary_analysis_report.json") {
    const reportPath = path.join(process.cwd(), filename);
    try {
      fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
      console.log(`\n💾 Detailed report saved to: ${reportPath}`);
    } catch (error) {
      console.error(`❌ Failed to save report: ${error.message}`);
    }
  }

  async exportFragments(filename = "fragments_for_reconstruction.json") {
    const fragmentData = {
      fragmentGroups: this.results.fragmentGroups,
      individualFragments: this.results.fragments,
      metadata: {
        totalFragments: this.results.fragments.length,
        totalGroups: this.results.fragmentGroups.length,
        analysisTimestamp: new Date().toISOString(),
      },
    };

    try {
      fs.writeFileSync(filename, JSON.stringify(fragmentData, null, 2));
      console.log(`\n🧩 Fragment data exported to: ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to export fragments: ${error.message}`);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const analyzer = new BinaryAnalyzer();

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Binary Message Analyzer for Aetheric Engine

Usage: node binary_analyzer.js [options]

Options:
  --save-report [filename]    Save detailed JSON report (default: binary_analysis_report.json)
  --export-fragments [file]   Export fragment data for reconstruction
  --help, -h                  Show this help message

Examples:
  node binary_analyzer.js
  node binary_analyzer.js --save-report my_report.json
  node binary_analyzer.js --export-fragments fragments.json
        `);
    return;
  }

  await analyzer.analyze();

  if (args.includes("--save-report")) {
    const reportIndex = args.indexOf("--save-report");
    const filename = args[reportIndex + 1] || "binary_analysis_report.json";
    await analyzer.saveReport(filename);
  }

  if (args.includes("--export-fragments")) {
    const fragmentIndex = args.indexOf("--export-fragments");
    const filename =
      args[fragmentIndex + 1] || "fragments_for_reconstruction.json";
    await analyzer.exportFragments(filename);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = BinaryAnalyzer;
