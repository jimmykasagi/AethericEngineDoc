// AI-Assisted: Convert ASCII messages to binary and print header, size, and payload
const fs = require("fs");
const path = require("path");
const { processAsciiMessage } = require("../utils.js");

const asciiFile = path.join(__dirname, "sample_ascii.txt");

fs.readFile(asciiFile, "utf8", (err, data) => {
  if (err) throw err;
  // Split into lines
  const lines = data.split(/\r?\n/).filter((line) => line.trim().length > 0);
  lines.forEach((line, idx) => {
    console.log(`Message #${idx + 1}`);
    const { header, sizeBuf, payloadBuf, ascii, size } =
      processAsciiMessage(line);
  });
});
