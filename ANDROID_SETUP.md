# Running on Android via Termux

This guide explains how to set up and run the Flat Search Notifier directly on your Android device using **Termux**. This allows the scraper to run continuously without needing your computer.

## Prerequisites

1.  **Install Termux**: Download it from [F-Droid](https://f-droid.org/en/packages/com.termux/) (do not use the Play Store version, as it is outdated).
2.  **(Optional) Install Termux:Wake Lock**: This helps keep the script running even when the screen is off.

## Installation Steps

Open Termux and run these commands one by one:

### 1. Update packages and install dependencies
```bash
pkg update && pkg upgrade
pkg install git nodejs-lts
```

### 2. Clone the repository
```bash
git clone https://github.com/aborbala/flat-search.git
cd flat-search
```

### 3. Install NPM modules
```bash
npm install
```

### 4. Set up your environment variables
You need to create the `.env` file just like on your PC. You can use the `nano` editor inside Termux:
```bash
nano .env
```
Paste your configuration (replace with your real tokens):
```env
TELEGRAM_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
PORT=3000
SCRIPE_INTERVAL_MINUTES=15
```
*Press `Ctrl+O` then `Enter` to save, and `Ctrl+X` to exit.*

## How to Start

To start the scraper:
```bash
node server.js
```

### Running in the Background
To keep the scraper running after you close the Termux app or turn off your screen:

1.  **Enable Wake Lock**: Swipe down your notification drawer while Termux is open and tap "Acquire WakeLock", or run the command:
    ```bash
    termux-wake-lock
    ```
2.  **Use `pm2` (Recommended)**: PM2 is a process manager that will restart the script if it crashes.
    ```bash
    npm install -g pm2
    pm2 start server.js --name flat-search
    ```
    To check the status: `pm2 list`
    To see logs: `pm2 logs`

## Accessing the Dashboard
Once started, you can access the map dashboard from your Android browser at:
`http://localhost:3000`
