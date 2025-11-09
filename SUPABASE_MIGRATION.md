# Supabase Database Migration - Documentation

## Overview
Successfully migrated Virginia Trout Stocking Map from slow web scraping to instant Supabase database queries with automated daily updates.

## Changes Made

### 1. Database Infrastructure

#### Table Created: `trout_stocking_events`
```sql
CREATE TABLE trout_stocking_events (
  id BIGSERIAL PRIMARY KEY,
  stocking_date DATE NOT NULL,
  location TEXT NOT NULL,
  county TEXT NOT NULL,
  species TEXT NOT NULL,
  size TEXT,
  number_of_fish INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Indexes for Performance
- `idx_trout_stocking_date` - Fast date-based queries (DESC order for newest first)
- `idx_trout_stocking_county` - Fast county filtering
- `idx_trout_stocking_location` - Fast location searching
- `unique_stocking_event` - Prevents duplicates (stocking_date, location, species)

#### Row Level Security (RLS)
- **Public Read Access**: Anyone can query stocking events
- **Edge Function Write Access**: Both anon and service_role can insert/update for automated syncing

### 2. Data Migration

#### Historical Data Loaded
- **Total Records**: 5,735 stocking events
- **Date Range**: March 2021 - November 2025 (4+ years)
- **Coverage**: 53 counties, 16 species
- **Migration Method**: One-time edge function `migrate-historical-data`

### 3. Automated Daily Sync

#### Edge Function: `sync-stocking-data`
- **URL**: https://wbiuuvzkjkbfrwpirxwg.supabase.co/functions/v1/sync-stocking-data
- **Functionality**: Scrapes last 60 days of data from Virginia DWR website
- **Duplicate Handling**: Gracefully skips existing records
- **Response**: Returns scrapedEvents, newRecords, duplicates, totalRecords, lastSync

#### Cron Job Schedule
- **Schedule**: Daily at 11:00 UTC (6:00 AM EST)
- **Expression**: `0 11 * * *`
- **Job Name**: `sync-stocking-data_invoke`

### 4. API Route Updates

#### Before (Slow)
- Web scraping on every request (30+ seconds)
- In-memory cache with 1-hour TTL
- Scraped 10 years of data each time

#### After (Fast)
- Direct Supabase database query (< 1 second)
- Supports filtering: county, species, date range
- Supports pagination (limit, page)
- Returns totalCount, lastUpdated timestamp

#### New API Response Format
```json
{
  "success": true,
  "data": [...events],
  "count": 5,
  "totalCount": 5735,
  "page": 1,
  "limit": 5000,
  "lastUpdated": "2025-11-09T07:41:21.398369+00:00",
  "source": "database"
}
```

### 5. Frontend Updates

#### ScheduleTab Component
- **Added**: "Data last synced" timestamp display
- **Removed**: Old cache status display
- **Maintained**: All existing features (filtering, sorting, CSV export)

## Files Modified

### New Files
- `lib/supabase.ts` - Supabase client configuration
- `supabase/functions/sync-stocking-data/index.ts` - Daily sync edge function
- `supabase/functions/migrate-historical-data/index.ts` - One-time migration function
- `.eslintignore` - Excludes supabase functions from build
- `.env.local` - Supabase credentials

### Modified Files
- `app/api/stocking-data/route.ts` - Database queries instead of scraping
- `components/schedule/ScheduleTab.tsx` - Updated to show sync timestamp
- `package.json` - Added @supabase/supabase-js dependency
- `tsconfig.json` - Excluded supabase/functions and scripts folders

## Performance Improvement

### Before
- Initial Load: **30-60 seconds** (web scraping 10 years of data)
- Subsequent Loads: **5-10 seconds** (if within 1-hour cache window)
- Data Freshness: Up to 1 hour stale

### After
- Initial Load: **< 1 second** (database query)
- Subsequent Loads: **< 1 second** (database query)
- Data Freshness: Updated daily at 6 AM EST

## Testing Results

### API Test
```bash
curl http://localhost:3001/api/stocking-data?limit=5
```
Response: ✅ Returns 5 events in < 1 second

### Edge Function Test
```bash
curl -X POST https://wbiuuvzkjkbfrwpirxwg.supabase.co/functions/v1/sync-stocking-data
```
Response: ✅ Successfully synced (149 events scraped, 0 new, 149 duplicates)

### Cron Job
✅ Scheduled successfully: `0 11 * * *` (Daily 6 AM EST)

## Database Statistics
```sql
SELECT 
  COUNT(*) as total_records,
  MIN(stocking_date) as earliest_date,
  MAX(stocking_date) as latest_date,
  COUNT(DISTINCT county) as total_counties,
  COUNT(DISTINCT species) as total_species
FROM trout_stocking_events;
```

Results:
- Total Records: **5,735**
- Date Range: **2021-03-09 to 2025-11-07**
- Counties: **53**
- Species: **16**

## Deployment Instructions

### Prerequisites
- Node.js 18+ (20+ recommended)
- pnpm or npm

### Build
```bash
npm install
npm run build
```

### Environment Variables
Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=https://wbiuuvzkjkbfrwpirxwg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Deploy to Vercel
```bash
vercel deploy --prod
```

### Deploy to Netlify
```bash
netlify deploy --prod
```

## Maintenance

### Manual Data Sync
To trigger an immediate sync (outside the daily schedule):
```bash
curl -X POST http://your-domain.com/api/stocking-data
```

### Check Sync Status
Query the database for last update:
```sql
SELECT MAX(updated_at) as last_sync FROM trout_stocking_events;
```

### Monitor Cron Jobs
```sql
SELECT * FROM cron.job WHERE jobname = 'sync-stocking-data_invoke';
```

## Success Criteria - All Met ✅

- [x] Database table created with proper schema and indexes
- [x] Historical data migrated (5,735+ records from 2021-2025)
- [x] Edge function deploys successfully and syncs data correctly
- [x] Cron job scheduled for daily 6 AM EST runs
- [x] API route queries database instead of scraping (< 1 second response)
- [x] All frontend features work: filtering, sorting, calendar view, CSV export
- [x] No breaking changes to user interface
- [x] "Last Updated" timestamp displayed to users

## Notes

- Edge functions preserve original caller context for RLS
- Duplicate handling uses unique constraint on (stocking_date, location, species)
- Scraper targets last 60 days to catch updates and upcoming stockings
- Database automatically updates `updated_at` timestamp on modifications
