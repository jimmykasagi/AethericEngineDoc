# The Aetheric Engine

<p align="center">
  <img src="https://github.com/Oshikatsu-Labo/AethericEngineDoc/blob/main/ae.svg" alt="Responsive SVG" />
</p>

In the smog-choked skies of Oshikai, the Aetheric Engine ("AE") hummed to life beneath brass panels and whirring gears. Built in the forgotten year 2000 — lost to time and smoke — it ran not on steam, but dreams, distilled through crystal aether coils. Inventor Oshibotsu vanished the night he activated it, leaving behind only soot prints and a journal scrawled with descriptions below. Now, once a year, the Engine sputters awake, sputtering strange messages. Some say it’s a portal; others, a beacon. But no one dares touch it — except the dreamers.

## From Prof Oshibotsu's Journal

- AE is a TCP contraption that emits two types of messages: ASCII and binary.

- The ASCII message starts with '$' (the start marker) and ends with ';' (the end marker). The payload consists of five or more random printable ASCII characters except the start and end markers.

- The binary message has the following structure:

| Offset | Size (byte) | Description                        |
|--------|-------------|------------------------------------|
| 0      | 1           | 0xAA, header                       |
| 1      | 5           | Payload size in bytes              |
| 6      | variable    | Payload, randomly generated octets |

- AE is wary of strangers. To get it to talk, send "AUTH JWT_Token". And when you are satisfied, send "STATUS" and AE will stop talking. Remember to disconnect after that.
  
## From an Archaelogist's Observations

- The messages are unbounded by protocol.

- The random number generator is uniformly distributed.

- There were reports, rare and unconfirmed, of individual messages over 200 Gigabytes long.

- Drain the TCP pipe before disconnecting.

## Your Mission

- Get your personal JWT token, Server IP and Port from AE's curator if you haven't gotten them.

- Create a TCP client that listens attentively to what AE says, and as soon as you receive the messages — immediately write all ASCII messages to an SQLite table named 'msgascii', and write all binary messages to a table named 'msgbinary'.

- You can find table schema suggestion below. Feel free to improve them as they may be inadequate.

- You may stop when you have collected 1000 messages or more.

- Ideally, your solution shall include an independent app to validate that your TCP client had correctly parsed all the ASCII and binary messages.

- You are encouraged to use AI. And if you do - please state clearly in your source codes "AI-Assisted" or "Fully AI Generated". And if AI is involved - AE's curator will ask you questions on the AI-generated codes.

## Suggested Table Schema

#### msgascii
| col name | col type       |
|----------|----------------|
| payload  | TEXT           |

#### msgbinary
| col name | col type       |
|----------|----------------|
| payload  | BLOB           |

<br/>
Good luck.
