# LibreCrawl Setup Guide

Quick setup guide for getting LibreCrawl up and running.

## 🚀 Quick Start Options

### Option 1: Docker (Recommended for Production)

**Fastest way to get started!**

```bash
# 1. Clone and enter directory
git clone <your-repo>
cd librecrawl

# 2. Create environment file
cp .env.example .env
# Edit .env and set JWT_SECRET and SESSION_SECRET

# 3. Start everything
docker-compose up -d

# 4. Run database migrations
docker-compose exec app npx prisma migrate deploy

# 5. Access the app
# Open http://localhost:3000
```

### Option 2: Local Development

**Best for development and customization**

```bash
# 1. Prerequisites
# - Node.js 18+ and npm
# - PostgreSQL 14+

# 2. Clone repository
git clone <your-repo>
cd librecrawl

# 3. Install backend dependencies
npm install

# 4. Install frontend dependencies
cd client
npm install
cd ..

# 5. Set up environment
cp .env.example .env
# Edit .env with your PostgreSQL connection and secrets

# 6. Set up database
npm run prisma:generate
npm run prisma:migrate

# 7. Start development servers
npm run dev
# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

## 🔧 Environment Configuration

### Generate Secure Secrets

```bash
# Generate random secrets for JWT and SESSION
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Minimum Required `.env`

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/librecrawl"

# Security (CHANGE THESE!)
JWT_SECRET=your-generated-secret-here
SESSION_SECRET=your-generated-secret-here
```

### Full Configuration Options

See `.env.example` for all available options.

## 📦 Installation Steps Explained

### Backend Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```
   This installs all Node.js packages including Express, Prisma, Playwright, etc.

2. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```
   This generates TypeScript types from your database schema.

3. **Run Database Migrations**
   ```bash
   npm run prisma:migrate
   ```
   This creates all necessary database tables.

### Frontend Setup

1. **Navigate to Client Directory**
   ```bash
   cd client
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```
   This installs React, Vite, Tailwind, shadcn/ui, and other frontend packages.

3. **Install Missing Radix UI Package**
   ```bash
   npm install @radix-ui/react-slider
   ```

4. **Return to Root**
   ```bash
   cd ..
   ```

## 🗄️ Database Setup

### PostgreSQL Installation

#### macOS (using Homebrew)
```bash
brew install postgresql@16
brew services start postgresql@16
createdb librecrawl
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb librecrawl
sudo -u postgres createuser librecrawl
```

#### Windows
Download from: https://www.postgresql.org/download/windows/

#### Docker (Alternative)
```bash
docker run -d \
  --name librecrawl-postgres \
  -e POSTGRES_USER=librecrawl \
  -e POSTGRES_PASSWORD=your-password \
  -e POSTGRES_DB=librecrawl \
  -p 5432:5432 \
  postgres:16-alpine
```

### Update DATABASE_URL

In your `.env` file:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/librecrawl?schema=public"
```

Replace:
- `username` with your PostgreSQL user
- `password` with your PostgreSQL password
- `localhost` with your database host (if different)

## 🏃 Running the Application

### Development Mode

```bash
# Start both backend and frontend
npm run dev

# Or separately:
npm run dev:server  # Backend on :3000
npm run dev:client  # Frontend on :5173
```

### Production Mode

```bash
# Build everything
npm run build

# Start production server
npm start
# Application runs on :3000 (serves both API and frontend)
```

### Docker Mode

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## ✅ Verify Installation

### 1. Check Backend Health

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-...",
  "uptime": 123.456,
  "environment": "development"
}
```

### 2. Access Frontend

Open your browser to:
- **Development:** http://localhost:5173
- **Production/Docker:** http://localhost:3000

### 3. Register First User

1. Click "Register"
2. Create an account
3. Login with your credentials
4. You should see the dashboard

### 4. Test a Crawl

1. Enter a URL (e.g., `https://example.com`)
2. Configure settings
3. Click "Start Crawl"
4. Wait for results

## 🐛 Troubleshooting

### Database Connection Failed

**Error:** `Can't reach database server`

**Solutions:**
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in `.env`
- Check firewall allows port 5432
- Ensure database exists: `psql -l`

### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solutions:**
```bash
# Find process using port
lsof -ti:3000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

### Prisma Client Not Generated

**Error:** `Cannot find module '@prisma/client'`

**Solution:**
```bash
npm run prisma:generate
```

### Frontend Build Fails

**Error:** Module resolution errors

**Solutions:**
```bash
cd client
rm -rf node_modules package-lock.json
npm install
npm install @radix-ui/react-slider
cd ..
```

### Docker Build Slow

**Issue:** Docker build takes too long

**Solutions:**
- Ensure good internet connection
- Increase Docker memory (Docker Desktop settings)
- Use `docker-compose build --no-cache` for clean build

### Playwright Installation Issues

**Error:** Chromium download fails

**Solution:**
```bash
# Install system dependencies (Linux)
sudo apt-get install -y \
  libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libdbus-1-3 libxkbcommon0 \
  libatspi2.0-0 libxcomposite1 libxdamage1 \
  libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
  libcairo2 libasound2

# Reinstall Playwright
npx playwright install chromium
```

## 🔐 First-Time Security Setup

### 1. Change Default Secrets

**Critical!** Generate and set secure secrets:

```bash
# Generate JWT_SECRET
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate SESSION_SECRET
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output to your `.env` file.

### 2. Create Admin User (Optional)

```bash
# Connect to database
psql -U librecrawl -d librecrawl

# Promote user to admin
UPDATE "User" SET tier = 'ADMIN' WHERE email = 'your-email@example.com';
```

### 3. Enable Local Mode (Self-Hosting)

Add to `.env`:
```env
LOCAL_MODE=true
```

This bypasses all tier restrictions.

## 📊 Database Management

### View Database

```bash
# Open Prisma Studio (GUI)
npm run prisma:studio
# Opens at http://localhost:5555
```

### Backup Database

```bash
# Export to SQL file
pg_dump -U librecrawl librecrawl > backup.sql

# Or using Docker
docker exec librecrawl-postgres pg_dump -U librecrawl librecrawl > backup.sql
```

### Restore Database

```bash
# Restore from SQL file
psql -U librecrawl librecrawl < backup.sql

# Or using Docker
docker exec -i librecrawl-postgres psql -U librecrawl librecrawl < backup.sql
```

## 🎯 Next Steps

1. ✅ Read [README-NODEJS.md](./README-NODEJS.md) for features and architecture
2. ✅ Check [DOKPLOY-DEPLOYMENT.md](./DOKPLOY-DEPLOYMENT.md) for production deployment
3. ✅ Review API documentation in README
4. ✅ Customize crawler settings
5. ✅ Set up monitoring and backups

## 💬 Need Help?

- 📖 Documentation: See README-NODEJS.md
- 🐛 Issues: Open a GitHub issue
- 💡 Features: Start a GitHub discussion

---

**Happy Crawling! 🕷️**
