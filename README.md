# LibreCrawl

A web-based multi-tenant crawler for SEO analysis and website auditing.

🌐 **Website**: [librecrawl.com](https://librecrawl.com)
**Try the Live Demo:** [crawl.librecrawl.com](https://crawl.librecrawl.com/)

## What it does

LibreCrawl crawls websites and gives you detailed information about pages, links, SEO elements, and performance. It's built as a web application using Python Flask with a modern web interface supporting multiple concurrent users.

## Features

### Core Features
- 🚀 **Multi-tenancy** - Multiple users can crawl simultaneously with isolated sessions
- 🎨 **Custom CSS styling** - Personalize the UI with your own CSS themes
- 💾 **Browser localStorage persistence** - Settings saved per browser
- 🔄 **JavaScript rendering** for dynamic content (React, Vue, Angular, etc.)
- 📊 **SEO analysis** - Extract titles, meta descriptions, headings, etc.
- 🔗 **Link analysis** - Track internal and external links with detailed relationship mapping
- 📈 **PageSpeed Insights integration** - Analyze Core Web Vitals
- 💾 **Multiple export formats** - CSV, JSON, or XML with streaming support
- 🔍 **Issue detection** - Automated SEO issue identification
- ⚡ **Real-time crawling progress** with live statistics

### Performance & Scalability
- ⚡ **Database connection pooling** - Reduce DB overhead with 10-connection pool
- 🗄️ **Database indexes** - Optimized queries for 10-100x faster authentication
- 💾 **Settings caching** - 5-minute in-memory cache reduces DB load by 95%
- 📊 **Incremental updates** - Send only new data since last poll (50-80% bandwidth reduction)
- 🔗 **Optimized data structures** - 50% reduction in memory usage for links
- 🔒 **Per-session locks** - True multi-user parallelism without global lock contention
- 📄 **Result pagination** - Fetch results in pages (100-1000 items at a time)
- 🌊 **Streaming exports** - Memory-efficient exports in chunks

### Operations & Monitoring
- 🏥 **Health check endpoint** - `/health` for monitoring and load balancers
- 📝 **Comprehensive logging** - Structured logging with configurable levels
- ⚙️ **Environment configuration** - Configure via `.env` file
- 🔐 **Secure secrets** - Store sensitive config in environment variables
- 🚦 **Rate limiting** - Configurable per-minute and per-hour limits
- ⏱️ **Configurable timeouts** - Adjust session timeout based on needs

## Getting started

### Requirements

- Python 3.8 or later
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. Clone or download this repository

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. (Optional) Configure environment variables:
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your preferred settings
# Important settings:
#   FLASK_SECRET_KEY - Change this for production!
#   SESSION_TIMEOUT_HOURS - Session expiration time
#   RATE_LIMIT_PER_MINUTE - API rate limiting
#   LOG_LEVEL - DEBUG, INFO, WARNING, ERROR
```

4. For JavaScript rendering support (optional):
```bash
playwright install chromium
```

5. Run the application:
```bash
# Standard mode (with authentication and tier system)
python main.py

# Local mode (all users get admin tier, no rate limits)
python main.py --local
# or
python main.py -l
```

5. Open your browser and navigate to:
   - Local: `http://localhost:5000`
   - Network: `http://<your-ip>:5000`

### Running Modes

**Standard Mode** (default):
- Full authentication system with login/register
- Tier-based access control (Guest, User, Extra, Admin)
- Guest users limited to 3 crawls per 24 hours (IP-based)
- Ideal for public-facing demos or shared hosting

**Local Mode** (`--local` or `-l`):
- All users automatically get admin tier access
- No rate limits or tier restrictions
- Perfect for personal use or single-user self-hosting
- Recommended for local development and testing

## Configuration

Click "Settings" to configure:

- **Crawler settings**: depth (up to 5M URLs), delays, external links
- **Request settings**: user agent, timeouts, proxy, robots.txt
- **JavaScript rendering**: browser engine, wait times, viewport size
- **Filters**: file types and URL patterns to include/exclude
- **Export options**: formats and fields to export
- **Custom CSS**: personalize the UI appearance with custom styles
- **Issue exclusion**: patterns to exclude from SEO issue detection

For PageSpeed analysis, add a Google API key in Settings > Requests for higher rate limits (25k/day vs limited).

## Export formats

- **CSV**: Spreadsheet-friendly format
- **JSON**: Structured data with all details
- **XML**: Markup format for other tools

## Multi-tenancy

LibreCrawl supports multiple concurrent users with isolated sessions:

- Each browser session gets its own crawler instance and data
- Settings are stored in browser localStorage (persistent across restarts)
- Custom CSS themes are per-browser
- Sessions expire after 1 hour of inactivity
- Crawl data is isolated between users

## API Endpoints

LibreCrawl provides several API endpoints for programmatic access:

### Core Endpoints
- `GET /health` - Health check endpoint (system stats, active sessions/crawls)
- `GET /api/crawl_status` - Get current crawl status with incremental updates
- `GET /api/results_paginated` - Fetch paginated results (urls, links, or issues)
- `GET /api/export_stream` - Stream export data in chunks (CSV or JSON)
- `POST /api/start_crawl` - Start a new crawl
- `POST /api/stop_crawl` - Stop the current crawl

### Pagination Parameters
- `page` - Page number (default: 1)
- `per_page` - Items per page (default: 100, max: 1000)
- `type` - Data type: `urls`, `links`, or `issues`

### Incremental Updates
The crawl_status endpoint supports incremental updates:
- `last_url_index` - Index of last URL received
- `last_link_index` - Index of last link received
- `last_issue_index` - Index of last issue received
- `full=true` - Force full dataset return

### Streaming Export
Stream large datasets without loading everything into memory:
```bash
# Stream URLs as CSV
curl "http://localhost:5000/api/export_stream?format=csv&type=urls"

# Stream links as JSON
curl "http://localhost:5000/api/export_stream?format=json&type=links"
```

## Known limitations

- PageSpeed API has rate limits (works better with API key)
- Large sites may take time to crawl completely
- JavaScript rendering is slower than HTTP-only crawling
- Settings stored in localStorage (cleared if browser data is cleared)

## Files

- `main.py` - Main application and Flask server
- `src/crawler.py` - Core crawling engine
- `src/settings_manager.py` - Configuration management
- `src/config.py` - Environment configuration loader
- `src/logger.py` - Centralized logging setup
- `src/auth_db.py` - Database operations with connection pooling
- `src/core/` - Core modules (link management, SEO extraction, etc.)
- `web/` - Frontend interface files
- `.env.example` - Example environment configuration

## License

MIT License - see LICENSE file for details.
