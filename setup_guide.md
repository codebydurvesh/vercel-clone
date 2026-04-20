# Setup Guide

## Prerequisites

- Node.js and npm installed
- Redis installed and available in your terminal

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Start Redis:

```bash
start redis-server
```

3. Verify Redis is running:

```bash
redis-cli ping
```

Expected output:

```text
PONG
```

4. Start the app server:

```bash
npm start
```

## Notes

- Keep `redis-server` running while the app is running.
- If `redis-server` or `redis-cli` is not recognized, install Redis first and restart your terminal.
