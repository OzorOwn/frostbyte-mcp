#!/usr/bin/env node
/**
 * Frostbyte MCP Server
 *
 * Model Context Protocol server that gives AI agents access to 40+ developer APIs
 * through a single gateway. Geolocation, crypto prices, screenshots, web scraping,
 * DNS, code execution, PDF generation, and more.
 *
 * Usage:
 *   FROSTBYTE_API_KEY=fb_xxx node src/index.js          (with existing key)
 *   node src/index.js                                    (auto-creates free key)
 *
 * Environment:
 *   FROSTBYTE_API_KEY  — API key (auto-created if not set)
 *   FROSTBYTE_BASE_URL — Gateway URL (default: https://agent-gateway-kappa.vercel.app)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const BASE_URL = process.env.FROSTBYTE_BASE_URL || 'https://agent-gateway-kappa.vercel.app';
let apiKey = process.env.FROSTBYTE_API_KEY || '';

// ─── Auto-create API key if not provided ─────────────────────────────────────

async function ensureApiKey() {
  if (apiKey) return;
  try {
    const res = await fetch(`${BASE_URL}/api/keys/create`, { method: 'POST' });
    const data = await res.json();
    if (data.key) {
      apiKey = data.key;
    }
  } catch {
    // Will fail on first tool call with auth error — that's fine
  }
}

// ─── Gateway fetch helper ────────────────────────────────────────────────────

async function gw(path, opts = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const fetchOpts = { method: opts.method || 'GET', headers };
  if (opts.body) {
    fetchOpts.body = JSON.stringify(opts.body);
    fetchOpts.method = opts.method || 'POST';
  }

  const res = await fetch(url, { ...fetchOpts, signal: AbortSignal.timeout(30000) });
  const ct = res.headers.get('content-type') || '';

  // Binary responses (screenshots, PDFs) → base64
  if (ct.startsWith('image/') || ct === 'application/pdf' || ct === 'application/octet-stream') {
    const buf = Buffer.from(await res.arrayBuffer());
    return { _binary: true, contentType: ct, base64: buf.toString('base64'), size: buf.length };
  }

  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text, status: res.status }; }
}

// ─── Tool Definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'geo_lookup',
    description: 'Look up geolocation data for an IP address. Returns country, city, region, coordinates, timezone, ISP, and ASN.',
    inputSchema: {
      type: 'object',
      properties: {
        ip: { type: 'string', description: 'IPv4 or IPv6 address to look up. Use "me" for your own IP.' },
      },
      required: ['ip'],
    },
  },
  {
    name: 'crypto_price',
    description: 'Get current cryptocurrency prices. Returns price in USD, 24h change, market cap, and volume for popular tokens.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Token symbol (e.g. "BTC", "ETH", "SOL"). Optional — omit to get all prices.' },
      },
    },
  },
  {
    name: 'dns_lookup',
    description: 'Look up DNS records for a domain. Returns A, AAAA, MX, TXT, NS, CNAME, and SOA records.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain name to resolve (e.g. "example.com")' },
      },
      required: ['domain'],
    },
  },
  {
    name: 'whois_lookup',
    description: 'Get WHOIS/RDAP registration data for a domain. Returns registrar, creation date, expiration, nameservers.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain to look up (e.g. "google.com")' },
      },
      required: ['domain'],
    },
  },
  {
    name: 'take_screenshot',
    description: 'Capture a screenshot of any URL. Returns the image as base64-encoded PNG. Supports viewport options.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to screenshot (e.g. "https://example.com")' },
        viewport: { type: 'string', enum: ['desktop', 'tablet', 'mobile', 'full'], description: 'Viewport size (default: desktop)' },
        dark_mode: { type: 'boolean', description: 'Enable dark mode (default: false)' },
      },
      required: ['url'],
    },
  },
  {
    name: 'scrape_url',
    description: 'Extract content from a web page. Returns clean text, markdown, or structured data. Handles JavaScript-rendered pages.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to scrape' },
        format: { type: 'string', enum: ['text', 'markdown', 'html'], description: 'Output format (default: markdown)' },
      },
      required: ['url'],
    },
  },
  {
    name: 'run_code',
    description: 'Execute code in a sandboxed environment. Supports JavaScript, Python, TypeScript, and Bash. Returns stdout, stderr, and exit code.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code to execute' },
        language: { type: 'string', enum: ['javascript', 'python', 'typescript', 'bash'], description: 'Programming language (default: javascript)' },
      },
      required: ['code'],
    },
  },
  {
    name: 'search_web',
    description: 'Search the web and get structured results. Returns titles, URLs, and snippets.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        num_results: { type: 'number', description: 'Number of results (default: 5, max: 20)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'shorten_url',
    description: 'Create a short URL with optional custom slug and expiration. Returns the shortened URL and click analytics.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Long URL to shorten' },
        slug: { type: 'string', description: 'Custom slug (optional, auto-generated if not set)' },
        expires_in: { type: 'string', description: 'Expiration (e.g. "1h", "7d", "30d")' },
      },
      required: ['url'],
    },
  },
  {
    name: 'generate_pdf',
    description: 'Generate a PDF from HTML content, a URL, or Markdown. Returns the PDF as base64.',
    inputSchema: {
      type: 'object',
      properties: {
        html: { type: 'string', description: 'HTML content to convert to PDF' },
        url: { type: 'string', description: 'URL to convert to PDF (alternative to html)' },
        markdown: { type: 'string', description: 'Markdown to convert to PDF (alternative to html/url)' },
      },
    },
  },
  {
    name: 'create_paste',
    description: 'Create a paste (like Pastebin) for sharing code or text. Auto-detects language. Returns a shareable URL.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Text or code to paste' },
        title: { type: 'string', description: 'Paste title (optional)' },
        language: { type: 'string', description: 'Programming language for syntax highlighting (auto-detected if not set)' },
        expires_in: { type: 'string', description: 'Expiration (e.g. "1h", "24h", "7d", "never")' },
      },
      required: ['content'],
    },
  },
  {
    name: 'transform_data',
    description: 'Convert data between formats: JSON, CSV, XML, YAML, TSV, Markdown table. Also supports base64, URL encoding, and hashing.',
    inputSchema: {
      type: 'object',
      properties: {
        data: { type: 'string', description: 'Input data to transform' },
        from: { type: 'string', enum: ['json', 'csv', 'xml', 'yaml', 'tsv'], description: 'Input format' },
        to: { type: 'string', enum: ['json', 'csv', 'xml', 'yaml', 'tsv', 'markdown'], description: 'Output format' },
      },
      required: ['data', 'from', 'to'],
    },
  },
  {
    name: 'check_domain',
    description: 'Check if a domain is available for registration across multiple TLDs.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain name to check (e.g. "myproject")' },
      },
      required: ['domain'],
    },
  },
];

// ─── Tool Handlers ───────────────────────────────────────────────────────────

const handlers = {
  async geo_lookup({ ip }) {
    return gw(`/v1/agent-geo/api/geo/${encodeURIComponent(ip)}`);
  },

  async crypto_price({ symbol }) {
    if (symbol) {
      return gw(`/v1/crypto-feeds/api/price/${encodeURIComponent(symbol.toUpperCase())}`);
    }
    return gw('/v1/crypto-feeds/api/prices');
  },

  async dns_lookup({ domain }) {
    return gw(`/v1/agent-dns/api/all/${encodeURIComponent(domain)}`);
  },

  async whois_lookup({ domain }) {
    return gw(`/v1/agent-dns/api/whois/${encodeURIComponent(domain)}`);
  },

  async take_screenshot({ url, viewport, dark_mode }) {
    const params = new URLSearchParams({ url });
    if (viewport) params.set('viewport', viewport);
    if (dark_mode) params.set('darkMode', 'true');
    return gw(`/v1/agent-screenshot/api/screenshot?${params}`);
  },

  async scrape_url({ url, format }) {
    return gw('/v1/agent-scraper/api/scrape', {
      body: { url, format: format || 'markdown' },
    });
  },

  async run_code({ code, language }) {
    return gw('/v1/agent-coderunner/api/execute', {
      body: { code, language: language || 'javascript' },
    });
  },

  async search_web({ query, num_results }) {
    const params = new URLSearchParams({ q: query });
    if (num_results) params.set('limit', String(num_results));
    return gw(`/v1/agent-search/api/search?${params}`);
  },

  async shorten_url({ url, slug, expires_in }) {
    const body = { url };
    if (slug) body.slug = slug;
    if (expires_in) body.expires_in = expires_in;
    return gw('/v1/agent-shorturl/api/shorten', { body });
  },

  async generate_pdf({ html, url, markdown }) {
    if (url) return gw('/v1/agent-pdfgen/api/pdf/from-url', { body: { url } });
    if (markdown) return gw('/v1/agent-pdfgen/api/pdf/from-markdown', { body: { markdown } });
    if (html) return gw('/v1/agent-pdfgen/api/pdf/from-html', { body: { html } });
    return { error: 'Provide html, url, or markdown' };
  },

  async create_paste({ content, title, language, expires_in }) {
    const body = { content };
    if (title) body.title = title;
    if (language) body.language = language;
    if (expires_in) body.expires_in = expires_in;
    return gw('/v1/agent-paste/api/pastes', { body });
  },

  async transform_data({ data, from, to }) {
    return gw('/v1/agent-transform/api/transform', {
      body: { data, from, to },
    });
  },

  async check_domain({ domain }) {
    return gw(`/v1/agent-dns/api/check/${encodeURIComponent(domain)}`);
  },
};

// ─── MCP Server Setup ────────────────────────────────────────────────────────

const server = new Server(
  { name: 'frostbyte-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  await ensureApiKey();

  const handler = handlers[name];
  if (!handler) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
      isError: true,
    };
  }

  try {
    const result = await handler(args || {});

    // Binary responses — return as embedded image/resource
    if (result && result._binary) {
      if (result.contentType.startsWith('image/')) {
        return {
          content: [
            { type: 'image', data: result.base64, mimeType: result.contentType },
            { type: 'text', text: `Screenshot captured (${result.size} bytes, ${result.contentType})` },
          ],
        };
      }
      // PDF or other binary — return as base64 text
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            format: result.contentType,
            size_bytes: result.size,
            base64: result.base64,
          }, null, 2),
        }],
      };
    }

    // JSON responses
    const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    return { content: [{ type: 'text', text }] };
  } catch (err) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }],
      isError: true,
    };
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────

async function main() {
  await ensureApiKey();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
