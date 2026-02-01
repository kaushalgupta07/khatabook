/**
 * KhataBook frontend static server.
 * Serves the vanilla JS app from project root on port 5500.
 * Use this server (npm run frontend) so add.html, report.html, and assets load correctly.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5500;
const ROOT = path.resolve(__dirname);

// Explicitly serve key HTML pages so they always work (avoids path/cache issues)
const htmlPages = ['index.html', 'add.html', 'report.html', 'login.html', 'logout.html'];
htmlPages.forEach((name) => {
  const filePath = path.join(ROOT, name);
  if (fs.existsSync(filePath)) {
    app.get('/' + name, (req, res) => res.sendFile(filePath));
  }
});

// Serve root (/) as index
app.get('/', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));

// Static assets (js/, css/, manifest.json, etc.)
app.use(express.static(ROOT));

// Fallback: unknown routes -> index.html (SPA-safe)
app.get('*', (req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`KhataBook frontend: http://localhost:${PORT}`);
  console.log(`  Serving from: ${ROOT}`);
  console.log(`  Login: http://localhost:${PORT}/login.html`);
  console.log(`  Add:   http://localhost:${PORT}/add.html`);
  console.log(`  Report: http://localhost:${PORT}/report.html`);
});
