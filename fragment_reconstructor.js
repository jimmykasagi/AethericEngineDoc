#!/usr/bin/env node
/**
 * Fragment Reconstructor for Aetheric Engine
 * AI-Assisted
 *
 * Attempts to reconstruct fragmented messages from the msgbinary table
 * based on analysis from binary_analyzer.js
 */

const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const crypto = require("crypto");

class FragmentReconstructor {
  constructor(dbPath = "./aetheric_messages.db") {
    this.dbPath = dbPath;
    this.db = null;
    this.reconstructedMessages = [];
    this.failedReconstructions = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getFragmentedMessages() {
    return new Promise((resolve, reject) => {
      const query = `
                SELECT id, payload, size, timestamp 
                FROM msgbinary 
                WHERE length(payload) >= 6
                ORDER BY id
            `;
      this.db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  analyzeMessage(payload) {
    if (!payload || payload.length < 6) {
      return null;
    }

    const header = payload[0];
    const sizeBytes = payload.slice(1, 6);
    const declaredSize = this.bytesToInt(sizeBytes);
    const actualData = payload.slice(6);
    const actualSize = actualData.length;

    return {
      header,
      declaredSize,
      actualSize,
      actualData,
      isFragment: declaredSize > actualSize,
      isComplete: declaredSize === actualSize,
      isOversized: declaredSize < actualSize,
    };
  }

  bytesToInt(bytes) {
    let result = 0;
    for (let i = 0; i < bytes.length; i++) {
      result = (result << 8) + bytes[i];
    }
    return result;
  }

  intToBytes(num, byteCount) {
    const bytes = new Uint8Array(byteCount);
    for (let i = byteCount - 1; i >= 0; i--) {
      bytes[i] = num & 0xff;
      num = num >>> 8;
    }
    return bytes;
  }

  groupFragmentsBySignature(fragments) {
    const groups = new Map();

    for (const fragment of fragments) {
      const analysis = this.analyzeMessage(fragment.payload);
      if (!analysis || !analysis.isFragment) continue;

      // Create a signature based on header, declared size, and first few bytes of data
      const dataPreview = analysis.actualData.slice(
        0,
        Math.min(16, analysis.actualData.length)
      );
      const signature = `${analysis.header.toString(16)}_${
        analysis.declaredSize
      }_${Buffer.from(dataPreview).toString("hex")}`;

      if (!groups.has(signature)) {
        groups.set(signature, {
          header: analysis.header,
          declaredSize: analysis.declaredSize,
          fragments: [],
          totalCollectedSize: 0,
        });
      }

      const group = groups.get(signature);
      group.fragments.push({
        id: fragment.id,
        data: analysis.actualData,
        timestamp: fragment.timestamp,
        actualSize: analysis.actualSize,
      });
      group.totalCollectedSize += analysis.actualSize;
    }

    return Array.from(groups.entries()).map(([signature, group]) => ({
      signature,
      ...group,
      isComplete: group.totalCollectedSize >= group.declaredSize,
      missingBytes: Math.max(0, group.declaredSize - group.totalCollectedSize),
    }));
  }

  attemptReconstruction(fragmentGroup) {
    const { header, declaredSize, fragments } = fragmentGroup;

    // Sort fragments by timestamp (assuming they arrive in order)
    const sortedFragments = [...fragments].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Try simple concatenation first
    let reconstructedData = Buffer.concat(
      sortedFragments.map((f) => Buffer.from(f.data))
    );

    // If we have too much data, try different combinations
    if (reconstructedData.length > declaredSize) {
      // Try removing duplicates or overlapping data
      reconstructedData = this.removeDuplicateChunks(
        sortedFragments,
        declaredSize
      );
    }

    // Create complete message
    const headerByte = Buffer.from([header]);
    const sizeBytes = Buffer.from(this.intToBytes(declaredSize, 5));
    const completeMessage = Buffer.concat([
      headerByte,
      sizeBytes,
      reconstructedData.slice(0, declaredSize),
    ]);

    return {
      success: reconstructedData.length >= declaredSize,
      message: completeMessage,
      reconstructedSize: reconstructedData.length,
      declaredSize,
      fragmentsUsed: sortedFragments.length,
      quality: this.assessReconstructionQuality(
        reconstructedData,
        declaredSize
      ),
    };
  }

  removeDuplicateChunks(fragments, targetSize) {
    // Simple strategy: if total size exceeds target, keep first fragments until we reach target
    let totalSize = 0;
    const uniqueFragments = [];

    for (const fragment of fragments) {
      if (totalSize + fragment.data.length <= targetSize) {
        uniqueFragments.push(fragment);
        totalSize += fragment.data.length;
      } else if (totalSize < targetSize) {
        // Take partial fragment to reach exact size
        const remainingBytes = targetSize - totalSize;
        const partialData = fragment.data.slice(0, remainingBytes);
        uniqueFragments.push({ ...fragment, data: partialData });
        break;
      }
    }

    return Buffer.concat(uniqueFragments.map((f) => Buffer.from(f.data)));
  }

  assessReconstructionQuality(data, expectedSize) {
    const sizeMatch =
      data.length >= expectedSize ? 1.0 : data.length / expectedSize;
    const entropy = this.calculateEntropy(data);
    const hasPatterns = this.detectPatterns(data);

    return {
      sizeMatch: (sizeMatch * 100).toFixed(1) + "%",
      entropy: entropy.toFixed(3),
      likelyValid: sizeMatch >= 0.95 && entropy > 2.0,
      hasPatterns,
    };
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

  detectPatterns(data) {
    // Check for repeated sequences that might indicate successful reconstruction
    const text = data.toString("hex");
    const patterns = {
      repeatingBytes: /(.{2})\1{10,}/.test(text),
      nullSequences: /00{20,}/.test(text),
      asciiLike:
        data.filter((b) => b >= 32 && b <= 126).length > data.length * 0.3,
    };

    return patterns;
  }

  async saveReconstructedMessage(reconstruction, originalGroup, index) {
    const filename = `reconstructed_message_${index + 1}.bin`;
    const metaFilename = `reconstructed_message_${index + 1}_meta.json`;

    try {
      // Save binary data
      fs.writeFileSync(filename, reconstruction.message);

      // Save metadata
      const metadata = {
        originalFragments: originalGroup.fragments.map((f) => ({
          id: f.id,
          timestamp: f.timestamp,
          size: f.actualSize,
        })),
        reconstruction: {
          success: reconstruction.success,
          declaredSize: reconstruction.declaredSize,
          reconstructedSize: reconstruction.reconstructedSize,
          quality: reconstruction.quality,
          fragmentsUsed: reconstruction.fragmentsUsed,
        },
        signature: originalGroup.signature,
        reconstructionTimestamp: new Date().toISOString(),
      };

      fs.writeFileSync(metaFilename, JSON.stringify(metadata, null, 2));

      console.log(
        `💾 Saved: ${filename} (${reconstruction.message.length} bytes)`
      );
      console.log(`📋 Metadata: ${metaFilename}`);
    } catch (error) {
      console.error(
        `❌ Failed to save reconstruction ${index + 1}: ${error.message}`
      );
    }
  }

  async reconstructFragments() {
    console.log("🔧 Starting Fragment Reconstruction...\n");

    try {
      await this.connect();
      const messages = await this.getFragmentedMessages();

      console.log(
        `📊 Analyzing ${messages.length} messages for fragments...\n`
      );

      const fragmentGroups = this.groupFragmentsBySignature(messages);
      console.log(
        `🧩 Found ${fragmentGroups.length} potential fragment groups\n`
      );

      let successfulReconstructions = 0;

      for (let i = 0; i < fragmentGroups.length; i++) {
        const group = fragmentGroups[i];

        console.log(`\n--- Fragment Group ${i + 1} ---`);
        console.log(`Header: 0x${group.header.toString(16).toUpperCase()}`);
        console.log(`Declared size: ${group.declaredSize} bytes`);
        console.log(`Fragments: ${group.fragments.length}`);
        console.log(`Collected: ${group.totalCollectedSize} bytes`);
        console.log(`Missing: ${group.missingBytes} bytes`);

        if (group.fragments.length < 2) {
          console.log(`⚠️  Skipping: Not enough fragments`);
          continue;
        }

        const reconstruction = this.attemptReconstruction(group);

        if (reconstruction.success) {
          console.log(`✅ Reconstruction successful!`);
          console.log(
            `Quality: ${reconstruction.quality.sizeMatch} size match, entropy ${reconstruction.quality.entropy}`
          );

          await this.saveReconstructedMessage(
            reconstruction,
            group,
            successfulReconstructions
          );
          this.reconstructedMessages.push({
            group: i + 1,
            reconstruction,
            originalGroup: group,
          });
          successfulReconstructions++;
        } else {
          console.log(`❌ Reconstruction failed`);
          console.log(
            `Reason: Insufficient data (${reconstruction.reconstructedSize}/${reconstruction.declaredSize} bytes)`
          );
          this.failedReconstructions.push({
            group: i + 1,
            reason: "Insufficient data",
            originalGroup: group,
          });
        }
      }

      console.log(`\n=== RECONSTRUCTION SUMMARY ===`);
      console.log(`✅ Successful: ${successfulReconstructions}`);
      console.log(`❌ Failed: ${this.failedReconstructions.length}`);
      console.log(`📊 Total groups processed: ${fragmentGroups.length}`);

      // Save summary report
      const summaryReport = {
        reconstructedMessages: this.reconstructedMessages,
        failedReconstructions: this.failedReconstructions,
        statistics: {
          totalGroups: fragmentGroups.length,
          successful: successfulReconstructions,
          failed: this.failedReconstructions.length,
          successRate: `${(
            (successfulReconstructions / fragmentGroups.length) *
            100
          ).toFixed(1)}%`,
        },
        timestamp: new Date().toISOString(),
      };

      fs.writeFileSync(
        "reconstruction_report.json",
        JSON.stringify(summaryReport, null, 2)
      );
      console.log(`\n💾 Summary report saved to: reconstruction_report.json`);
    } catch (error) {
      console.error("❌ Reconstruction failed:", error.message);
    } finally {
      if (this.db) {
        this.db.close();
      }
    }
  }
}

// CLI Interface
async function main() {
  const reconstructor = new FragmentReconstructor();
  await reconstructor.reconstructFragments();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = FragmentReconstructor;
