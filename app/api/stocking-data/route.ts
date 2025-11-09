// API endpoint for trout stocking schedule data with caching

import { NextRequest, NextResponse } from 'next/server';
import { scrapeStockingData, filterEventsByDateRange } from '@/lib/scraper';
import { cache } from '@/lib/cache';
import { StockingEvent } from '@/lib/types';

const CACHE_KEY = 'stocking-data';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const forceRefresh = searchParams.get('refresh') === 'true';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // Check cache first (unless force refresh)
    let events: StockingEvent[] | null = null;
    
    if (!forceRefresh) {
      events = cache.get<StockingEvent[]>(CACHE_KEY);
    }

    // If not cached or force refresh, scrape fresh data
    if (!events) {
      console.log('Fetching fresh stocking data...');
      events = await scrapeStockingData();
      
      // Cache the results
      cache.set(CACHE_KEY, events);
      console.log(`Cached ${events.length} stocking events`);
    }

    // Apply date filters if provided
    let filteredEvents = events;
    if (startDate || endDate) {
      filteredEvents = filterEventsByDateRange(events, startDate, endDate);
    }

    // Get cache status
    const cacheStatus = cache.getStatus(CACHE_KEY);

    return NextResponse.json({
      success: true,
      data: filteredEvents,
      cache: cacheStatus,
      count: filteredEvents.length,
    });

  } catch (error) {
    console.error('Error in stocking-data API:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stocking data',
        data: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}

// Force refresh endpoint
export async function POST() {
  try {
    // Clear cache
    cache.clear(CACHE_KEY);
    
    // Fetch fresh data
    const events = await scrapeStockingData();
    
    // Cache the new data
    cache.set(CACHE_KEY, events);

    return NextResponse.json({
      success: true,
      message: 'Cache refreshed successfully',
      count: events.length,
    });

  } catch (error) {
    console.error('Error refreshing stocking data:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh stocking data',
      },
      { status: 500 }
    );
  }
}
