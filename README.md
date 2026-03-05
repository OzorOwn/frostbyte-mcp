# frostbyte-mcp

MCP server that gives AI agents access to 40+ developer APIs through one gateway. Works with Claude Desktop, Cursor, Windsurf, and any MCP-compatible client.

## Tools

| Tool | Description |
|------|------------|
| `geo_lookup` | IP geolocation — country, city, coordinates, timezone, ISP |
| `crypto_price` | Live cryptocurrency prices — BTC, ETH, SOL, and 40+ tokens |
| `dns_lookup` | DNS records — A, AAAA, MX, TXT, NS, CNAME, SOA |
| `whois_lookup` | Domain WHOIS/RDAP data — registrar, dates, nameservers |
| `take_screenshot` | Website screenshots — PNG, multiple viewports, dark mode |
| `scrape_url` | Web scraping — extract text, markdown, or HTML from any URL |
| `run_code` | Code execution — JavaScript, Python, TypeScript, Bash |
| `search_web` | Web search — structured results with titles and snippets |
| `shorten_url` | URL shortener — custom slugs, expiration, click analytics |
| `generate_pdf` | PDF generation — from HTML, URL, or Markdown |
| `create_paste` | Pastebin — code sharing with syntax highlighting |
| `transform_data` | Data conversion — JSON, CSV, XML, YAML, TSV, Markdown |
| `check_domain` | Domain availability — check across multiple TLDs |

## Quick Start

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "frostbyte": {
      "command": "node",
      "args": ["/path/to/frostbyte-mcp/src/index.js"],
      "env": {
        "FROSTBYTE_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Cursor / Windsurf

Add to your MCP settings:

```json
{
  "frostbyte": {
    "command": "node",
    "args": ["/path/to/frostbyte-mcp/src/index.js"],
    "env": {
      "FROSTBYTE_API_KEY": "your-api-key"
    }
  }
}
```

### npx (no install)

```json
{
  "mcpServers": {
    "frostbyte": {
      "command": "npx",
      "args": ["-y", "github:OzorOwn/frostbyte-mcp"],
      "env": {
        "FROSTBYTE_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Get an API Key

```bash
# Free — 200 credits, no signup
curl -X POST https://agent-gateway-kappa.vercel.app/api/keys/create
```

Or omit `FROSTBYTE_API_KEY` — the server auto-creates a free key on startup.

## Examples

Once connected, your AI agent can:

- *"What's the geolocation of 1.1.1.1?"* → calls `geo_lookup`
- *"Take a screenshot of https://news.ycombinator.com"* → calls `take_screenshot`
- *"What's the current Bitcoin price?"* → calls `crypto_price`
- *"Run this Python code: print(sum(range(100)))"* → calls `run_code`
- *"Scrape the content from https://example.com"* → calls `scrape_url`
- *"Look up DNS records for github.com"* → calls `dns_lookup`
- *"Convert this CSV to JSON: name,age\nAlice,30\nBob,25"* → calls `transform_data`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FROSTBYTE_API_KEY` | API key for authentication | Auto-created (free tier) |
| `FROSTBYTE_BASE_URL` | Gateway URL | `https://agent-gateway-kappa.vercel.app` |

## Requirements

- Node.js 18+
- No other dependencies (just `@modelcontextprotocol/sdk`)

## Full API Documentation

The MCP server proxies to the [Frostbyte API Gateway](https://agent-gateway-kappa.vercel.app) which provides 40+ services. For full API docs, see:

- [API Catalog](https://api-catalog-three.vercel.app)
- [Getting Started Guide](https://api-catalog-three.vercel.app/guides/getting-started)
- [AI Agent Starter Kit](https://github.com/OzorOwn/ai-agent-starter) — template repo with Python + Node.js examples
- [JavaScript & Python SDK](https://github.com/OzorOwn/frostbyte-api)
- [OpenAPI Spec](https://api-catalog-three.vercel.app/docs)

## License

MIT
