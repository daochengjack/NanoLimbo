# Falix Auto-Start GitHub Action

This repository includes a GitHub Action that automatically keeps the Falix server alive by accessing the start page every 40 minutes.

## How It Works

The workflow:
1. Runs every 40 minutes (at :00 and :40 of each hour)
2. Opens the Falix server start page with Puppeteer
3. Waits ~35 seconds for the ad to display
4. Attempts to close ad overlays (including those within iframes)
5. Tries to click the "Start Server" button if available
6. Verifies the server started successfully
7. Sends a Telegram notification with the result

## Setup Instructions

### 1. Configure GitHub Secrets

Add the following secrets to your GitHub repository:
- Go to Settings → Secrets and variables → Actions → New repository secret
- Add `TELEGRAM_BOT_TOKEN` - Your Telegram bot token from [@BotFather](https://t.me/botfather)
- Add `TELEGRAM_CHAT_ID` - Your Telegram chat ID (get it from [@userinfobot](https://t.me/userinfobot))

### 2. Enable GitHub Actions

The workflow is located at `.github/workflows/auto-start.yml` and will run automatically.

### 3. Manual Trigger

You can manually trigger the workflow:
- Go to Actions tab in GitHub
- Select "Auto Start Falix Server"
- Click "Run workflow"

## Files Added

- `package.json` - Node.js dependencies (puppeteer, node-fetch)
- `src/start-falix.js` - The automation script
- `.github/workflows/auto-start.yml` - GitHub Actions workflow
- `.gitignore` - Excludes node_modules and build artifacts

## Monitoring

Check the Actions tab in GitHub to see:
- Workflow run history
- Success/failure logs
- Telegram notifications will also inform you of each run

## Troubleshooting

If the workflow fails:
1. Check the Actions log for detailed error messages
2. Verify Telegram secrets are set correctly
3. Check if the Falix page structure has changed
4. The script includes multiple selectors and fallbacks for ad closing

## Cron Schedule

The workflow runs at:
- `:00` minutes past every hour
- `:40` minutes past every hour

This ensures the server stays active every 40 minutes.
