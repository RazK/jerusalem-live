/**
 * Jerusalem.live — Baileys WhatsApp microservice
 *
 * Connects to WhatsApp Web via Baileys, listens to approved groups,
 * and forwards messages to the FastAPI extraction pipeline.
 *
 * First-time setup:
 *   node src/index.js
 *   → QR code printed to terminal
 *   → Scan with WhatsApp on your phone (the bot account)
 *   → Session saved to SESSION_PATH — won't need QR again
 *
 * TODO for Claude Code:
 *   1. Implement makeWASocket connection with session persistence
 *   2. On messages.upsert: filter to approved groups (from Supabase whatsapp_groups table)
 *   3. For each message: upload images to Supabase Storage if > MAX_IMAGE_SIZE_KB
 *   4. POST to API_WEBHOOK_URL with HMAC-SHA256 signature header
 *   5. Health check endpoint on /health
 *
 * See docs/ENGINEERING_SPEC.md Section 1.3 for webhook payload shape.
 * See docs/ENGINEERING_SPEC.md Section 3.1 for the full sequence diagram.
 */

import "dotenv/config";
import http from "http";

const PORT = process.env.PORT || 3001;

// Health check server (required by Docker Compose + Railway)
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Baileys service listening on port ${PORT}`);
  console.log("TODO: implement WhatsApp connection");
});
