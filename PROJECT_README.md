# Aetheric Engine Client Project

**AI-Assisted Node.js TCP Client for the mysterious Aetheric Engine**

## Overview

This project implements a TCP client that connects to the Aetheric Engine (AE) server, collects ASCII and binary messages according to the specified protocol, and stores them in an SQLite database. The system includes a real-time WebSocket monitoring interface and validation tools.

## Project Structure

```
├── package.json          # Node.js project configuration
├── .env                  # Environment variables (SERVER_IP, SERVER_PORT, AUTH_TOKEN)
├── server.js             # Main TCP client with WebSocket bridge
├── database.js           # SQLite database management utilities
├── utils.js              # Message parsing and processing utilities
├── validator.js          # Independent validation application
├── index.html            # Web-based monitoring interface
└── README.md             # This file
```

## Features

### Core Functionality
- **TCP Client**: Connects to AE server using environment variables
- **Authentication**: Automatic JWT token authentication
- **Message Processing**: Handles both ASCII and binary message formats
- **Database Storage**: SQLite storage with proper schema
- **Message Validation**: Independent validation of parsed messages
- **Real-time Monitoring**: WebSocket-based live monitoring interface

### Message Protocol Support

#### ASCII Messages
- Format: `$<payload>;`
- Payload: 5+ printable ASCII characters (excluding `$` and `;`)
- Example: `$Hello;`, `$TestData123;`

#### Binary Messages
- Header: `0xAA` or `0xBB`
- Structure: `[Header:1][Size:5][Payload:variable]`
- Size field: 5-byte little-endian integer
- Supports messages up to 200GB+ as per specifications

### Advanced Features
- **Fragment Handling**: Properly handles message fragmentation
- **Buffer Management**: Efficient TCP stream buffering
- **Error Recovery**: Graceful error handling and recovery
- **Statistics Tracking**: Real-time collection statistics
- **Auto-stop**: Automatically stops after collecting 600+ messages

## Installation

1. **Clone and navigate to the project:**
   ```bash
   cd /path/to/AethericEngineDoc
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Verify environment variables in `.env`:**
   ```
   SERVER_IP=35.213.160.152
   SERVER_PORT=8080
   AUTH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## Usage

### Start the Main Application
```bash
npm start
# or
node server.js
```

This starts:
- TCP client (connects to AE server)
- WebSocket server on `ws://localhost:8081`
- Database initialization

### Access the Web Interface
1. Open `index.html` in a web browser
2. The interface connects automatically to the WebSocket server
3. Use the control buttons to start/stop data collection

### Run Independent Validation
```bash
npm run validate
# or
node validator.js
```

This will:
- Validate all stored messages
- Generate sample data if database is empty
- Demonstrate parsing capabilities
- Provide detailed validation report

### WebSocket Control Commands

Send JSON messages to `ws://localhost:8081`:

```javascript
// Start data collection
{ "action": "start" }

// Stop data collection
{ "action": "stop" }

// Reset connection and statistics
{ "action": "reset" }

// Request current statistics
{ "action": "getStats" }
```

## Database Schema

### `msgascii` Table
| Column    | Type    | Description                    |
|-----------|---------|--------------------------------|
| id        | INTEGER | Primary key (auto-increment)  |
| payload   | TEXT    | ASCII message payload          |
| timestamp | DATETIME| Message received timestamp     |

### `msgbinary` Table
| Column    | Type    | Description                    |
|-----------|---------|--------------------------------|
| id        | INTEGER | Primary key (auto-increment)  |
| payload   | BLOB    | Binary message payload         |
| size      | INTEGER | Payload size in bytes          |
| timestamp | DATETIME| Message received timestamp     |

## Implementation Details

### Message Processing Pipeline
1. **TCP Data Reception**: Raw data received from AE server
2. **Buffer Management**: Data accumulated in parsing buffer
3. **Message Extraction**: Complete messages extracted using protocol rules
4. **Validation**: Messages validated according to specifications
5. **Database Storage**: Valid messages stored in appropriate tables
6. **Real-time Broadcast**: Message details broadcast via WebSocket

### Error Handling
- **Protocol Violations**: Invalid messages logged but don't stop collection
- **Connection Issues**: Automatic reconnection attempts
- **Database Errors**: Graceful degradation with error reporting
- **Fragment Management**: Handles intentional message fragmentation

### Performance Considerations
- **Streaming Processing**: Messages processed as they arrive
- **Efficient Buffering**: Minimal memory usage for large messages
- **Database Transactions**: Efficient SQLite operations
- **WebSocket Throttling**: Prevents UI flooding with updates

## Testing and Validation

The validator application (`validator.js`) provides comprehensive testing:

### Message Parsing Tests
- ASCII message format validation
- Binary message structure verification
- Edge case handling
- Error condition testing

### Database Validation
- Stored message integrity checks
- Payload size verification
- Data corruption detection
- Statistics accuracy validation

### Sample Output
```
============================================================
VALIDATION REPORT
============================================================
Total Messages: 650
Valid Messages: 648 (99.7%)
Invalid Messages: 2 (0.3%)

ASCII MESSAGES:
  Total: 358
  Valid: 358
  Invalid: 0

BINARY MESSAGES:
  Total: 292
  Valid: 290
  Invalid: 2
  Errors:
    - ID 145: Size mismatch
    - ID 267: Invalid payload format
============================================================
```

## Monitoring Interface

The web interface (`index.html`) provides:

### Real-time Statistics
- Connection status
- Collection progress (0-600 messages)
- Message counts by type
- Error tracking

### Live Message Display
- Latest ASCII message content
- Latest binary message details
- Real-time activity log
- Collection progress bar

### Visual Features
- Steampunk-themed design matching AE aesthetic
- Responsive layout for mobile devices
- Color-coded message types
- Animated updates and transitions

## Architecture Notes

### Design Patterns
- **Observer Pattern**: WebSocket clients observe TCP client events
- **Strategy Pattern**: Different parsing strategies for ASCII/binary
- **Factory Pattern**: Message creation based on protocol detection
- **Singleton Pattern**: Database connection management

### Scalability
- **Memory Efficient**: Streaming processing prevents memory buildup
- **Database Optimized**: Prepared statements and transactions
- **Concurrent Safe**: Proper handling of simultaneous operations
- **Resource Management**: Automatic cleanup and connection management

## Troubleshooting

### Common Issues

**Connection Refused**
- Verify SERVER_IP and SERVER_PORT in `.env`
- Check network connectivity to AE server
- Ensure authentication token is valid

**Database Errors**
- Check file permissions for SQLite database
- Verify disk space availability
- Ensure no other processes are locking the database

**WebSocket Connection Failed**
- Confirm port 8081 is available
- Check firewall settings
- Verify browser WebSocket support

**Message Parsing Errors**
- Review AE server output for protocol compliance
- Check for network corruption
- Validate message format against specifications

### Debug Mode
Enable verbose logging by setting environment variable:
```bash
DEBUG=1 node server.js
```

## Contributing

When making modifications:
1. Maintain the "AI-Assisted" comments in source files
2. Follow the existing code style and patterns
3. Update validation tests for new functionality
4. Test with both real AE server and mock data
5. Update documentation accordingly

## License

MIT License - See package.json for details

---

*"In the smog-choked skies of Oshikai, the Aetheric Engine hums with ancient mysteries, and we are but humble listeners to its digital dreams."*
