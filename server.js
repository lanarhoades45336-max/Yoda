import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: '128kb' }));
app.use(express.static(__dirname));

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

/* ── SYSTEM PROMPT BUILDER ─────────────────────────────────── */
function buildSystemPrompt({ top20 = [], globalStats = {}, trending = [] }) {
  const topList = top20.map((c, i) =>
    `${i + 1}. ${c.name} (${c.symbol.toUpperCase()}) — Price: ${c.price} | 1h: ${c.h1}% | 24h: ${c.h24}% | 7d: ${c.d7}% | Mkt Cap: ${c.mcap}`
  ).join('\n');

  const trendList = trending.map((c, i) =>
    `${i + 1}. ${c.name} (${c.symbol.toUpperCase()}) — 24h change: ${c.change24h}%`
  ).join('\n');

  return `You are YODA AI, a sharp cryptocurrency market analyst embedded inside the YODA CRYPTO real-time dashboard.

## Live Market Snapshot (auto-refreshed every 30s)

**Global Statistics:**
- Total Market Cap: ${globalStats.marketCap || 'N/A'}
- 24h Volume: ${globalStats.volume || 'N/A'}
- BTC Dominance: ${globalStats.btcDom || 'N/A'}
- Market Cap Change (24h): ${globalStats.mcapChange || 'N/A'}
- Active Assets: ${globalStats.activeAssets || 'N/A'}

**Top 20 by Market Cap:**
${topList || 'Data loading…'}

**Trending Now:**
${trendList || 'Data loading…'}

## Behavior
- Be direct, concise, and data-driven — like a professional analyst, not a textbook
- Reference the live numbers above when relevant to the question
- Use markdown: **bold** for coin names/key stats, bullet lists for comparisons, \`code\` for ticker symbols
- Keep responses under 300 words unless deep analysis is explicitly requested
- Never give financial advice. Always clarify you're providing market analysis only
- Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
}

/* ── CHAT ENDPOINT ──────────────────────────────────────────── */
app.post('/api/chat', async (req, res) => {
  const { messages, marketSnapshot } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages' });
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: buildSystemPrompt(marketSnapshot || {}),
      messages: messages.slice(-12).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content).slice(0, 4000),
      })),
    });

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ t: text })}\n\n`);
    });

    await stream.finalMessage();
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err) {
    console.error('Claude API error:', err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

/* ── START ──────────────────────────────────────────────────── */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  ◈ YODA CRYPTO running → http://localhost:${PORT}`);
  console.log(`  ◈ API key: ${process.env.ANTHROPIC_API_KEY ? '✓ set' : '✗ missing (set ANTHROPIC_API_KEY)'}\n`);
});
