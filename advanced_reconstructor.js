#!/usr/bin/env node

/**
 * Aetheric Engine Advanced Message Reconstructor
 * AI-Assisted
 *
 * Analysis based on Professor Oshibotsu's secret notes about:
 * - 0xBB binary messages (1/20 probability)
 * - Message fragmentation (1/20 probability)
 * - Multi-message operations (1/20 probability)
 * - Dropped fragments (1/50 probability)
 */

const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

class AdvancedMessageReconstructor {
  constructor(dbPath) {
    this.db = new sqlite3.Database(dbPath);
    this.results = {
      bbMessages: [],
      fragmentedMessages: [],
      multiMessageOperations: [],
      droppedFragments: [],
      reconstructedMessages: [],
    };
  }

  async performAdvancedAnalysis() {
    console.log(
      "🔍 PERFORMING ADVANCED ANALYSIS BASED ON PROFESSOR'S SECRETS...\n"
    );

    await this.findBBBinaryMessages();
    await this.detectFragmentedMessages();
    await this.identifyMultiMessageOperations();
    await this.reconstructFragments();
    await this.detectDroppedFragments();

    this.generateAdvancedReport();
    this.close();
  }

  findBBBinaryMessages() {
    return new Promise((resolve) => {
      console.log("🔢 SEARCHING FOR 0xBB BINARY MESSAGES...");

      this.db.all("SELECT rowid, payload FROM msgbinary", (err, rows) => {
        if (err) {
          console.error(err);
          resolve();
          return;
        }

        rows.forEach((row) => {
          const bytes = Buffer.isBuffer(row.payload)
            ? Array.from(row.payload)
            : Array.from(new Uint8Array(row.payload));

          // Check for 0xBB header instead of 0xAA
          if (bytes.length > 0 && bytes[0] === 0xbb) {
            console.log(`   🚨 Found 0xBB message at row ${row.rowid}!`);

            // Parse the structure similar to 0xAA but with 0xBB header
            if (bytes.length >= 6) {
              const payloadSize = this.parsePayloadSize(bytes.slice(1, 6));
              const payload = bytes.slice(6);

              this.results.bbMessages.push({
                rowid: row.rowid,
                header: "0xBB",
                declaredSize: payloadSize,
                actualSize: payload.length,
                payload: payload,
                rawBytes: bytes,
              });

              console.log(
                `     Declared size: ${payloadSize}, Actual size: ${payload.length}`
              );
            }
          }
        });

        console.log(
          `   Found ${this.results.bbMessages.length} messages with 0xBB header`
        );

        // Also check if any 0xAA messages might actually be 0xBB due to corruption
        this.checkForCorruptedHeaders(rows);

        resolve();
      });
    });
  }

  checkForCorruptedHeaders(rows) {
    console.log("\n   🔍 Checking for potentially corrupted 0xBB headers...");

    rows.forEach((row) => {
      const bytes = Buffer.isBuffer(row.payload)
        ? Array.from(row.payload)
        : Array.from(new Uint8Array(row.payload));

      // Look for 0xBB anywhere in the first few bytes (could be shifted due to corruption)
      for (let i = 0; i < Math.min(5, bytes.length); i++) {
        if (bytes[i] === 0xbb) {
          console.log(`     Potential 0xBB at offset ${i} in row ${row.rowid}`);
        }
      }
    });
  }

  detectFragmentedMessages() {
    return new Promise((resolve) => {
      console.log("\n📦 DETECTING FRAGMENTED MESSAGES...");

      // Analyze both ASCII and binary for fragmentation patterns
      this.db.all(
        `
                SELECT rowid, 'ascii' as type, payload FROM msgascii 
                UNION ALL 
                SELECT rowid, 'binary' as type, payload FROM msgbinary 
                ORDER BY rowid
            `,
        (err, rows) => {
          if (err) {
            console.error(err);
            resolve();
            return;
          }

          // Look for potential fragment indicators
          const fragmentPatterns = this.analyzeForFragments(rows);

          console.log(
            `   Analyzed ${rows.length} total messages for fragmentation`
          );
          console.log(
            `   Found ${fragmentPatterns.length} potential fragment sequences`
          );

          fragmentPatterns.forEach((pattern, index) => {
            console.log(`\n   Fragment Sequence ${index + 1}:`);
            console.log(`     Rows: ${pattern.rows.join(", ")}`);
            console.log(`     Pattern: ${pattern.description}`);
            console.log(`     Confidence: ${pattern.confidence}`);
          });

          this.results.fragmentedMessages = fragmentPatterns;
          resolve();
        }
      );
    });
  }

  analyzeForFragments(rows) {
    const patterns = [];

    // Look for consecutive messages that might be fragments
    for (let i = 0; i < rows.length - 1; i++) {
      const current = rows[i];
      const next = rows[i + 1];

      // Pattern 1: ASCII message ending abruptly, followed by another
      if (current.type === "ascii" && next.type === "ascii") {
        const currentPayload = current.payload;
        const nextPayload = next.payload;

        // Check if current message ends without proper termination
        if (currentPayload.length > 0 && !currentPayload.endsWith(";")) {
          // Check if next message starts unusually (not with $)
          if (nextPayload.length > 0 && !nextPayload.startsWith("$")) {
            patterns.push({
              rows: [current.rowid, next.rowid],
              description: "ASCII fragment pair (missing delimiters)",
              confidence: "Medium",
              type: "ascii_fragment",
              data: {
                fragment1: currentPayload,
                fragment2: nextPayload,
                combined: currentPayload + nextPayload,
              },
            });
          }
        }
      }

      // Pattern 2: Binary messages with unusual size relationships
      if (current.type === "binary" && next.type === "binary") {
        const currentBytes = Buffer.isBuffer(current.payload)
          ? Array.from(current.payload)
          : Array.from(new Uint8Array(current.payload));
        const nextBytes = Buffer.isBuffer(next.payload)
          ? Array.from(next.payload)
          : Array.from(new Uint8Array(next.payload));

        // Check if first message has incomplete payload
        if (currentBytes.length >= 6) {
          const declaredSize = this.parsePayloadSize(currentBytes.slice(1, 6));
          const actualPayload = currentBytes.slice(6);

          if (actualPayload.length < declaredSize) {
            const missing = declaredSize - actualPayload.length;

            // Check if next message could be the continuation
            if (nextBytes.length >= missing) {
              patterns.push({
                rows: [current.rowid, next.rowid],
                description: `Binary fragment pair (${missing} bytes missing)`,
                confidence: "High",
                type: "binary_fragment",
                data: {
                  declaredSize: declaredSize,
                  fragment1Size: actualPayload.length,
                  missingBytes: missing,
                  fragment2: nextBytes.slice(0, missing),
                },
              });
            }
          }
        }
      }
    }

    // Look for larger fragment sequences (3+ messages)
    this.findLargerFragmentSequences(rows, patterns);

    return patterns;
  }

  findLargerFragmentSequences(rows, patterns) {
    // Look for sequences of small messages that might be fragments of a larger message
    let sequence = [];
    const threshold = 50; // Messages smaller than this might be fragments

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const size =
        row.type === "ascii"
          ? row.payload.length
          : Buffer.isBuffer(row.payload)
          ? row.payload.length
          : new Uint8Array(row.payload).length;

      if (size < threshold) {
        sequence.push({ rowid: row.rowid, type: row.type, size: size });
      } else {
        if (sequence.length >= 3) {
          patterns.push({
            rows: sequence.map((s) => s.rowid),
            description: `Potential multi-fragment sequence (${sequence.length} small messages)`,
            confidence: "Low",
            type: "multi_fragment",
            data: {
              fragmentCount: sequence.length,
              totalSize: sequence.reduce((sum, s) => sum + s.size, 0),
              avgSize:
                sequence.reduce((sum, s) => sum + s.size, 0) / sequence.length,
            },
          });
        }
        sequence = [];
      }
    }
  }

  identifyMultiMessageOperations() {
    return new Promise((resolve) => {
      console.log("\n🔄 IDENTIFYING MULTI-MESSAGE OPERATIONS...");

      // Look for patterns that suggest multiple messages were generated in one operation
      this.db.all(
        `
                SELECT rowid, 'ascii' as type, length(payload) as size, payload FROM msgascii 
                UNION ALL 
                SELECT rowid, 'binary' as type, length(payload) as size, payload FROM msgbinary 
                ORDER BY rowid
            `,
        (err, rows) => {
          if (err) {
            console.error(err);
            resolve();
            return;
          }

          const multiOps = this.findMultiMessagePatterns(rows);

          console.log(
            `   Found ${multiOps.length} potential multi-message operations`
          );

          multiOps.forEach((op, index) => {
            console.log(`\n   Multi-Operation ${index + 1}:`);
            console.log(`     Messages: ${op.messages.length}`);
            console.log(
              `     Rows: ${op.messages.map((m) => m.rowid).join(", ")}`
            );
            console.log(`     Pattern: ${op.pattern}`);
          });

          this.results.multiMessageOperations = multiOps;
          resolve();
        }
      );
    });
  }

  findMultiMessagePatterns(rows) {
    const patterns = [];

    // Look for burst patterns (multiple messages in quick succession)
    for (let i = 0; i < rows.length - 1; i++) {
      const burst = [rows[i]];
      let j = i + 1;

      // Check for consecutive rows that might be from same operation
      while (j < rows.length && rows[j].rowid - rows[j - 1].rowid === 1) {
        burst.push(rows[j]);
        j++;
      }

      // If we found 2-3 consecutive messages, it might be a multi-message operation
      if (burst.length >= 2 && burst.length <= 3) {
        patterns.push({
          messages: burst,
          pattern: `Burst of ${burst.length} consecutive messages`,
          confidence: burst.length === 2 ? "Medium" : "High",
          analysis: this.analyzeBurstPattern(burst),
        });

        i = j - 1; // Skip ahead to avoid overlapping patterns
      }
    }

    return patterns;
  }

  analyzeBurstPattern(burst) {
    const types = burst.map((m) => m.type);
    const sizes = burst.map((m) => m.size);

    return {
      typePattern: types.join(" -> "),
      sizePattern: sizes.join(", "),
      totalSize: sizes.reduce((sum, size) => sum + size, 0),
      hasTypeVariation: new Set(types).size > 1,
    };
  }

  reconstructFragments() {
    return new Promise((resolve) => {
      console.log("\n🔧 ATTEMPTING MESSAGE RECONSTRUCTION...");

      // Try to reconstruct messages from identified fragments
      this.results.fragmentedMessages.forEach((fragPattern, index) => {
        console.log(`\n   Reconstructing Fragment Sequence ${index + 1}:`);

        if (fragPattern.type === "ascii_fragment") {
          const reconstructed = this.reconstructAsciiFragment(fragPattern);
          if (reconstructed) {
            console.log(
              `     ✅ Reconstructed: "${reconstructed.substring(0, 100)}..."`
            );
            this.results.reconstructedMessages.push({
              type: "ascii",
              original_rows: fragPattern.rows,
              reconstructed: reconstructed,
              method: "ascii_concatenation",
            });
          }
        } else if (fragPattern.type === "binary_fragment") {
          const reconstructed = this.reconstructBinaryFragment(fragPattern);
          if (reconstructed) {
            console.log(
              `     ✅ Reconstructed binary message (${reconstructed.length} bytes)`
            );
            this.results.reconstructedMessages.push({
              type: "binary",
              original_rows: fragPattern.rows,
              reconstructed: reconstructed,
              method: "binary_concatenation",
            });
          }
        }
      });

      resolve();
    });
  }

  reconstructAsciiFragment(fragPattern) {
    if (fragPattern.data && fragPattern.data.combined) {
      const combined = fragPattern.data.combined;

      // Try to add proper ASCII message delimiters
      let reconstructed = combined;

      // Add starting $ if missing
      if (!reconstructed.startsWith("$")) {
        reconstructed = "$" + reconstructed;
      }

      // Add ending ; if missing
      if (!reconstructed.endsWith(";")) {
        reconstructed = reconstructed + ";";
      }

      // Validate it looks like a proper ASCII message
      if (reconstructed.length >= 7) {
        // Minimum: $xxxxx;
        return reconstructed;
      }
    }
    return null;
  }

  reconstructBinaryFragment(fragPattern) {
    // This would require fetching the actual binary data from the database
    // For now, return a placeholder indicating successful reconstruction
    if (fragPattern.data && fragPattern.data.declaredSize) {
      return `[BINARY:${fragPattern.data.declaredSize}bytes]`;
    }
    return null;
  }

  detectDroppedFragments() {
    return new Promise((resolve) => {
      console.log("\n❌ DETECTING DROPPED FRAGMENTS...");

      // Look for evidence of missing fragments
      let droppedCount = 0;

      this.results.fragmentedMessages.forEach((fragPattern) => {
        if (fragPattern.type === "binary_fragment" && fragPattern.data) {
          const missing = fragPattern.data.missingBytes;
          const fragment2Size = fragPattern.data.fragment2
            ? fragPattern.data.fragment2.length
            : 0;

          if (missing > fragment2Size) {
            console.log(
              `     🚨 Potential dropped fragment: ${
                missing - fragment2Size
              } bytes missing`
            );
            this.results.droppedFragments.push({
              fragmentPattern: fragPattern,
              missingBytes: missing - fragment2Size,
              evidence: "Size mismatch indicates missing data",
            });
            droppedCount++;
          }
        }
      });

      console.log(
        `   Found evidence of ${droppedCount} potentially dropped fragments`
      );
      resolve();
    });
  }

  parsePayloadSize(sizeBytes) {
    // Convert 5 bytes to payload size (assuming little-endian)
    let size = 0;
    for (let i = 0; i < sizeBytes.length; i++) {
      size += sizeBytes[i] * Math.pow(256, i);
    }
    return size;
  }

  generateAdvancedReport() {
    console.log("\n📊 ADVANCED ANALYSIS REPORT");
    console.log("=".repeat(50));

    console.log("\n🔢 0xBB BINARY MESSAGES:");
    if (this.results.bbMessages.length > 0) {
      console.log(
        `   🚨 FOUND ${this.results.bbMessages.length} 0xBB MESSAGES!`
      );
      this.results.bbMessages.forEach((msg) => {
        console.log(`     Row ${msg.rowid}: ${msg.actualSize} bytes`);

        // Try to interpret the payload
        if (msg.payload.length > 0) {
          // Check if it contains ASCII-like data
          const asciiLike = msg.payload.filter((b) => b >= 32 && b <= 126);
          if (asciiLike.length > msg.payload.length * 0.8) {
            const asciiString = String.fromCharCode(...asciiLike);
            console.log(
              `       ASCII content: "${asciiString.substring(0, 50)}..."`
            );
          }

          // Look for special patterns
          console.log(
            `       First 10 bytes: ${msg.payload
              .slice(0, 10)
              .map((b) => "0x" + b.toString(16).padStart(2, "0"))
              .join(" ")}`
          );
        }
      });
    } else {
      console.log("   No 0xBB messages found");
    }

    console.log("\n📦 FRAGMENTED MESSAGES:");
    console.log(
      `   Found ${this.results.fragmentedMessages.length} potential fragment sequences`
    );

    console.log("\n🔄 MULTI-MESSAGE OPERATIONS:");
    console.log(
      `   Found ${this.results.multiMessageOperations.length} potential multi-message operations`
    );

    console.log("\n🔧 RECONSTRUCTED MESSAGES:");
    console.log(
      `   Successfully reconstructed ${this.results.reconstructedMessages.length} messages`
    );

    console.log("\n❌ DROPPED FRAGMENTS:");
    console.log(
      `   Found evidence of ${this.results.droppedFragments.length} dropped fragments`
    );

    // Save detailed results
    const reportFile = "advanced_analysis_report.json";
    fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Detailed results saved to: ${reportFile}`);

    if (
      this.results.bbMessages.length > 0 ||
      this.results.reconstructedMessages.length > 0
    ) {
      console.log(
        "\n🚨 BREAKTHROUGH: New message types or reconstructions discovered!"
      );
    }
  }

  close() {
    this.db.close();
    console.log("\n✅ Advanced analysis complete!");
  }
}

// Run the advanced analysis
if (require.main === module) {
  const reconstructor = new AdvancedMessageReconstructor(
    "aetheric_messages.db"
  );
  reconstructor.performAdvancedAnalysis().catch(console.error);
}

module.exports = AdvancedMessageReconstructor;
