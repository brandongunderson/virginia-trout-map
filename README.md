# Virginia Trout Stocking Map

A full-stack Next.js application for tracking Virginia trout stocking schedules and locations.

## Features

- **Interactive Map**: Leaflet-based map displaying 3 GeoJSON layers from Virginia DWR
  - Stocked Streams
  - Stocked Lakes
  - Wild Streams
  
- **Schedule Tab**: Browse and filter stocking events
  - Advanced filtering by county and species
  - Search functionality
  - Sortable columns
  - CSV export
  
- **Waters Tab**: Directory of all stocked water bodies
  - Filter by county
  - Search by name
  - View stocking statistics

## Technology Stack

- **Frontend**: React 19, Next.js 14 (App Router), TypeScript
- **Maps**: Leaflet.js 1.9.4, React-Leaflet
- **UI**: Tailwind CSS
- **State Management**: Zustand
- **Data Processing**: node-html-parser, date-fns

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (or npm/yarn)

### Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

The application will be available at `http://localhost:3000`

## Data Sources

- **ArcGIS FeatureServer**: Virginia DWR geospatial layers
- **Web Scraping**: Virginia DWR stocking schedule (https://dwr.virginia.gov/fishing/trout-stocking-schedule/)

## Features

### Server-Side Data Fetching
- API routes handle data fetching and caching
- 1-hour TTL on cached data
- Force refresh capability

### Responsive Design
- Mobile-friendly interface
- Adaptive layouts for all screen sizes

## Deployment

This is a full-stack Next.js application that requires a Node.js server.

### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Deploy to Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- AWS (via Amplify or EC2)
- DigitalOcean App Platform
- Custom Node.js server

### Environment Variables

No environment variables are required for basic functionality.

## API Routes

- `GET /api/geojson` - Fetch GeoJSON layers
- `GET /api/stocking-data` - Fetch stocking schedule
- `POST /api/stocking-data` - Force refresh cache

## License

MIT

