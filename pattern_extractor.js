#!/usr/bin/env node

/**
 * Aetheric Engine Pattern Extractor
 * AI-Assisted
 *
 * Final analysis to extract systematic patterns that might reveal hidden messages
 */

const sqlite3 = require("sqlite3").verbose();

class PatternExtractor {
  constructor(dbPath) {
    this.db = new sqlite3.Database(dbPath);
  }

  async extractSystematicPatterns() {
    console.log("🎯 EXTRACTING SYSTEMATIC PATTERNS...\n");

    await this.extractPositionalPatterns();
    await this.extractFrequencyPatterns();
    await this.extractBinaryPatterns();
    await this.extractTemporalPatterns();

    this.close();
  }

  extractPositionalPatterns() {
    return new Promise((resolve) => {
      console.log("📍 POSITIONAL PATTERN EXTRACTION...");

      this.db.all(
        "SELECT rowid, payload FROM msgascii ORDER BY rowid",
        (err, rows) => {
          if (err) {
            console.error(err);
            resolve();
            return;
          }

          // Extract patterns based on message position
          let patterns = {};

          // First character of every nth message
          for (let n of [2, 3, 5, 7, 10, 13]) {
            let pattern = "";
            for (let i = 0; i < rows.length; i += n) {
              if (rows[i] && rows[i].payload.length > 0) {
                pattern += rows[i].payload.charAt(0);
              }
            }
            patterns[`first_char_every_${n}`] = pattern;
          }

          // Middle character of each message
          let middleChars = "";
          rows.forEach((row) => {
            if (row.payload.length > 0) {
              const middle = Math.floor(row.payload.length / 2);
              middleChars += row.payload.charAt(middle);
            }
          });
          patterns["middle_chars"] = middleChars;

          // Last character of each message
          let lastChars = "";
          rows.forEach((row) => {
            if (row.payload.length > 0) {
              lastChars += row.payload.charAt(row.payload.length - 1);
            }
          });
          patterns["last_chars"] = lastChars;

          console.log("\n   📊 Positional Patterns Found:");
          Object.entries(patterns).forEach(([name, pattern]) => {
            console.log(
              `   ${name}: "${pattern.substring(0, 50)}${
                pattern.length > 50 ? "..." : ""
              }"`
            );

            // Check if this looks like readable text
            const readableScore = this.calculateReadabilityScore(pattern);
            if (readableScore > 0.3) {
              console.log(
                `      ⭐ High readability score: ${readableScore.toFixed(3)}`
              );
            }
          });

          resolve();
        }
      );
    });
  }

  extractFrequencyPatterns() {
    return new Promise((resolve) => {
      console.log("\n🔢 FREQUENCY PATTERN ANALYSIS...");

      this.db.all("SELECT payload FROM msgascii", (err, rows) => {
        if (err) {
          console.error(err);
          resolve();
          return;
        }

        // Character frequency analysis across all messages
        let totalFreq = {};
        let totalChars = 0;

        rows.forEach((row) => {
          for (let char of row.payload) {
            totalFreq[char] = (totalFreq[char] || 0) + 1;
            totalChars++;
          }
        });

        // Sort by frequency
        const sortedFreq = Object.entries(totalFreq)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 20);

        console.log("   📈 Top 20 Most Frequent Characters:");
        sortedFreq.forEach(([char, count], index) => {
          const freq = ((count / totalChars) * 100).toFixed(2);
          const displayChar =
            char === " " ? "SPACE" : char === "\n" ? "NEWLINE" : char;
          const indexStr = (index + 1).toString().padStart(2);
          console.log(
            `   ${indexStr}. "${displayChar}" - ${count} times (${freq}%)`
          );
        });

        // Check if frequency distribution matches expected English text
        const englishFreq = {
          e: 12.7,
          t: 9.1,
          a: 8.2,
          o: 7.5,
          i: 7.0,
          n: 6.7,
          s: 6.3,
          h: 6.1,
          r: 6.0,
          d: 4.3,
          l: 4.0,
          c: 2.8,
        };

        console.log("\n   🔍 Comparing with English letter frequencies...");
        let similarityScore = 0;
        let comparisons = 0;

        Object.entries(englishFreq).forEach(([letter, expectedFreq]) => {
          const actualCount = totalFreq[letter] || 0;
          const actualFreq = (actualCount / totalChars) * 100;
          const diff = Math.abs(expectedFreq - actualFreq);
          similarityScore += Math.max(0, 5 - diff); // Score decreases with difference
          comparisons++;
          console.log(
            `   ${letter}: Expected ${expectedFreq}%, Actual ${actualFreq.toFixed(
              2
            )}%, Diff: ${diff.toFixed(2)}%`
          );
        });

        const avgSimilarity = similarityScore / comparisons;
        console.log(
          `   📊 English similarity score: ${avgSimilarity.toFixed(2)}/5.0`
        );

        if (avgSimilarity > 2.5) {
          console.log("   🚨 High similarity to English text detected!");
        } else {
          console.log(
            "   ✅ Frequency distribution appears random as expected"
          );
        }

        resolve();
      });
    });
  }

  extractBinaryPatterns() {
    return new Promise((resolve) => {
      console.log("\n🔢 BINARY MESSAGE ANALYSIS...");

      this.db.all("SELECT payload FROM msgbinary", (err, rows) => {
        if (err) {
          console.error(err);
          resolve();
          return;
        }

        console.log(`   Analyzing ${rows.length} binary messages...`);

        // Check for patterns in binary data
        let patterns = {
          magicNumbers: {},
          repeatedBytes: {},
          sequentialBytes: 0,
        };

        rows.forEach((row, index) => {
          const bytes = Buffer.isBuffer(row.payload)
            ? Array.from(row.payload)
            : Array.from(new Uint8Array(row.payload));

          // Check for magic numbers (first few bytes)
          if (bytes.length >= 4) {
            const magic = bytes
              .slice(0, 4)
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
            patterns.magicNumbers[magic] =
              (patterns.magicNumbers[magic] || 0) + 1;
          }

          // Check for repeated bytes
          for (let i = 0; i < bytes.length - 1; i++) {
            if (bytes[i] === bytes[i + 1]) {
              const byte = bytes[i].toString(16).padStart(2, "0");
              patterns.repeatedBytes[byte] =
                (patterns.repeatedBytes[byte] || 0) + 1;
            }
          }

          // Check for sequential bytes
          for (let i = 0; i < bytes.length - 2; i++) {
            if (
              bytes[i + 1] === bytes[i] + 1 &&
              bytes[i + 2] === bytes[i + 1] + 1
            ) {
              patterns.sequentialBytes++;
            }
          }
        });

        console.log("\n   🔍 Binary Patterns Found:");

        // Show most common magic numbers
        const topMagic = Object.entries(patterns.magicNumbers)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5);
        console.log("   Top Magic Numbers (first 4 bytes):");
        topMagic.forEach(([magic, count]) => {
          console.log(`     0x${magic}: ${count} times`);
        });

        // Show most repeated bytes
        const topRepeated = Object.entries(patterns.repeatedBytes)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5);
        console.log("   Most Repeated Bytes:");
        topRepeated.forEach(([byte, count]) => {
          console.log(`     0x${byte}: ${count} repetitions`);
        });

        console.log(
          `   Sequential byte patterns found: ${patterns.sequentialBytes}`
        );

        resolve();
      });
    });
  }

  extractTemporalPatterns() {
    return new Promise((resolve) => {
      console.log("\n⏰ TEMPORAL PATTERN ANALYSIS...");

      // Analyze patterns based on message ordering
      this.db.all(
        "SELECT rowid, payload FROM msgascii ORDER BY rowid LIMIT 100",
        (err, rows) => {
          if (err) {
            console.error(err);
            resolve();
            return;
          }

          console.log(
            "   Analyzing first 100 messages for temporal patterns..."
          );

          // Check if message lengths follow a pattern
          const lengths = rows.map((row) => row.payload.length);
          console.log(
            `   Message lengths: ${lengths.slice(0, 20).join(", ")}...`
          );

          // Check for mathematical progressions
          let arithmetic = true;
          let geometric = true;
          if (lengths.length > 2) {
            const diff1 = lengths[1] - lengths[0];
            const ratio1 = lengths[1] / lengths[0];

            for (let i = 2; i < Math.min(lengths.length, 10); i++) {
              if (lengths[i] - lengths[i - 1] !== diff1) {
                arithmetic = false;
              }
              if (Math.abs(lengths[i] / lengths[i - 1] - ratio1) > 0.1) {
                geometric = false;
              }
            }
          }

          if (arithmetic && lengths.length > 2) {
            console.log(
              "   🚨 Arithmetic progression detected in message lengths!"
            );
          } else if (geometric && lengths.length > 2) {
            console.log(
              "   🚨 Geometric progression detected in message lengths!"
            );
          } else {
            console.log("   ✅ No obvious mathematical progression in lengths");
          }

          // Check for cyclic patterns in first characters
          const firstChars = rows.map((row) => row.payload.charAt(0)).join("");
          console.log(
            `   First chars pattern: "${firstChars.substring(0, 50)}..."`
          );

          // Look for repeating subsequences
          for (let len = 2; len <= 10; len++) {
            for (let start = 0; start <= firstChars.length - len * 2; start++) {
              const pattern = firstChars.substring(start, start + len);
              const nextOccurrence = firstChars.indexOf(pattern, start + len);
              if (nextOccurrence === start + len) {
                console.log(
                  `   🔄 Repeating pattern found: "${pattern}" at positions ${start} and ${nextOccurrence}`
                );
              }
            }
          }

          resolve();
        }
      );
    });
  }

  calculateReadabilityScore(text) {
    // Simple readability score based on common English patterns
    let score = 0;
    const commonLetters = "etaoinshrdlcumwfgypbvkjxqz";
    const vowels = "aeiou";

    // Check letter frequency distribution
    const letterCounts = {};
    let totalLetters = 0;

    for (let char of text.toLowerCase()) {
      if (char.match(/[a-z]/)) {
        letterCounts[char] = (letterCounts[char] || 0) + 1;
        totalLetters++;
      }
    }

    if (totalLetters === 0) return 0;

    // Score based on presence of common letters
    for (let i = 0; i < Math.min(5, commonLetters.length); i++) {
      const letter = commonLetters[i];
      const frequency = (letterCounts[letter] || 0) / totalLetters;
      score += frequency; // Higher score for common letters
    }

    // Bonus for vowel-consonant patterns
    let vowelConsonantScore = 0;
    for (let i = 0; i < text.length - 1; i++) {
      const char1 = text[i].toLowerCase();
      const char2 = text[i + 1].toLowerCase();
      if (char1.match(/[a-z]/) && char2.match(/[a-z]/)) {
        const isVowel1 = vowels.includes(char1);
        const isVowel2 = vowels.includes(char2);
        if (isVowel1 !== isVowel2) {
          // Alternating vowel-consonant
          vowelConsonantScore += 0.1;
        }
      }
    }

    return Math.min(1.0, score + vowelConsonantScore / text.length);
  }

  close() {
    this.db.close();
    console.log("\n✅ Pattern extraction complete!");
  }
}

// Run the extractor if this script is executed directly
if (require.main === module) {
  const extractor = new PatternExtractor("aetheric_messages.db");
  extractor.extractSystematicPatterns().catch(console.error);
}

module.exports = PatternExtractor;
