// server.js - Render Puppeteer handler

import express from 'express';
import puppeteer from 'puppeteer';
import { Client } from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const TWILIO_SID = process.env.TWILIO_SID;
const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM || 'whatsapp:+14155238886';
const TWILIO_TO = process.env.TWILIO_TO || 'whatsapp:+33630299726';

let client;
try {
  client = new Client(TWILIO_SID, TWILIO_TOKEN);
} catch (err) {
  console.error('❌ Error initializing Twilio:', err);
}

// Health check endpoint
app.get('/', (req, res) => {
  res.send('PSG Queue Handler is running');
});

app.post('/start', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).send('Missing URL');

  console.log(`🎯 Received queue link: ${url}`);
  res.send('Queue started');

  try {
    // Configure browser with required arguments for Render
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null
    });
    
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    console.log('👉 Navigating to queue URL...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Send initial notification
    if (client) {
      await client.messages.create({
        from: TWILIO_FROM,
        to: TWILIO_TO,
        body: '🚀 Entré dans la file PSG. Je te préviens dès que l\'accès est ouvert.'
      });
    }

    let done = false;
    let lastTitle = '';
    let attempts = 0;
    
    while (!done && attempts < 180) { // Check for max 30 minutes (180 * 10 seconds)
      attempts++;
      
      const title = await page.title();
      if (title !== lastTitle) {
        console.log(`🔄 Page title: ${title}`);
        lastTitle = title;
      }

      if (!title.toLowerCase().includes('queue') && !title.toLowerCase().includes('attente') && 
          !title.toLowerCase().includes('file')) {
        done = true;
        console.log('✅ Queue completed! Title no longer contains queue-related terms');
      } else {
        // Try to get position in queue
        try {
          const queueText = await page.evaluate(() => {
            const element = document.querySelector('body');
            return element ? element.innerText : '';
          });
          
          console.log(`🔢 Current page content snippet: ${queueText.substring(0, 100)}...`);
          
          if (queueText.includes('Position') || queueText.includes('position')) {
            const positionMatch = queueText.match(/[Pp]osition[:\s]+(\d+)/);
            if (positionMatch && positionMatch[1]) {
              console.log(`📊 Queue position: ${positionMatch[1]}`);
            }
          }
        } catch (error) {
          console.log('Could not extract queue position');
        }
        
        await new Promise((r) => setTimeout(r, 10000)); // Check every 10 seconds
      }
    }

    // Capture the URL once queue is done
    const finalUrl = page.url();
    console.log(`🔗 Final URL: ${finalUrl}`);

    // Send completion notification
    if (client) {
      await client.messages.create({
        from: TWILIO_FROM,
        to: TWILIO_TO,
        body: `✅ Tu peux accéder à la billetterie PSG. Ouvre ce lien dans ton navigateur immédiatement: ${finalUrl}`
      });
    }

    await browser.close();
    console.log('🎉 File terminée !');
  } catch (err) {
    console.error('❌ Erreur dans Puppeteer:', err);
    
    if (client) {
      await client.messages.create({
        from: TWILIO_FROM,
        to: TWILIO_TO,
        body: `❌ Erreur dans le script PSG queue handler: ${err.message}. Vérifie Render.`
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});