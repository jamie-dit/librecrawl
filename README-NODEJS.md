# LibreCrawl - Node.js Edition

> 🚀 Modern SEO crawler and website auditing tool built with Node.js, TypeScript, React, and PostgreSQL

LibreCrawl is a free, open-source web crawler designed for SEO analysis, technical audits, and website mapping. This is the completely rewritten Node.js version with a modern tech stack and beautiful UI.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)
![React](https://img.shields.io/badge/React-18.2-61dafb.svg)

## ✨ Features

### Core Functionality
- 🕷️ **Multi-threaded web crawler** with configurable depth and rate limiting
- 🎨 **Modern React UI** with Tailwind CSS and shadcn/ui components
- 🔐 **Full authentication system** with JWT and bcrypt
- 📊 **Comprehensive SEO analysis** (titles, meta tags, headings, structured data)
- 🔗 **Link relationship mapping** with internal/external tracking
- 📈 **Data visualization** with interactive charts and graphs
- 🌓 **Dark mode support** with system preference detection
- 📱 **Fully responsive** design for mobile, tablet, and desktop
- 🐳 **Docker ready** with docker-compose for easy deployment
- 🔄 **Real-time progress tracking** with auto-refreshing status

### SEO Analysis
- Title tags, meta descriptions, and canonical URLs
- Heading structure (H1, H2, H3)
- Open Graph and Twitter Card tags
- JSON-LD structured data extraction
- Image alt text validation
- Analytics tool detection (GA4, GTM, Facebook Pixel, etc.)
- Word count and content metrics
- Robots.txt compliance

### Issue Detection
- Missing or duplicate titles
- Meta description length validation
- Missing H1 or multiple H1 tags
- Images without alt text
- Thin content detection
- HTTP errors (4xx, 5xx)
- Missing canonical URLs and OG tags

### Export Options
- CSV, JSON, and XML formats
- Separate exports for pages, links, and issues
- Customizable field selection

## 🏗️ Architecture

### Backend
- **Node.js 18+** with TypeScript
- **Express.js** for API routing
- **PostgreSQL** with Prisma ORM
- **Playwright** for JavaScript rendering
- **Cheerio** for HTML parsing
- **JWT** for authentication
- **Winston** for logging

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and builds
- **Tailwind CSS** for styling
- **shadcn/ui** component library (Radix UI primitives)
- **TanStack Query** for data fetching and caching
- **TanStack Table** for advanced data tables
- **Recharts** for data visualization
- **Zustand** for state management
- **React Hook Form** for form handling

### Database Schema
- **User management** with tier-based access control (Guest, User, Extra, Admin)
- **Crawl sessions** with configurable settings
- **Page data** with comprehensive SEO metrics
- **Link relationships** with full graph mapping
- **Issue tracking** with severity levels
- **Crawl history** for rate limiting

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+ (or use Docker)
- Git

### Local Development

1. **Clone the repository:**
```bash
git clone <your-repo-url>
cd librecrawl
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Install backend dependencies:**
```bash
npm install
```

4. **Install frontend dependencies:**
```bash
cd client
npm install
cd ..
```

5. **Set up the database:**
```bash
# Make sure PostgreSQL is running, then:
npm run prisma:generate
npm run prisma:migrate
```

6. **Start development servers:**
```bash
# Terminal 1: Start backend (port 3000)
npm run dev:server

# Terminal 2: Start frontend (port 5173)
npm run dev:client

# Or run both concurrently:
npm run dev
```

7. **Access the application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api
- API Health: http://localhost:3000/api/health

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

1. **Create environment file:**
```bash
cp .env.example .env
# Update JWT_SECRET and SESSION_SECRET with secure random strings
```

2. **Build and start containers:**
```bash
docker-compose up -d
```

3. **Run database migrations:**
```bash
docker-compose exec app npx prisma migrate deploy
```

4. **Access the application:**
- Application: http://localhost:3000

5. **View logs:**
```bash
docker-compose logs -f app
```

6. **Stop containers:**
```bash
docker-compose down
```

### Dokploy Deployment

See [DOKPLOY-DEPLOYMENT.md](./DOKPLOY-DEPLOYMENT.md) for detailed instructions on deploying to Dokploy.

## 📦 Environment Variables

### Required
```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Session
SESSION_SECRET=your-super-secret-session-key-change-in-production
```

### Optional
```env
# Application
NODE_ENV=production
PORT=3000
APP_URL=http://localhost:3000

# Crawler
MAX_CONCURRENT_CRAWLS=5
DEFAULT_CRAWL_DELAY=1000
MAX_URLS_PER_CRAWL=100000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Local Mode (bypass tier restrictions)
LOCAL_MODE=false
```

## 🔒 Security Features

- **Password hashing** with bcrypt (10 rounds)
- **JWT authentication** with configurable expiration
- **Rate limiting** on all API endpoints
- **CSRF protection** via SameSite cookies
- **Helmet.js** for security headers
- **Input validation** with express-validator
- **SQL injection protection** via Prisma parameterized queries
- **XSS protection** via React's built-in escaping

## 📊 User Tiers

### Guest (Unauthenticated)
- 3 crawls per 24 hours (IP-based)
- Basic features only
- No data persistence

### User (Free Registration)
- Unlimited crawls
- Data history
- Export capabilities
- Custom settings

### Extra & Admin
- Reserved for future premium features
- Admin: Full system access

### Local Mode
Set `LOCAL_MODE=true` to bypass all tier restrictions for self-hosting.

## 🛠️ Development

### Available Scripts

```bash
# Backend
npm run dev:server          # Start backend dev server with hot reload
npm run build:server        # Build backend TypeScript
npm start                   # Start production server

# Frontend
npm run dev:client          # Start frontend dev server
npm run build:client        # Build frontend for production

# Both
npm run dev                 # Start both servers concurrently
npm run build               # Build both backend and frontend

# Database
npm run prisma:generate     # Generate Prisma client
npm run prisma:migrate      # Run database migrations
npm run prisma:studio       # Open Prisma Studio GUI

# Docker
npm run docker:build        # Build Docker images
npm run docker:up           # Start Docker containers
npm run docker:down         # Stop Docker containers
npm run docker:logs         # View container logs
```

### Project Structure

```
librecrawl/
├── src/                    # Backend source
│   ├── server.ts          # Express app entry point
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic
│   │   ├── crawler.service.ts
│   │   ├── seo-extractor.service.ts
│   │   ├── issue-detector.service.ts
│   │   └── auth.service.ts
│   ├── middleware/        # Express middleware
│   └── utils/             # Utility functions
├── client/                # Frontend source
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utilities and API client
│   │   └── store/         # Zustand stores
│   └── public/            # Static assets
├── prisma/                # Database schema
│   └── schema.prisma
├── Dockerfile             # Multi-stage Docker build
├── docker-compose.yml     # Docker Compose config
└── package.json           # Dependencies and scripts
```

## 🎨 UI Components

The UI is built with **shadcn/ui** components:
- Button, Input, Label, Select, Switch
- Card, Tabs, Dialog, Sheet
- Table, Badge, Progress
- Toast notifications
- And more...

All components support:
- 🌓 Dark mode
- 📱 Responsive design
- ♿ Accessibility (ARIA)
- ⌨️ Keyboard navigation

## 🔄 Migration from Python Version

If you're migrating from the Python/Flask version:

1. **Export your data** from the old SQLite database
2. **Update your database** connection to PostgreSQL
3. **Run migrations** to create the new schema
4. **Import data** if needed (you may need to write a migration script)
5. **Update environment variables** to match the new format

Note: The new version uses PostgreSQL instead of SQLite for better scalability and concurrent access.

## 📝 API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/password` - Update password

### Crawls
- `POST /api/crawl/start` - Start new crawl
- `GET /api/crawl/:id` - Get crawl status
- `POST /api/crawl/:id/stop` - Stop running crawl
- `GET /api/crawl/:id/pages` - Get crawled pages
- `GET /api/crawl/:id/links` - Get link relationships
- `GET /api/crawl/:id/issues` - Get detected issues

### User
- `GET /api/user/settings` - Get user settings
- `PUT /api/user/settings` - Update user settings
- `GET /api/user/crawls` - Get user's crawl history

### Export
- `GET /api/export/:id/pages/:format` - Export pages (csv/json/xml)
- `GET /api/export/:id/links/csv` - Export links
- `GET /api/export/:id/issues/csv` - Export issues

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Original Python version by the LibreCrawl team
- Built with amazing open-source libraries
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)

## 💬 Support

- 📧 Email: [your-email]
- 🐛 Issues: [GitHub Issues](your-repo/issues)
- 💡 Feature Requests: [GitHub Discussions](your-repo/discussions)

---

**Built with ❤️ using Node.js, TypeScript, React, and PostgreSQL**
