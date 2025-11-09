# Deployment Guide - Virginia Trout Stocking Map

## Overview

This Next.js application requires a Node.js server environment and will not work as a static site due to server-side web scraping and API routes.

## Deployment Options

### Option 1: Vercel (Recommended - Easiest)

Vercel is the platform created by the Next.js team and provides the best deployment experience.

#### Quick Deploy

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   cd /workspace/virginia-trout-map
   vercel
   ```

3. **Follow the prompts**:
   - Set up and deploy: Yes
   - Which scope: (select your account)
   - Link to existing project: No
   - Project name: virginia-trout-map
   - Directory: ./
   - Override settings: No

4. **Production Deployment**:
   ```bash
   vercel --prod
   ```

The application will be live at: `https://virginia-trout-map.vercel.app` (or your custom domain)

**Advantages**:
- Zero configuration needed
- Automatic HTTPS
- Global CDN
- Automatic deployments on git push
- Free tier available

### Option 2: Netlify

Netlify also supports Next.js applications with full SSR capabilities.

#### Deploy to Netlify

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Deploy**:
   ```bash
   cd /workspace/virginia-trout-map
   netlify deploy
   ```

3. **Build command**: `pnpm build`
4. **Publish directory**: `.next`

5. **For production**:
   ```bash
   netlify deploy --prod
   ```

**Configuration**: Create `netlify.toml`:
```toml
[build]
  command = "pnpm build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### Option 3: Railway

Railway provides a simple deployment for full-stack applications.

1. **Go to**: https://railway.app
2. **Create new project** → Deploy from GitHub
3. **Select repository**: virginia-trout-map
4. **Configure**:
   - Build Command: `pnpm build`
   - Start Command: `pnpm start`
5. **Deploy**

### Option 4: DigitalOcean App Platform

1. **Go to**: https://cloud.digitalocean.com/apps
2. **Create App** → From GitHub
3. **Select repository**: virginia-trout-map
4. **Configure**:
   - Build Command: `pnpm build`
   - Run Command: `pnpm start`
   - HTTP Port: 3000
5. **Deploy**

### Option 5: Self-Hosted (VPS/Dedicated Server)

For self-hosting on your own server:

#### Prerequisites
- Ubuntu/Debian server
- Node.js 18+ installed
- Nginx (recommended for reverse proxy)

#### Steps

1. **Clone repository** to your server:
   ```bash
   git clone <your-repo-url>
   cd virginia-trout-map
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Build**:
   ```bash
   pnpm build
   ```

4. **Set up PM2** (process manager):
   ```bash
   npm install -g pm2
   pm2 start npm --name "virginia-trout-map" -- start
   pm2 save
   pm2 startup
   ```

5. **Configure Nginx** (optional but recommended):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

6. **Enable SSL** with Let's Encrypt:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

## Environment Configuration

### Required
No environment variables are required for basic functionality.

### Optional
Create `.env.local` for custom configuration:

```env
# Port (default: 3000)
PORT=3000

# Node environment
NODE_ENV=production
```

## Post-Deployment Testing

After deployment, verify functionality:

1. **Home Page**: Should load with Map tab
2. **Map Tab**: Should display interactive map with 3 layer types
3. **Schedule Tab**: Should show stocking events list
4. **Waters Tab**: Should display water bodies directory

### API Endpoints Test

```bash
# Replace with your deployed URL
DEPLOYED_URL="https://your-app.vercel.app"

# Test stocking data
curl "$DEPLOYED_URL/api/stocking-data"

# Test GeoJSON layers  
curl "$DEPLOYED_URL/api/geojson?layer=stocked-streams"
```

## Troubleshooting

### Build Fails
- Ensure Node.js version is 18+
- Clear cache: `rm -rf .next node_modules && pnpm install`
- Check for TypeScript errors: `pnpm build`

### API Routes Return 500
- Check server logs for error details
- Verify network access to external APIs:
  - https://dwr.virginia.gov
  - https://gis.dgif.virginia.gov

### Map Not Loading
- Check browser console for errors
- Verify Leaflet CSS is loaded
- Ensure JavaScript is enabled

## Performance Optimization

### Caching
- Stocking data is cached for 1 hour
- GeoJSON layers are cached for 1 hour
- Force refresh via API: `POST /api/stocking-data`

### CDN Integration
For static assets, configure Next.js CDN:
```js
// next.config.js
module.exports = {
  assetPrefix: process.env.CDN_URL || '',
}
```

## Monitoring

Recommended monitoring tools:
- **Vercel Analytics** (built-in on Vercel)
- **Sentry** for error tracking
- **Google Analytics** for user analytics

## Support

For issues:
1. Check server logs
2. Verify API endpoint responses
3. Test with `curl` or Postman
4. Review browser console for client-side errors

##  Scaling Considerations

- Consider using Redis for distributed caching (currently in-memory)
- Add rate limiting for API routes
- Use a CDN for static assets
- Consider serverless database for storing scraped data
