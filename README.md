# NanoLimbo

### 自动构建server.jar指南

1：fork本项目

2：在Actions菜单允许 `I understand my workflows, go ahead and enable them` 按钮

3：在`src/main/java/ua/nanit/limbo/NanoLimbo.java`文件里 125到142 行中添加需要的环境变量，不需要的留空，保存后Actions会自动构建

4：等待2分钟左右，在右侧的Release里下载server.jar文件

---

## Falix Keep-Alive Bot

This repository includes an automated keep-alive bot for Falix panel that monitors and automatically restarts your server when it goes offline.

### Features

- **Automated Login**: Logs into Falix panel using credentials
- **Cloudflare Handling**: Automatically handles Cloudflare/Turnstile verification
- **Smart Status Checking**: Only starts server when it's actually offline
- **Ad Flow Handling**: Watches ads when required to start the server
- **Robust Retry Logic**: Built-in retry mechanism for transient failures
- **Comprehensive Logging**: Detailed logs for all operations

### Setup Instructions

#### 1. Configure GitHub Secrets

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions → New repository secret):

**Required Secrets:**
- `FALIX_EMAIL` - Your Falix panel email
- `FALIX_PASSWORD` - Your Falix panel password

**Optional Secrets:**
- `FALIX_BASE_URL` - Falix panel URL (default: https://client.falixnodes.net)
- `FALIX_SERVER_HOST` - Server hostname to monitor (default: mikeqd.falixsrv.me)
- `CHECK_INTERVAL_MS` - Check interval in milliseconds (default: 120000 = 2 minutes)
- `AD_WATCH_MS` - Ad watch duration in milliseconds (default: 35000 = 35 seconds)
- `HEADLESS` - Run headless mode (default: true)

#### 2. Enable GitHub Actions

If not already enabled, go to Actions tab and enable workflows.

#### 3. Manual Trigger

You can manually trigger the workflow:
- Go to Actions tab in GitHub
- Select "Falix Keep-Alive Bot"
- Click "Run workflow"

### How It Works

1. **Login**: Automatically logs into the Falix panel using provided credentials
2. **Verification**: Handles Cloudflare/Turnstile verification if present
3. **Status Check**: Checks if the specified server is offline
4. **Server Start**: If offline, navigates to console and starts the server
5. **Ad Handling**: Watches required ads (35 seconds) and closes them
6. **Monitoring**: Continues checking every 2 minutes for up to 10 minutes

### Files Added

- `scripts/falix-keepalive.js` - Main keep-alive script with Puppeteer automation
- `.github/workflows/falix-keepalive.yml` - GitHub Actions workflow
- `package.json` - Updated with required dependencies

### Monitoring

Check the Actions tab in GitHub to see:
- Workflow run history and logs
- Success/failure status
- Detailed operation logs including server status checks

### Schedule

The workflow runs every 5 minutes via cron schedule and can also be triggered manually.

### Troubleshooting

If the workflow fails:
1. Check the Actions log for detailed error messages
2. Verify Falix credentials are correct
3. Check if the Falix panel structure has changed
4. Ensure server hostname matches exactly
