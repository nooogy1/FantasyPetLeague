// backend/scrapers/houston-scraper.js - Wrapper to call Python BARC scraper
const { spawn } = require('child_process');
const path = require('path');

async function scrapeAndStore() {
  return new Promise((resolve, reject) => {
    console.log('[Scraper] Starting BARC pet scrape...');
    const startTime = Date.now();

    const pythonScript = path.join(__dirname, 'barc_scraper.py');
    const pythonProcess = spawn('python3', [pythonScript], {
      env: { ...process.env }
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
      console.log(data.toString());
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error('[Scraper Error]', data.toString());
    });

    pythonProcess.on('close', (code) => {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      if (code !== 0) {
        console.error('[Scraper] Process exited with code', code);
        reject(new Error(`Python scraper failed: ${errorOutput}`));
        return;
      }

      try {
        // Parse JSON from last line of output
        const lines = output.trim().split('\n');
        const jsonLine = lines[lines.length - 1];
        const result = JSON.parse(jsonLine);
        
        console.log('[Scraper] Complete:', result);
        resolve(result);
      } catch (error) {
        console.error('[Scraper] Failed to parse output:', error);
        reject(error);
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('[Scraper] Failed to start process:', error);
      reject(error);
    });
  });
}

module.exports = { scrapeAndStore };