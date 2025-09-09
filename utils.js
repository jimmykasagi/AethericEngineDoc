// AI-Assisted: Utility to process an ASCII line into header, size, and payload buffers
function processAsciiLine(line) {
  let payload = line.trim();
  if (payload.startsWith("$")) payload = payload.slice(1);
  if (payload.endsWith(";")) payload = payload.slice(0, -1);
  payload = payload.trim();
  const header = Buffer.from([0xaa]);
  const payloadBuf = Buffer.from(payload, "utf8");
  const sizeBuf = Buffer.alloc(5);
  sizeBuf.writeUIntBE(payloadBuf.length, 0, 5);

  //   console.log("Header:", header.toString("hex"));
  console.log(
    "Size:",
    sizeBuf.toString("hex"),
    `(decimal: ${payloadBuf.length})`
  );
  console.log("Payload:", payloadBuf.toString("hex"));
  console.log("Payload (ASCII):", payload);
  console.log("---");

  return {
    header,
    sizeBuf,
    payloadBuf,
    ascii: payload,
    size: payloadBuf.length,
  };
}

module.exports = {
  processAsciiLine,
};
