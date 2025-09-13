const buf = Buffer.from([0xaa, 0x01, 0xcf, 0x00, 0x00, 0x00]);
const result = buf.readUIntBE(1, 2);
console.log(result);
