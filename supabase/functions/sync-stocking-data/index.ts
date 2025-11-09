// Supabase Edge Function: Sync latest trout stocking data
// This function fetches latest stocking data and syncs it to the database
// Designed to be called by cron job daily at 6 AM EST

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    console.log('Starting trout stocking data sync...');

    // Fetch latest data from Virginia DWR website (last 60 days to catch updates)
    const currentDate = new Date();
    const startDate = new Date(currentDate);
    startDate.setDate(currentDate.getDate() - 60); // 60 days back
    const endDate = new Date(currentDate);
    endDate.setFullYear(currentDate.getFullYear() + 1); // 1 year future

    const startDateStr = formatDateForURL(startDate);
    const endDateStr = formatDateForURL(endDate);

    console.log(`Fetching data from ${startDateStr} to ${endDateStr}`);

    // Scrape the Virginia DWR website
    const events = await scrapeStockingData(startDateStr, endDateStr);
    console.log(`Scraped ${events.length} events`);

    if (events.length === 0) {
      console.warn('No events scraped - this may indicate a problem with the scraper');
    }

    // Transform data for database insertion
    const dbRecords = events.map(event => ({
      stocking_date: event.date.split('T')[0], // Convert to DATE format
      location: event.waterBody,
      county: event.county,
      species: event.species,
      size: event.category || null,
      number_of_fish: event.numberOfFish || null,
    }));

    // Insert/update records in database - skip duplicates
    let newRecords = 0;
    let duplicates = 0;
    const batchSize = 100;

    for (let i = 0; i < dbRecords.length; i += batchSize) {
      const batch = dbRecords.slice(i, i + batchSize);

      // Insert each record individually to handle duplicates gracefully
      for (const record of batch) {
        const response = await fetch(`${supabaseUrl}/rest/v1/trout_stocking_events`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(record)
        });

        if (!response.ok) {
          const errorText = await response.text();
          
          // Check if it's a duplicate key error
          if (errorText.includes('23505') || errorText.includes('duplicate key')) {
            duplicates++;
            continue; // Skip duplicates silently
          }
          
          // For other errors, log but continue
          console.error(`Database insert failed: ${errorText}`);
          continue;
        }

        newRecords++;
      }
    }

    // Get total record count
    const countResponse = await fetch(
      `${supabaseUrl}/rest/v1/trout_stocking_events?select=count`,
      {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Prefer': 'count=exact'
        }
      }
    );

    const totalRecords = parseInt(countResponse.headers.get('content-range')?.split('/')[1] || '0');

    const result = {
      success: true,
      scrapedEvents: events.length,
      newRecords: newRecords,
      duplicates: duplicates,
      totalRecords: totalRecords,
      lastSync: new Date().toISOString(),
    };

    console.log('Sync completed:', result);

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Sync error:', error);

    return new Response(JSON.stringify({
      error: {
        code: 'SYNC_FAILED',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Helper functions (copied from scraper.ts logic)

function formatDateForURL(date) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  return `${month} ${day}, ${year}`;
}

function normalizeSpecies(species) {
  const normalized = species.trim().toLowerCase();

  const speciesMap = {
    'rainbow': 'Rainbow Trout',
    'rainbow trout': 'Rainbow Trout',
    'brown': 'Brown Trout',
    'brown trout': 'Brown Trout',
    'brook': 'Brook Trout',
    'brook trout': 'Brook Trout',
    'golden': 'Golden Trout',
    'golden trout': 'Golden Trout',
    'tiger': 'Tiger Trout',
    'tiger trout': 'Tiger Trout',
  };

  return speciesMap[normalized] || species;
}

function parseDate(dateStr) {
  try {
    const cleaned = dateStr.trim();
    const date = new Date(cleaned);

    if (isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString();
  } catch (error) {
    console.error('Error parsing date:', dateStr, error);
    return null;
  }
}

function extractNumber(text) {
  const match = text.match(/[\d,]+/);
  if (match) {
    return parseInt(match[0].replace(/,/g, ''), 10);
  }
  return undefined;
}

async function scrapeStockingData(startDateStr, endDateStr) {
  const STOCKING_SCHEDULE_URL = 'https://dwr.virginia.gov/fishing/trout-stocking-schedule/';

  try {
    const url = new URL(STOCKING_SCHEDULE_URL);
    url.searchParams.set('start_date', startDateStr);
    url.searchParams.set('end_date', endDateStr);

    console.log(`Requesting URL: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // Parse HTML manually (no DOMParser in Deno)
    const events = [];

    // Extract table rows using regex
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const tables = html.match(tableRegex) || [];

    for (const tableHtml of tables) {
      // Extract header row
      const headerMatch = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/i);
      if (!headerMatch) continue;

      const headerHtml = headerMatch[1];
      const headerCells = headerHtml.match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi) || [];
      const headers = headerCells.map(cell =>
        cell.replace(/<[^>]*>/g, '').trim().toLowerCase()
      );

      // Find column indices
      const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('when'));
      const locationIdx = headers.findIndex(h =>
        h.includes('water') || h.includes('location') || h.includes('stream') || h.includes('lake')
      );
      const countyIdx = headers.findIndex(h => h.includes('county'));
      const speciesIdx = headers.findIndex(h =>
        h.includes('species') || h.includes('fish') || h.includes('stocked')
      );
      const categoryIdx = headers.findIndex(h => h.includes('category') || h.includes('cat'));
      const numberIdx = headers.findIndex(h =>
        h.includes('number') || h.includes('count') || h.includes('qty')
      );

      if (dateIdx === -1 || locationIdx === -1) continue;

      // Extract data rows
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      const rows = tableHtml.match(rowRegex) || [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];

        if (cells.length === 0) continue;

        const cellValues = cells.map(cell =>
          cell.replace(/<[^>]*>/g, '').trim()
        );

        const dateStr = cellValues[dateIdx];
        const waterBody = cellValues[locationIdx];

        if (!dateStr || !waterBody) continue;

        const date = parseDate(dateStr);
        if (!date) continue;

        const speciesText = speciesIdx !== -1 ? cellValues[speciesIdx] : 'Unknown';
        const speciesList = speciesText
          .split(/[+\/,]/)
          .map(s => normalizeSpecies(s))
          .filter(s => s && s !== 'Unknown')
          .join(' + ');

        const event = {
          id: `${waterBody}-${date}-${i}`.replace(/\s+/g, '-').toLowerCase(),
          waterBody,
          county: countyIdx !== -1 ? cellValues[countyIdx] : 'Unknown',
          species: speciesList || 'Unknown',
          date,
          numberOfFish: numberIdx !== -1 ? extractNumber(cellValues[numberIdx]) : undefined,
          category: categoryIdx !== -1 ? cellValues[categoryIdx] : undefined,
        };

        events.push(event);
      }

      if (events.length > 0) break;
    }

    console.log(`Successfully scraped ${events.length} events`);
    return events;

  } catch (error) {
    console.error('Error scraping:', error);
    throw error;
  }
}
