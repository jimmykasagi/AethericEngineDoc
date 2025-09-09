#!/usr/bin/env node
/**
 * Binary Analysis Suite Runner
 * AI-Assisted
 *
 * Orchestrates the complete binary analysis and reconstruction process
 */

const BinaryAnalyzer = require("./binary_analyzer");
const FragmentReconstructor = require("./fragment_reconstructor");
const fs = require("fs");
const path = require("path");

class BinaryAnalysisSuite {
  constructor() {
    this.results = {
      analysis: null,
      reconstruction: null,
      discoveries: [],
      recommendations: [],
    };
  }

  async runCompleteAnalysis() {
    console.log("🚀 Starting Complete Binary Analysis Suite\n");
    console.log("=".repeat(60));

    try {
      // Step 1: Binary Analysis
      console.log("\n📊 PHASE 1: Binary Message Analysis");
      console.log("-".repeat(40));

      const analyzer = new BinaryAnalyzer();
      await analyzer.analyze();
      await analyzer.saveReport("complete_binary_analysis.json");
      this.results.analysis = analyzer.results;

      // Step 2: Fragment Reconstruction
      console.log("\n🔧 PHASE 2: Fragment Reconstruction");
      console.log("-".repeat(40));

      if (this.results.analysis.fragments.length > 0) {
        const reconstructor = new FragmentReconstructor();
        await reconstructor.reconstructFragments();
        this.results.reconstruction = {
          reconstructed: reconstructor.reconstructedMessages,
          failed: reconstructor.failedReconstructions,
        };
      } else {
        console.log("ℹ️  No fragments detected, skipping reconstruction phase");
      }

      // Step 3: Generate Discoveries
      console.log("\n🔍 PHASE 3: Discovery Analysis");
      console.log("-".repeat(40));

      this.generateDiscoveries();
      this.generateRecommendations();

      // Step 4: Final Report
      console.log("\n📝 PHASE 4: Final Report Generation");
      console.log("-".repeat(40));

      await this.generateFinalReport();

      console.log("\n✅ Complete analysis suite finished successfully!");
      console.log("📁 Check the generated files for detailed results.");
    } catch (error) {
      console.error("❌ Analysis suite failed:", error.message);
      console.error(error.stack);
    }
  }

  generateDiscoveries() {
    const discoveries = [];
    const { analysis } = this.results;

    // Discovery 1: Message Type Analysis
    if (analysis.messageTypes["0xBB"] > 0) {
      discoveries.push({
        type: "CRITICAL",
        title: "0xBB Messages Detected",
        description: `Found ${analysis.messageTypes["0xBB"]} messages with 0xBB header - this type was not documented in Prof Oshibotsu's journal`,
        implications: [
          "These may contain special commands or data",
          "Could be key to understanding the Engine's true purpose",
        ],
        recommendation: "Analyze 0xBB message content for hidden protocols",
      });
    }

    // Discovery 2: Fragmentation Patterns
    const fragmentationRate = parseFloat(analysis.statistics.fragmentationRate);
    if (fragmentationRate > 10) {
      discoveries.push({
        type: "HIGH",
        title: "High Fragmentation Rate",
        description: `${analysis.statistics.fragmentationRate} of messages are fragmented, significantly higher than expected 5%`,
        implications: [
          "May indicate intentional data splitting",
          "Could be part of a larger encoding scheme",
        ],
        recommendation: "Focus on reconstructing large fragmented messages",
      });
    }

    // Discovery 3: Hidden Content
    if (analysis.hiddenContent.length > 0) {
      const readableTextCount = analysis.hiddenContent.filter((h) =>
        h.findings.some((f) => f.type === "readable_text")
      ).length;

      if (readableTextCount > 0) {
        discoveries.push({
          type: "HIGH",
          title: "Readable Text in Binary Messages",
          description: `Found readable text content in ${readableTextCount} binary messages`,
          implications: [
            "Binary payloads may not be truly random",
            "Could contain embedded messages or commands",
          ],
          recommendation: "Extract and analyze all readable text content",
        });
      }
    }

    // Discovery 4: Size Anomalies
    if (analysis.statistics.sizeDistribution.huge > 0) {
      discoveries.push({
        type: "MEDIUM",
        title: "Extremely Large Messages",
        description: `Found ${analysis.statistics.sizeDistribution.huge} messages larger than 100MB`,
        implications: [
          "May contain significant data payloads",
          "Could be test of system limits",
        ],
        recommendation:
          "Analyze large messages for structured data or file content",
      });
    }

    // Discovery 5: Integrity Issues
    if (analysis.integrityIssues.length > 0) {
      discoveries.push({
        type: "MEDIUM",
        title: "Message Integrity Issues",
        description: `${analysis.integrityIssues.length} messages have integrity problems`,
        implications: [
          "May indicate transmission errors",
          "Could be intentional corruption for testing",
        ],
        recommendation: "Investigate patterns in corrupted messages",
      });
    }

    this.results.discoveries = discoveries;

    console.log(`🔍 Generated ${discoveries.length} discoveries:`);
    discoveries.forEach((d, i) => {
      console.log(`  ${i + 1}. [${d.type}] ${d.title}`);
    });
  }

  generateRecommendations() {
    const recommendations = [];
    const { analysis, reconstruction } = this.results;

    // Recommendation 1: Database Schema Enhancement
    recommendations.push({
      priority: "HIGH",
      category: "Database",
      title: "Enhance Database Schema",
      description: "Current schema is too basic for comprehensive analysis",
      action:
        "Add columns for message_type, declared_size, is_fragment, integrity_status",
      sqlExample: `
ALTER TABLE msgbinary ADD COLUMN message_type TEXT;
ALTER TABLE msgbinary ADD COLUMN declared_size INTEGER;
ALTER TABLE msgbinary ADD COLUMN is_fragment BOOLEAN;
ALTER TABLE msgbinary ADD COLUMN integrity_status TEXT;`,
    });

    // Recommendation 2: Real-time Processing
    if (analysis.fragments.length > 0) {
      recommendations.push({
        priority: "HIGH",
        category: "Processing",
        title: "Implement Real-time Fragment Assembly",
        description: "Current approach stores fragments separately",
        action: "Modify TCP client to attempt real-time message reconstruction",
        implementation: "Add fragment buffer and assembly logic to client",
      });
    }

    // Recommendation 3: 0xBB Message Investigation
    if (analysis.messageTypes["0xBB"] > 0) {
      recommendations.push({
        priority: "CRITICAL",
        category: "Protocol",
        title: "Investigate 0xBB Message Structure",
        description: "0xBB messages follow unknown protocol",
        action: "Reverse engineer 0xBB message format",
        implementation: "Create specialized parser for 0xBB messages",
      });
    }

    // Recommendation 4: Hidden Content Extraction
    if (analysis.hiddenContent.length > 0) {
      recommendations.push({
        priority: "MEDIUM",
        category: "Analysis",
        title: "Automated Hidden Content Extraction",
        description: "Manual analysis of hidden content is inefficient",
        action:
          "Create automated pipeline for content extraction and categorization",
        implementation: "Build content classification system",
      });
    }

    this.results.recommendations = recommendations;

    console.log(`💡 Generated ${recommendations.length} recommendations:`);
    recommendations.forEach((r, i) => {
      console.log(`  ${i + 1}. [${r.priority}] ${r.title}`);
    });
  }

  async generateFinalReport() {
    const report = {
      executionInfo: {
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        analysisType: "Complete Binary Analysis Suite",
      },
      summary: {
        totalMessages: this.results.analysis.totalMessages,
        messageTypes: this.results.analysis.messageTypes,
        fragmentationRate: this.results.analysis.statistics.fragmentationRate,
        hiddenContentFound: this.results.analysis.hiddenContent.length,
        reconstructionAttempts: this.results.reconstruction
          ? this.results.reconstruction.reconstructed.length
          : 0,
        criticalDiscoveries: this.results.discoveries.filter(
          (d) => d.type === "CRITICAL"
        ).length,
      },
      discoveries: this.results.discoveries,
      recommendations: this.results.recommendations,
      detailedAnalysis: this.results.analysis,
      reconstructionResults: this.results.reconstruction,
      nextSteps: [
        "Implement recommended database schema changes",
        "Focus on 0xBB message analysis if present",
        "Set up real-time fragment assembly",
        "Investigate large message content",
        "Analyze patterns in hidden readable text",
      ],
    };

    // Save comprehensive report
    const reportPath = "binary_analysis_suite_report.json";
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate executive summary
    const summary = this.generateExecutiveSummary(report);
    fs.writeFileSync("executive_summary.md", summary);

    console.log(`📊 Comprehensive report: ${reportPath}`);
    console.log(`📋 Executive summary: executive_summary.md`);

    return report;
  }

  generateExecutiveSummary(report) {
    return `# Aetheric Engine Binary Analysis - Executive Summary

## Overview
Analysis completed on ${new Date(
      report.executionInfo.timestamp
    ).toLocaleString()}

## Key Findings

### Message Statistics
- **Total Messages Analyzed**: ${report.summary.totalMessages}
- **0xAA Messages**: ${report.summary.messageTypes["0xAA"]} (${(
      (report.summary.messageTypes["0xAA"] / report.summary.totalMessages) *
      100
    ).toFixed(1)}%)
- **0xBB Messages**: ${report.summary.messageTypes["0xBB"]} (${(
      (report.summary.messageTypes["0xBB"] / report.summary.totalMessages) *
      100
    ).toFixed(1)}%)
- **Fragmentation Rate**: ${report.summary.fragmentationRate}
- **Hidden Content**: ${
      report.summary.hiddenContentFound
    } messages contain readable or structured data

### Critical Discoveries
${report.discoveries
  .filter((d) => d.type === "CRITICAL")
  .map((d) => `- **${d.title}**: ${d.description}`)
  .join("\n")}

### High Priority Recommendations
${report.recommendations
  .filter((r) => r.priority === "HIGH" || r.priority === "CRITICAL")
  .map((r) => `- **${r.title}**: ${r.description}`)
  .join("\n")}

## Next Steps
${report.nextSteps.map((step) => `1. ${step}`).join("\n")}

## Files Generated
- \`binary_analysis_suite_report.json\` - Complete analysis data
- \`complete_binary_analysis.json\` - Detailed binary analysis results
- \`reconstruction_report.json\` - Fragment reconstruction results (if applicable)
- \`reconstructed_message_*.bin\` - Reconstructed message files (if any)

---
*Report generated by Aetheric Engine Binary Analysis Suite*
`;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Aetheric Engine Binary Analysis Suite

This tool performs comprehensive analysis of binary messages stored in the msgbinary table,
including fragment detection, reconstruction attempts, and hidden content discovery.

Usage: node binary_analysis_suite.js [options]

Options:
  --help, -h              Show this help message
  --analysis-only         Run only the binary analysis phase
  --reconstruction-only   Run only the fragment reconstruction phase

The suite will generate multiple report files with detailed findings and recommendations.
        `);
    return;
  }

  const suite = new BinaryAnalysisSuite();

  if (args.includes("--analysis-only")) {
    const analyzer = new BinaryAnalyzer();
    await analyzer.analyze();
    await analyzer.saveReport("standalone_binary_analysis.json");
  } else if (args.includes("--reconstruction-only")) {
    const reconstructor = new FragmentReconstructor();
    await reconstructor.reconstructFragments();
  } else {
    await suite.runCompleteAnalysis();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = BinaryAnalysisSuite;
