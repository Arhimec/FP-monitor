import express from 'express';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Configuration: Collections to track
const DEFAULT_COLLECTIONS = ['SRB-61daf7', 'HYPEDAF-9378b5', 'BAXC-cdf74d', 'NERD-794a0d'];

interface CollectionStat {
  collection: string;
  floorPrice: number;
  totalNfts: number;
  nftsListed: number;
  totalVolume: number;
  averagePrice: number;
  fetched_at: string;
}

// Function to fetch stats and save to JSONL
async function fetchAndSaveStats() {
  console.log(`[${new Date().toISOString()}] Starting daily stats fetch...`);
  try {
    const ids = DEFAULT_COLLECTIONS.join(',');
    const url = `https://api.oox.art/collections-stats?collections=${ids}`;
    const response = await axios.get(url);
    const stats: CollectionStat[] = response.data;

    for (const stat of stats) {
      const record = {
        ...stat,
        fetched_at: new Date().toISOString(),
      };
      const filePath = path.join(DATA_DIR, `${stat.collection}.jsonl`);
      fs.appendFileSync(filePath, JSON.stringify(record) + '\n');
      console.log(`Saved stats for ${stat.collection}`);
    }
  } catch (error) {
    console.error('Error fetching stats:', error instanceof Error ? error.message : error);
  }
}

// Schedule daily fetch at midnight
cron.schedule('0 0 * * *', fetchAndSaveStats);

// Run initial fetch on startup if data directory is empty or just for fresh data
// In a real production app, we might check when it was last fetched.
// For this app, let's run it once on startup.
fetchAndSaveStats();

async function startServer() {
  // API Routes
  app.get('/api/collections', (req, res) => {
    res.json(DEFAULT_COLLECTIONS);
  });

  app.get('/api/stats/:id', (req, res) => {
    const collectionId = req.params.id;
    const filePath = path.join(DATA_DIR, `${collectionId}.jsonl`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'No data found for this collection' });
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = content
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to read data file' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const basePath = process.env.VITE_BASE_PATH || '/';
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      base: basePath
    });
    
    console.log(`[Development] Vite Middleware active at: ${basePath}`);
    app.use(basePath, vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    const basePath = process.env.VITE_BASE_PATH || '/';
    
    console.log(`[Production] Serving from: ${distPath}`);
    console.log(`[Production] Base Path: ${basePath}`);

    // Verify dist directory exists to help user debug
    if (!fs.existsSync(distPath)) {
      console.warn(`WARNING: 'dist' directory not found at ${distPath}. Did you run 'npm run build'?`);
    }

    // Serve static files from the base path
    app.use(basePath, express.static(distPath, {
      index: 'index.html',
      // Ensure we don't accidentally return 403 for directories
      directoryDotFiles: 'ignore'
    }));
    
    // Handle SPA routing for the subpath
    // This catches everything under the subpath and returns index.html
    app.get(`${basePath}*`, (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build files missing. Please run "npm run build".');
      }
    });
  }

  // Fallback for root if base path is different (e.g. redirect / to /fp-monitor/)
  const basePath = process.env.VITE_BASE_PATH || '/';
  if (basePath !== '/') {
    app.get('/', (req, res) => {
      res.redirect(basePath);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is externally accessible at port ${PORT}`);
    console.log(`Development URL: ${process.env.APP_URL || 'http://localhost:3000'}`);
  });
}

startServer();
