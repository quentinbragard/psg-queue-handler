// PSG Queue Token+Cookie Handler
// This script extracts both the token and cookie needed to bypass the queue

import express from 'express';
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

// Get current directory (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// Create required directories
const logsDir = path.join(__dirname, 'logs');
const screenshotsDir = path.join(__dirname, 'screenshots');
const dataDir = path.join(__dirname, 'data');

try {
  await fs.mkdir(logsDir, { recursive: true });
  await fs.mkdir(screenshotsDir, { recursive: true });
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(path.join(__dirname, 'public'), { recursive: true });
} catch (err) {
  console.error(`Error creating directories: ${err.message}`);
}

// Enhanced logging setup
const logToFile = async (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  
  // Append to log file with current date
  const date = new Date().toISOString().split('T')[0];
  const logFile = path.join(logsDir, `queue_handler_${date}.log`);
  
  try {
    await fs.appendFile(logFile, logMessage);
  } catch (err) {
    console.error(`Error writing to log file: ${err.message}`);
  }
};

await logToFile("📝 Starting PSG Queue Token+Cookie Handler");

// Function to determine Chrome path for the current OS
function getChromeExecutablePath() {
  const platform = os.platform();
  
  if (platform === 'darwin') {
    // macOS
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  } else if (platform === 'win32') {
    // Windows
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  } else {
    // Linux
    return '/usr/bin/google-chrome-stable';
  }
}

// Helper function to process when we get through the queue
async function processQueueSuccess(page, finalUrl) {
  await logToFile(`🎉 Success! Reached ticket page: ${finalUrl}`);
  
  // Extract the token from the URL if there is one
  let token = null;
  if (finalUrl.includes('queueittoken=')) {
    token = finalUrl.split('queueittoken=')[1].split('&')[0];
    await logToFile(`🔑 Extracted queueittoken: ${token.substring(0, 20)}...`);
  }
  
  // Extract the Queue-it cookie
  const cookies = await page.cookies();
  const queueitCookie = cookies.find(c => c.name.includes('QueueIT') || c.name.includes('Queue-it'));
  
  if (queueitCookie) {
    await logToFile(`🍪 Found Queue-it cookie: ${queueitCookie.name}`);
    
    // Create final URL without token
    const baseUrl = finalUrl.split('queueittoken=')[0].replace(/&$/, '');
    await logToFile(`🔗 Base URL: ${baseUrl}`);
    
    // Save both the token and cookie
    const bypassData = {
      baseUrl,
      token,
      cookie: {
        name: queueitCookie.name,
        value: queueitCookie.value,
        domain: queueitCookie.domain,
        path: queueitCookie.path,
        expires: queueitCookie.expires
      },
      timestamp: new Date().toISOString()
    };
    
    await fs.writeFile(
      path.join(dataDir, 'psg_bypass_data.json'), 
      JSON.stringify(bypassData, null, 2)
    );
    await logToFile("💾 Saved bypass data to file");
    
    // Create HTML file for easy sharing
    const bypassHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>PSG Queue Bypass</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      border: 1px solid #ccc;
      border-radius: 5px;
      padding: 20px;
      margin-top: 20px;
    }
    button {
      background-color: #F11342;
      color: white;
      border: none;
      padding: 10px 20px;
      font-size: 16px;
      cursor: pointer;
      border-radius: 5px;
      margin-top: 20px;
    }
    pre {
      background-color: #f5f5f5;
      padding: 10px;
      border-radius: 5px;
      overflow-x: auto;
    }
    .hidden {
      display: none;
    }
    .warning {
      color: #F11342;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <h1>PSG Ticket Queue Bypass</h1>
  
  <div class="container">
    <h2>Direct Access URL</h2>
    <p>This link should bypass the queue and take you directly to the ticket page:</p>
    <pre><a href="${baseUrl}" target="_blank" id="directLink">${baseUrl}</a></pre>
    
    <p class="warning">⚠️ Important: You need to have the queue cookie set for this to work!</p>
  </div>
  
  <div class="container">
    <h2>Automatic Bypass</h2>
    <p>Click the button below to set the cookie and redirect:</p>
    <button id="bypassButton">Set Cookie & Go to Ticket Page</button>
    
    <div id="loadingMessage" class="hidden">
      <p>Setting cookie and redirecting...</p>
    </div>
    
    <div id="errorMessage" class="hidden">
      <p style="color: red;">Error occurred. Please try the manual method below.</p>
    </div>
  </div>
  
  <div class="container">
    <h2>Manual Method (Cookie Editor)</h2>
    <p>1. Install a cookie editor extension for your browser (like "EditThisCookie" for Chrome)</p>
    <p>2. Add this cookie to the ${queueitCookie.domain} domain:</p>
    <pre>Name: ${queueitCookie.name}
Value: ${queueitCookie.value}
Domain: ${queueitCookie.domain}
Path: ${queueitCookie.path}</pre>
    <p>3. Then go to: <a href="${baseUrl}" target="_blank">${baseUrl}</a></p>
  </div>
  
  <script>
    document.getElementById('bypassButton').addEventListener('click', function() {
      const loadingMessage = document.getElementById('loadingMessage');
      const errorMessage = document.getElementById('errorMessage');
      
      loadingMessage.classList.remove('hidden');
      
      try {
        // Set the queue-it cookie
        document.cookie = "${queueitCookie.name}=${queueitCookie.value}; domain=${queueitCookie.domain}; path=${queueitCookie.path}";
        
        // Redirect to the ticket page
        setTimeout(() => {
          window.location.href = "${baseUrl}";
        }, 1000);
      } catch(e) {
        console.error("Error:", e);
        loadingMessage.classList.add('hidden');
        errorMessage.classList.remove('hidden');
      }
    });
  </script>
</body>
</html>
    `;
    
    const bypassHtmlPath = path.join(__dirname, 'public', 'bypass.html');
    await fs.writeFile(bypassHtmlPath, bypassHtml);
    await logToFile(`📝 Created bypass HTML page at ${bypassHtmlPath}`);
    
    return bypassData;
  } else {
    await logToFile("⚠️ No Queue-it cookie found");
    return null;
  }
}

// --- Express Routes ---

// Health check endpoint
app.get('/', (req, res) => {
  logToFile("Health check endpoint accessed");
  res.send('PSG Queue Token+Cookie Handler is running');
});

// Endpoint to view logs
app.get('/logs', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `queue_handler_${date}.log`);
    const logs = await fs.readFile(logFile, 'utf8');
    res.type('text/plain').send(logs);
  } catch (err) {
    res.status(404).send('Log file not found');
  }
});

// Bypass endpoint
app.get('/bypass', async (req, res) => {
  try {
    // Serve the bypass HTML file
    res.sendFile(path.join(__dirname, 'public', 'bypass.html'));
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

// Start queue processing
app.post('/start', async (req, res) => {
  // Get URL from request
  const url = req.body.url;
  if (!url) {
    await logToFile("❌ Request received without URL");
    return res.status(400).send('Missing URL');
  }

  await logToFile(`🎯 Received queue link: ${url}`);
  res.send('Queue process started');

  try {
    await logToFile("🌐 Launching browser");
    
    // Determine Chrome path based on OS
    const chromePath = getChromeExecutablePath();
    await logToFile(`🔧 Using Chrome at: ${chromePath}`);
    
    // Configure browser
    const launchOptions = {
      headless: false, // Show browser for monitoring
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-features=site-per-process'
      ]
    };
    
    // Only set executablePath if needed
    if (process.env.USING_PUPPETEER_CORE === 'true') {
      launchOptions.executablePath = chromePath;
    }
    
    const browser = await puppeteer.launch(launchOptions);
    await logToFile("🖥️ Browser launched successfully");
    
    // Create a new page
    const page = await browser.newPage();
    await logToFile("📄 New page created");
    
    // Monitor all redirects
    const redirectChain = [];
    page.on('response', async response => {
      const status = response.status();
      const url = response.url();
      
      if (status >= 300 && status < 400) {
        const location = response.headers()['location'];
        if (location) {
          await logToFile(`🔄 Redirect: ${url} → ${location}`);
          redirectChain.push({
            from: url,
            to: location,
            status
          });
        }
      }
      
      // If we reach the ticket page
      if (url.includes('billetterie.psg.fr') && !url.includes('waitingroom.psg.fr')) {
        await logToFile(`🎫 Detected access to ticket page: ${url}`);
        
        // Process the successful queue completion
        await processQueueSuccess(page, url);
      }
    });
    
    // Enable logging of console messages from the page
    page.on('console', msg => {
      logToFile(`🖥️ Console [${msg.type()}]: ${msg.text()}`);
    });
    
    // Navigate to queue page
    await logToFile(`🌐 Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
    await logToFile("✅ Initial page loaded");
    
    // Take a screenshot
    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const screenshotPath = path.join(screenshotsDir, `initial_page_${timestamp}.png`);
      await page.screenshot({ path: screenshotPath });
      await logToFile(`📸 Screenshot taken: ${screenshotPath}`);
    } catch (err) {
      await logToFile(`❌ Error taking screenshot: ${err.message}`);
    }
    
    // Get the current URL and page title
    const currentUrl = page.url();
    const pageTitle = await page.title();
    await logToFile(`📍 Current URL: ${currentUrl}`);
    await logToFile(`📑 Page title: ${pageTitle}`);
    
    // Check if we're in a queue or already on the ticket page
    const inQueue = currentUrl.includes('waitingroom.psg.fr') || 
                  pageTitle.toLowerCase().includes('waiting') || 
                  pageTitle.toLowerCase().includes('queue') || 
                  pageTitle.toLowerCase().includes('file d\'attente');
    
    if (inQueue) {
      await logToFile("🔄 Detected queue page - waiting for completion");
      
      // Monitor for redirects to the ticket page
      let checkCount = 0;
      while (true) {
        checkCount++;
        await logToFile(`🔍 Check #${checkCount} - Monitoring queue status`);
        
        // Check if we've reached the ticket page
        const currentUrl = page.url();
        
        if (!currentUrl.includes('waitingroom.psg.fr') && currentUrl.includes('billetterie.psg.fr')) {
          await logToFile(`🎉 Redirected to ticket page: ${currentUrl}`);
          
          // Process the successful queue completion
          await processQueueSuccess(page, currentUrl);
          break;
        }
        
        // Wait 10 seconds before checking again
        await logToFile("⏱️ Waiting 10 seconds");
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    } else if (currentUrl.includes('billetterie.psg.fr')) {
      // Already on the ticket page
      await logToFile("🎉 Already on ticket page");
      
      // Process as a successful queue completion
      await processQueueSuccess(page, currentUrl);
    }
    
    // Keep the browser open for manual inspection
    await logToFile("✅ Process completed. Browser will remain open for 5 minutes.");
    await new Promise(resolve => setTimeout(resolve, 300000)); // 5 minutes
    
    await browser.close();
    await logToFile("🔒 Browser closed");
    
  } catch (err) {
    await logToFile(`❌ Error: ${err.message}`);
    await logToFile(`Stack trace: ${err.stack}`);
  }
});

app.listen(PORT, () => {
  logToFile(`🚀 Server started on port ${PORT}`);
});