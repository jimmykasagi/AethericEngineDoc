---
applyTo: "**"
---

## Project Context: Aetheric Engine TCP Client

- Build a TCP client that connects to the Aetheric Engine using credentials ("AUTH JWT_Token") and listens for two types of messages: ASCII (delimited by `$` and `;`) and binary (header 0xAA, 5-byte payload size, variable payload).
- Parse incoming messages: write ASCII payloads to an SQLite table `msgascii` (TEXT), and binary payloads to `msgbinary` (BLOB).
- Stop after collecting at least 600 messages. Send "STATUS" to stop AE, then disconnect after draining the TCP pipe.
- Provide an independent app to validate correct parsing and storage of both message types.
- If using AI, clearly state "AI-Assisted" or "Fully AI Generated" in your source code.
- Follow the suggested table schemas, but feel free to improve them.
- Ensure the random number generator is uniformly distributed and handle potentially very large messages (up to 200GB).
- Document all AI-generated code for review by AE's curator.
