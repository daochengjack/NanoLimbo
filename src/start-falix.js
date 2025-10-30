import fetch from 'node-fetch';
import puppeteer from 'puppeteer';

const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID.");
  process.exit(1);
}

const TARGET_URL = "https://falixnodes.net/startserver?ip=mikeqd.falixsrv.me";

async function sendTelegram(msg) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg }),
    });
    if (!res.ok) {
      console.error("Telegram notify failed:", res.status, await res.text());
    }
  } catch (e) {
    console.error("Telegram notify error:", e);
  }
}

async function closeAds(page) {
  const selectors = [
    'button[aria-label="Close"]',
    '[aria-label*=close i]',
    '.close, .close-btn, .close-button, .btn-close, .modal-close',
    '#dismiss-button',
    '.ytp-ad-skip-button, .ytp-ad-skip-button-modern',
    '.ad-close, .ad_close, .ads-close',
    '.overlay-close, .popup-close',
    '#ad_close, #ad-close',
    '[class*="ad"] [class*="close"]'
  ];

  for (const sel of selectors) {
    try { const el = await page.$(sel); if (el) await el.click({ delay: 20 }); } catch {}
  }
  for (const frame of page.frames()) {
    for (const sel of selectors) {
      try { const el = await frame.$(sel); if (el) await el.click({ delay: 20 }); } catch {}
    }
  }
}

async function tryClickStart(page) {
  const clickByText = async (text) => {
    const [el] = await page.$x(`//button[contains(., '${text}') or contains(@aria-label, '${text}')] | //a[contains(., '${text}')]`);
    if (el) { await el.click(); return true; }
    return false;
  };
  let clicked = await clickByText("Start Server");
  if (!clicked) clicked = await clickByText("Start");
  if (!clicked) {
    const btn = await page.$('button#start, button.start, .btn-start, [data-testid="start"]');
    if (btn) { await btn.click(); clicked = true; }
  }
  return clicked;
}

async function run() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(120000);
  page.setDefaultTimeout(120000);

  try {
    await page.goto(TARGET_URL, { waitUntil: "networkidle2" });

    await page.waitForTimeout(35000); // cover ~31s ad

    await closeAds(page);

    const clicked = await tryClickStart(page).catch(() => false);

    const success = await page
      .waitForFunction(() => {
        const t = (document.body.innerText || "").toLowerCase();
        return t.includes("running") || t.includes("started") || t.includes("online")
          || t.includes("已启动") || t.includes("在线");
      }, { timeout: 60000 })
      .then(() => true)
      .catch(() => false);

    if (success) {
      await sendTelegram(`✅ Falix keep-alive success for mikeqd.falixsrv.me ${clicked ? "(clicked Start)" : "(auto-started)"}`);
      console.log("Success.");
    } else {
      throw new Error("No success signal detected after ad/attempt.");
    }
  } catch (err) {
    console.error("Attempt failed:", err?.message || err);
    await sendTelegram(`⚠️ Falix keep-alive attempt failed: ${err?.message || err}`);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
