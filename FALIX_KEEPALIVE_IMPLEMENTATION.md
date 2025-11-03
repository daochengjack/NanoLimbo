# Falix Keep-Alive Bot Implementation

This document describes the implementation of the automated Falix keep-alive bot and GitHub Action.

## Overview

The implementation provides a sophisticated keep-alive system that:
1. Logs into the Falix panel using credentials
2. Handles Cloudflare/Turnstile verification automatically
3. Checks server status intelligently (only starts when offline)
4. Manages the ad flow required to start servers
5. Provides comprehensive logging and error handling
6. Runs on a schedule and can be triggered manually

## Files Created/Modified

### 1. `scripts/falix-keepalive.js` - Main Automation Script
- **Purpose**: Core keep-alive logic using Puppeteer with stealth
- **Features**:
  - Automated login with credential validation
  - Cloudflare/Turnstile verification handling
  - Smart server status detection
  - Ad modal detection and handling
  - Robust retry logic with exponential backoff
  - Comprehensive logging with timestamps
  - Configurable via environment variables

### 2. `.github/workflows/falix-keepalive.yml` - GitHub Action
- **Purpose**: CI/CD workflow for running the keep-alive bot
- **Schedule**: Every 5 minutes (`*/5 * * * *`)
- **Triggers**: Scheduled runs and manual workflow_dispatch
- **Features**:
  - Node.js 20 setup with npm caching
  - Environment variable handling from GitHub Secrets
  - 15-minute timeout to prevent runaway jobs
  - Clean error handling and logging

### 3. `package.json` - Dependencies and Scripts
- **Added Dependencies**:
  - `puppeteer-extra` - Enhanced Puppeteer with plugin support
  - `puppeteer-extra-plugin-stealth` - Avoids bot detection
  - `p-retry` - Retry logic with exponential backoff
- **Added Script**: `npm run keepalive` - Runs the main script

### 4. `scripts/test-setup.js` - Setup Validation
- **Purpose**: Validates that all components are properly configured
- **Checks**: Environment variables, dependencies, file existence
- **Usage**: `node scripts/test-setup.js`

### 5. `README.md` - Updated Documentation
- Added comprehensive section for the keep-alive bot
- Setup instructions for GitHub Secrets
- Feature overview and troubleshooting guide

### 6. `FALIX_AUTOSTART_README.md` - Updated
- Updated to mention both legacy and new keep-alive systems

## Environment Variables

### Required
- `FALIX_EMAIL` - Falix panel email address
- `FALIX_PASSWORD` - Falix panel password

### Optional (with defaults)
- `FALIX_BASE_URL` - Panel URL (default: https://client.falixnodes.net)
- `FALIX_SERVER_HOST` - Server to monitor (default: mikeqd.falixsrv.me)
- `CHECK_INTERVAL_MS` - Check interval (default: 120000 = 2 minutes)
- `AD_WATCH_MS` - Ad watch duration (default: 35000 = 35 seconds)
- `HEADLESS` - Headless mode (default: true)

## Technical Implementation Details

### Login Process
1. Navigate to login page
2. Handle Cloudflare verification if present
3. Fill email and password fields
4. Click submit button using multiple selector strategies
5. Verify successful login by checking URL and page content

### Status Checking
1. Navigate to main dashboard
2. Search for server card/row containing the target hostname
3. Extract status from nearby elements or status badges
4. Return 'online', 'offline', or null (unknown)

### Server Starting
1. Navigate to console page
2. Locate and click start button
3. Detect and handle ad modal if present
4. Click "watch ad" button if needed
5. Wait for ad duration (35 seconds)
6. Close ad overlays
7. Verify server started successfully

### Error Handling
- Retry logic for login and start operations
- Graceful handling of missing elements
- Comprehensive logging of all operations
- Continue loop even if individual checks fail

### Security Features
- Puppeteer stealth plugin to avoid detection
- Configurable headless mode
- No credentials stored in code
- Environment-based configuration

## Usage

### Manual Testing
```bash
# Install dependencies
npm install

# Run setup validation
node scripts/test-setup.js

# Run with environment variables
env FALIX_EMAIL=your@email.com FALIX_PASSWORD=yourpassword npm run keepalive
```

### GitHub Actions
1. Set required secrets in repository settings
2. Workflow runs automatically every 5 minutes
3. Can be triggered manually via Actions tab
4. Monitor logs in Actions tab for debugging

## Monitoring and Debugging

- **Logs**: Detailed timestamped logs for all operations
- **GitHub Actions**: Complete workflow history and logs
- **Status**: Clear indication of server status and actions taken
- **Errors**: Comprehensive error reporting with retry attempts

## Acceptance Criteria Met

✅ **Working Workflow**: GitHub Action runs on schedule and manually
✅ **Login Functionality**: Automated login with credential handling
✅ **Cloudflare Handling**: Best-effort verification processing
✅ **Status Detection**: Smart server status checking
✅ **Ad Flow Management**: Automatic ad watching and closing
✅ **Conditional Starting**: Only starts when server is offline
✅ **Robust Logging**: Comprehensive operation logging
✅ **Retry Logic**: Built-in retry for transient errors
✅ **Environment Configuration**: All settings via environment variables
✅ **Documentation**: Complete setup and usage instructions

The implementation provides a production-ready keep-alive solution that will reliably maintain server uptime while handling all the complexities of the Falix panel interface.