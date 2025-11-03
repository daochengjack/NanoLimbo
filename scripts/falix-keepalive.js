import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import retry from 'p-retry';

// Use stealth plugin
puppeteer.use(StealthPlugin());

// Environment variables with defaults
const {
  FALIX_EMAIL,
  FALIX_PASSWORD,
  FALIX_BASE_URL = 'https://client.falixnodes.net',
  FALIX_SERVER_HOST = 'mikeqd.falixsrv.me',
  CHECK_INTERVAL_MS = 120000, // 2 minutes
  AD_WATCH_MS = 35000, // 35 seconds
  HEADLESS = 'true'
} = process.env;

if (!FALIX_EMAIL || !FALIX_PASSWORD) {
  console.error('Missing required environment variables: FALIX_EMAIL, FALIX_PASSWORD');
  process.exit(1);
}

const HEADLESS_BOOL = HEADLESS.toLowerCase() === 'true';

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function handleCloudflareVerification(page) {
  log('Checking for Cloudflare verification...');
  
  try {
    // Wait a bit for any verification to load
    await sleep(3000);
    
    // Check for Turnstile/hCaptcha iframe
    const verificationFrames = await page.frames().filter(frame => 
      frame.url().includes('turnstile') || 
      frame.url().includes('hcaptcha') ||
      frame.url().includes('cloudflare')
    );
    
    if (verificationFrames.length > 0) {
      log('Found verification iframe(s), waiting for completion...');
      
      // Wait up to 60 seconds for verification to complete
      for (let i = 0; i < 60; i++) {
        const isBlocked = await page.evaluate(() => {
          return document.body.innerText.includes('Verifying you are human') ||
                 document.body.innerText.includes('Please wait') ||
                 document.body.innerText.includes('Checking your browser') ||
                 document.querySelector('[data-sitekey]') !== null;
        });
        
        if (!isBlocked) {
          log('Cloudflare verification completed');
          return true;
        }
        
        await sleep(1000);
      }
      
      log('Cloudflare verification timeout, proceeding anyway...');
    } else {
      log('No Cloudflare verification detected');
    }
  } catch (error) {
    log(`Error handling Cloudflare verification: ${error.message}`);
  }
  
  return true;
}

async function login(page) {
  log('Attempting to login...');
  
  await page.goto(`${FALIX_BASE_URL}/auth/login`, { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  // Handle Cloudflare verification if present
  await handleCloudflareVerification(page);
  
  // Fill login form
  await page.waitForSelector('input[type="email"], input[name="email"], input[placeholder*="email"]', { timeout: 10000 });
  await page.type('input[type="email"], input[name="email"], input[placeholder*="email"]', FALIX_EMAIL);
  
  await page.waitForSelector('input[type="password"], input[name="password"], input[placeholder*="password"]', { timeout: 5000 });
  await page.type('input[type="password"], input[name="password"], input[placeholder*="password"]', FALIX_PASSWORD);
  
  // Click submit button
  const submitSelectors = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:contains("Login")',
    'button:contains("Sign in")',
    '.btn-primary'
  ];
  
  let clicked = false;
  for (const selector of submitSelectors) {
    try {
      const button = await page.$(selector);
      if (button) {
        await button.click();
        clicked = true;
        break;
      }
    } catch (e) {
      // Continue to next selector
    }
  }
  
  if (!clicked) {
    // Try clicking by text content
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      const loginBtn = buttons.find(btn => 
        btn.textContent.toLowerCase().includes('login') ||
        btn.textContent.toLowerCase().includes('sign in') ||
        btn.value?.toLowerCase().includes('login')
      );
      if (loginBtn) loginBtn.click();
    });
  }
  
  // Wait for navigation after login
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  
  // Check if login was successful
  const isLoggedIn = await page.evaluate(() => {
    return !window.location.href.includes('/auth/login') &&
           !document.body.innerText.toLowerCase().includes('invalid') &&
           !document.body.innerText.toLowerCase().includes('incorrect');
  });
  
  if (!isLoggedIn) {
    throw new Error('Login failed - invalid credentials or login page still showing');
  }
  
  log('Login successful');
  return true;
}

async function checkServerStatus(page) {
  log('Checking server status...');
  
  await page.goto(FALIX_BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  
  // Look for server card/row containing the server host
  const serverInfo = await page.evaluate((serverHost) => {
    // Try to find server by hostname in various elements
    const elements = Array.from(document.querySelectorAll('*'));
    let serverElement = null;
    let status = null;
    
    // Search for elements containing the server hostname
    for (const el of elements) {
      if (el.textContent && el.textContent.includes(serverHost)) {
        // Found an element with our server name, now look for status nearby
        serverElement = el;
        break;
      }
    }
    
    if (serverElement) {
      // Look for status in the same container or nearby
      const container = serverElement.closest('tr, .card, .server-item, .server-row, div');
      if (container) {
        const statusText = container.textContent.toLowerCase();
        if (statusText.includes('offline')) {
          status = 'offline';
        } else if (statusText.includes('online') || statusText.includes('running')) {
          status = 'online';
        }
      }
    }
    
    // Fallback: search for status indicators globally
    if (!status) {
      const statusElements = document.querySelectorAll('[class*="status"], [class*="state"], .badge');
      for (const el of statusElements) {
        const text = el.textContent.toLowerCase();
        if (text.includes('offline')) {
          status = 'offline';
          break;
        } else if (text.includes('online') || text.includes('running')) {
          status = 'online';
        }
      }
    }
    
    return { status, serverFound: !!serverElement };
  }, FALIX_SERVER_HOST);
  
  if (!serverInfo.serverFound) {
    log(`Warning: Server ${FALIX_SERVER_HOST} not found in the list`);
    return null; // Unknown status
  }
  
  log(`Server status: ${serverInfo.status || 'unknown'}`);
  return serverInfo.status;
}

async function closeAds(page) {
  log('Attempting to close ads...');
  
  const adSelectors = [
    'button[aria-label="Close"]',
    '[aria-label*="close" i]',
    '.close, .close-btn, .close-button, .btn-close, .modal-close',
    '#dismiss-button',
    '.ytp-ad-skip-button, .ytp-ad-skip-button-modern',
    '.ad-close, .ad_close, .ads-close',
    '.overlay-close, .popup-close',
    '#ad_close, #ad-close',
    '[class*="ad"] [class*="close"]',
    '.modal button:not([disabled])',
    '.popup button:not([disabled])'
  ];
  
  // Try to close ads in main page
  for (const selector of adSelectors) {
    try {
      const elements = await page.$$(selector);
      for (const element of elements) {
        if (await element.isVisible()) {
          await element.click();
          log(`Closed ad with selector: ${selector}`);
          await sleep(500);
        }
      }
    } catch (e) {
      // Continue trying other selectors
    }
  }
  
  // Try to close ads in iframes
  for (const frame of page.frames()) {
    for (const selector of adSelectors) {
      try {
        const elements = await frame.$$(selector);
        for (const element of elements) {
          await element.click();
          log(`Closed ad in frame with selector: ${selector}`);
          await sleep(500);
        }
      } catch (e) {
        // Continue trying other selectors
      }
    }
  }
}

async function startServer(page) {
  log('Attempting to start server...');
  
  await page.goto(`${FALIX_BASE_URL}/server/console`, { 
    waitUntil: 'networkidle2', 
    timeout: 30000 
  });
  
  // Look for start button
  const startSelectors = [
    'button:contains("Start")',
    'button:contains("Start Server")',
    'button[start]',
    '.btn-start',
    '#start',
    '[data-action="start"]'
  ];
  
  let clicked = false;
  
  // Try to click start button
  for (const selector of startSelectors) {
    try {
      const button = await page.$(selector);
      if (button && await button.isVisible()) {
        await button.click();
        clicked = true;
        log('Clicked start button');
        break;
      }
    } catch (e) {
      // Continue to next selector
    }
  }
  
  // Fallback: search by text content
  if (!clicked) {
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const startBtn = buttons.find(btn => 
        btn.textContent.toLowerCase().includes('start')
      );
      if (startBtn) startBtn.click();
    });
    clicked = true;
  }
  
  if (!clicked) {
    throw new Error('Start button not found');
  }
  
  // Wait a moment and check for ad modal
  await sleep(2000);
  
  // Check if ad modal appeared
  const adModalExists = await page.evaluate(() => {
    return document.querySelector('.modal, .popup, .overlay, [class*="modal"], [class*="popup"]') !== null;
  });
  
  if (adModalExists) {
    log('Ad modal detected, looking for watch ad button...');
    
    // Look for "watch ad" button
    const watchAdSelectors = [
      'button:contains("Watch Ad")',
      'button:contains("Watch")',
      'button:contains("Continue")',
      '.btn-watch',
      '[data-action="watch-ad"]'
    ];
    
    let watchAdClicked = false;
    for (const selector of watchAdSelectors) {
      try {
        const button = await page.$(selector);
        if (button && await button.isVisible()) {
          await button.click();
          watchAdClicked = true;
          log('Clicked watch ad button');
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (watchAdClicked) {
      log(`Waiting ${AD_WATCH_MS}ms for ad to complete...`);
      await sleep(parseInt(AD_WATCH_MS));
      
      // Try to close ad after waiting
      await closeAds(page);
    }
  }
  
  // Verify server started
  await sleep(3000);
  const isStarted = await page.evaluate(() => {
    const text = document.body.innerText.toLowerCase();
    return text.includes('running') || 
           text.includes('started') || 
           text.includes('online') ||
           text.includes('server is running');
  });
  
  if (!isStarted) {
    throw new Error('Server may not have started successfully');
  }
  
  log('Server started successfully');
  return true;
}

async function performKeepAliveCheck() {
  const browser = await puppeteer.launch({
    headless: HEADLESS_BOOL,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  });
  
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(30000);
  page.setDefaultTimeout(10000);
  
  try {
    // Login
    await retry(() => login(page), {
      retries: 2,
      factor: 2,
      minTimeout: 1000,
      onFailedAttempt: error => {
        log(`Login attempt ${error.attemptNumber} failed: ${error.retriesLeft} retries left`);
      }
    });
    
    // Check server status
    const status = await checkServerStatus(page);
    
    if (status === 'offline') {
      log('Server is offline, attempting to start...');
      await retry(() => startServer(page), {
        retries: 1,
        factor: 2,
        minTimeout: 1000,
        onFailedAttempt: error => {
          log(`Start attempt ${error.attemptNumber} failed: ${error.retriesLeft} retries left`);
        }
      });
      log('Server start completed');
    } else if (status === 'online') {
      log('Server is online, no action needed');
    } else {
      log('Server status unknown, skipping start attempt');
    }
    
  } catch (error) {
    log(`Keep-alive check failed: ${error.message}`);
    throw error;
  } finally {
    await browser.close();
  }
}

async function runKeepAliveLoop() {
  const checkInterval = parseInt(CHECK_INTERVAL_MS);
  const maxRuntime = 10 * 60 * 1000; // 10 minutes max runtime
  const startTime = Date.now();
  let checkCount = 0;
  
  log(`Starting Falix keep-alive loop (interval: ${checkInterval}ms, max runtime: ${maxRuntime}ms)`);
  
  while (Date.now() - startTime < maxRuntime) {
    try {
      checkCount++;
      log(`Performing check #${checkCount}`);
      await performKeepAliveCheck();
    } catch (error) {
      log(`Check #${checkCount} failed: ${error.message}`);
      // Continue with next check even if this one failed
    }
    
    // Check if we have time for another check
    if (Date.now() - startTime + checkInterval >= maxRuntime) {
      break;
    }
    
    log(`Waiting ${checkInterval}ms until next check...`);
    await sleep(checkInterval);
  }
  
  log(`Keep-alive loop completed (${checkCount} checks performed)`);
}

// Main execution
runKeepAliveLoop().catch(error => {
  log(`Fatal error: ${error.message}`);
  process.exit(1);
});