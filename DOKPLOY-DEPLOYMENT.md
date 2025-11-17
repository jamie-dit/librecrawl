# Deploying LibreCrawl to Dokploy

This guide walks you through deploying LibreCrawl (Node.js edition) to a Dokploy server.

## Prerequisites

- A Dokploy server up and running
- Domain name (optional but recommended)
- Git repository with LibreCrawl code
- Basic knowledge of Docker and environment variables

## Step-by-Step Deployment

### 1. Prepare Your Dokploy Server

1. **Access your Dokploy dashboard**
2. **Create a new application**
   - Click "New Application"
   - Choose "Docker Compose" as the deployment method
   - Name it `librecrawl`

### 2. Connect Your Git Repository

1. **Link your Git repository**
   - In the Dokploy application settings
   - Add your repository URL
   - Configure branch (usually `main` or `master`)
   - Add deploy key or access token if private repository

### 3. Configure Environment Variables

In Dokploy, add these environment variables:

#### Required Variables

```env
# Database (Dokploy will provide PostgreSQL)
DATABASE_URL=postgresql://librecrawl:SECURE_PASSWORD@postgres:5432/librecrawl?schema=public

# JWT Authentication - CHANGE THESE!
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Session - CHANGE THIS!
SESSION_SECRET=your-super-secret-session-key-change-in-production

# Application
NODE_ENV=production
PORT=3000
```

#### Optional Variables

```env
# Crawler Settings
MAX_CONCURRENT_CRAWLS=5
DEFAULT_CRAWL_DELAY=1000
MAX_URLS_PER_CRAWL=100000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Local Mode (bypass tier restrictions)
LOCAL_MODE=false

# CORS (if frontend is on different domain)
CORS_ORIGIN=https://yourdomain.com
```

**🔒 Security Note:** Generate secure random strings for `JWT_SECRET` and `SESSION_SECRET`:
```bash
# On your local machine, run:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Configure PostgreSQL Database

#### Option A: Use Dokploy's Built-in PostgreSQL

1. In Dokploy, create a new PostgreSQL database service
2. Name it `librecrawl-postgres`
3. Set credentials:
   - Database: `librecrawl`
   - User: `librecrawl`
   - Password: Generate a secure password
4. Link the database to your application
5. Update `DATABASE_URL` environment variable accordingly

#### Option B: Use External PostgreSQL

1. Set up a PostgreSQL database (e.g., on DigitalOcean, AWS RDS, etc.)
2. Create a database named `librecrawl`
3. Create a user with full permissions on the database
4. Update `DATABASE_URL` with the connection string

### 5. Configure Docker Compose in Dokploy

Dokploy should detect your `docker-compose.yml`. If you need to customize it for Dokploy:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      SESSION_SECRET: ${SESSION_SECRET}
      PORT: 3000
    depends_on:
      - postgres
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: librecrawl
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: librecrawl
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U librecrawl"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres-data:
```

### 6. Deploy the Application

1. **Trigger deployment**
   - Click "Deploy" in Dokploy
   - Dokploy will:
     - Pull your code from Git
     - Build the Docker images
     - Start the containers
     - Run health checks

2. **Monitor the deployment**
   - Watch the logs in Dokploy dashboard
   - Wait for the build to complete (5-10 minutes first time)
   - Check that containers are healthy

3. **Run database migrations**
   - Once the app is running, access the container:
   ```bash
   # In Dokploy's container terminal, or via SSH:
   docker exec -it librecrawl-app npx prisma migrate deploy
   ```

### 7. Configure Domain (Optional)

1. **In Dokploy:**
   - Go to your application settings
   - Add your domain name
   - Configure SSL/TLS (Let's Encrypt)

2. **DNS Configuration:**
   - Point your domain to your Dokploy server's IP
   - Add A record: `yourdomain.com` → `your-server-ip`
   - Add CNAME record: `www.yourdomain.com` → `yourdomain.com`

3. **Update environment:**
   - Set `APP_URL` to your domain
   - Set `CORS_ORIGIN` if needed

### 8. Verify Deployment

1. **Check health endpoint:**
   ```bash
   curl https://yourdomain.com/api/health
   ```

2. **Test the application:**
   - Visit your domain in a browser
   - Register a new account
   - Start a test crawl
   - Verify all features work

3. **Check logs:**
   - In Dokploy dashboard, view application logs
   - Look for any errors or warnings

## Post-Deployment

### Create Admin User (Optional)

To create an admin user, connect to your database:

```bash
# Access PostgreSQL in Dokploy
docker exec -it librecrawl-postgres psql -U librecrawl -d librecrawl

# Update user tier to ADMIN
UPDATE "User" SET tier = 'ADMIN' WHERE email = 'your-email@example.com';
```

### Enable Local Mode (Self-Hosting)

If you're self-hosting and want to bypass tier restrictions:

1. Set `LOCAL_MODE=true` in environment variables
2. Restart the application

### Monitoring

1. **Application Logs:**
   - View in Dokploy dashboard
   - Logs are stored in `/app/logs/` inside the container

2. **Database Backups:**
   - Configure automatic backups in Dokploy
   - Or use PostgreSQL backup tools:
   ```bash
   docker exec librecrawl-postgres pg_dump -U librecrawl librecrawl > backup.sql
   ```

3. **Resource Monitoring:**
   - Monitor CPU, memory, and disk usage in Dokploy
   - Set up alerts for high resource usage

### Scaling

#### Vertical Scaling (Increase Resources)
1. In Dokploy, increase CPU/memory limits
2. Update crawler settings:
   - Increase `MAX_CONCURRENT_CRAWLS`
   - Adjust `MAX_URLS_PER_CRAWL`

#### Horizontal Scaling (Multiple Instances)
For high-traffic scenarios:
1. Set up a load balancer
2. Deploy multiple app instances
3. Use a shared Redis instance for session storage
4. Configure PostgreSQL connection pooling

## Troubleshooting

### Build Fails

**Issue:** Docker build fails or times out

**Solutions:**
- Check Dokploy build logs for specific errors
- Ensure sufficient disk space on server
- Verify Node.js and npm versions in Dockerfile
- Try increasing build timeout in Dokploy settings

### Database Connection Fails

**Issue:** App can't connect to PostgreSQL

**Solutions:**
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running: `docker ps`
- Ensure PostgreSQL accepts connections from app container
- Check network configuration in docker-compose.yml
- Verify database credentials

### App Crashes on Startup

**Issue:** Container starts but immediately exits

**Solutions:**
- Check application logs in Dokploy
- Verify all required environment variables are set
- Ensure database migrations were run
- Check for port conflicts
- Review health check configuration

### Crawls Fail or Timeout

**Issue:** Crawls start but don't complete

**Solutions:**
- Increase container memory limits
- Adjust crawler timeouts in code
- Check if target websites block your server IP
- Review crawler logs for specific errors
- Disable JS rendering if not needed (reduces memory usage)

### SSL Certificate Issues

**Issue:** HTTPS doesn't work or shows certificate errors

**Solutions:**
- Verify domain DNS points to correct IP
- Regenerate Let's Encrypt certificate in Dokploy
- Check that port 443 is open on server
- Ensure domain is properly configured in Dokploy

## Performance Optimization

### 1. Enable Connection Pooling

Add to `DATABASE_URL`:
```
postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10
```

### 2. Optimize Crawler Settings

```env
# Reduce concurrent crawls for lower memory usage
MAX_CONCURRENT_CRAWLS=3

# Increase delay for more polite crawling
DEFAULT_CRAWL_DELAY=2000

# Limit URLs per crawl
MAX_URLS_PER_CRAWL=10000
```

### 3. Enable Compression

Already enabled in the app via the `compression` middleware.

### 4. CDN (Optional)

For better frontend performance:
- Deploy static assets to a CDN
- Update asset URLs in build configuration

## Security Checklist

- ✅ Change default JWT_SECRET and SESSION_SECRET
- ✅ Use strong database passwords
- ✅ Enable HTTPS with valid SSL certificate
- ✅ Configure CORS properly
- ✅ Set up firewall rules (only ports 80, 443, 22 open)
- ✅ Keep Docker images updated
- ✅ Regular database backups
- ✅ Monitor application logs
- ✅ Set up rate limiting (already included)
- ✅ Regular security updates

## Backup and Restore

### Backup

```bash
# Database backup
docker exec librecrawl-postgres pg_dump -U librecrawl librecrawl > backup-$(date +%Y%m%d).sql

# Upload to cloud storage
# Use your preferred backup solution (S3, Backblaze, etc.)
```

### Restore

```bash
# Restore database
docker exec -i librecrawl-postgres psql -U librecrawl librecrawl < backup.sql
```

## Updating the Application

1. **Push code to Git repository**
2. **In Dokploy:**
   - Click "Redeploy"
   - Monitor build process
   - Check health status
3. **Run new migrations if needed:**
   ```bash
   docker exec librecrawl-app npx prisma migrate deploy
   ```

## Support

If you encounter issues:
1. Check Dokploy documentation
2. Review application logs
3. Open an issue on GitHub
4. Contact Dokploy support

---

**Happy Crawling! 🕷️**
