// API endpoint for trout stocking schedule data from Supabase database

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../lib/supabase';
import { StockingEvent } from '../../../lib/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const county = searchParams.get('county');
    const species = searchParams.get('species');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5000');
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('trout_stocking_events')
      .select('*', { count: 'exact' })
      .order('stocking_date', { ascending: false });

    // Apply filters
    if (startDate) {
      query = query.gte('stocking_date', startDate);
    }
    if (endDate) {
      query = query.lte('stocking_date', endDate);
    }
    if (county && county !== 'all') {
      query = query.eq('county', county);
    }
    if (species && species !== 'all') {
      query = query.ilike('species', `%${species}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    // Transform database records to StockingEvent format
    const events = (data || []).map((record: {
      id: number;
      stocking_date: string;
      location: string;
      county: string;
      species: string;
      number_of_fish: number | null;
      size: string | null;
    }): StockingEvent => ({
      id: record.id.toString(),
      waterBody: record.location,
      county: record.county,
      species: record.species,
      date: new Date(record.stocking_date).toISOString(),
      numberOfFish: record.number_of_fish ?? undefined,
      category: record.size ?? undefined,
    }));

    // Get last sync time (most recent updated_at)
    const { data: syncData } = await supabase
      .from('trout_stocking_events')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle() as { data: { updated_at: string } | null };

    return NextResponse.json({
      success: true,
      data: events,
      count: events.length,
      totalCount: count || 0,
      page,
      limit,
      lastUpdated: syncData?.updated_at || null,
      source: 'database',
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

// Trigger sync endpoint - calls the edge function to sync latest data
export async function POST() {
  try {
    // Get URL and key from environment with fallbacks
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wbiuuvzkjkbfrwpirxwg.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiaXV1dnpramtiZnJ3cGlyeHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NTcwMTUsImV4cCI6MjA3ODIzMzAxNX0.Rh0_xQBpscXtxQnZAN0--VAM0bIPlG87YDYeQ4PRD-c';

    // Call the sync edge function
    const response = await fetch(`${supabaseUrl}/functions/v1/sync-stocking-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Sync failed');
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Data sync triggered successfully',
      result: result.data,
    });

  } catch (error) {
    console.error('Error triggering sync:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trigger sync',
      },
      { status: 500 }
    );
  }
}
