// Web scraper for Virginia DWR trout stocking schedule

import { parse } from 'node-html-parser';
import { StockingEvent } from './types';

const STOCKING_SCHEDULE_URL = 'https://dwr.virginia.gov/fishing/trout-stocking-schedule/';

/**
 * Normalize species names to handle variations
 */
function normalizeSpecies(species: string): string {
  const normalized = species.trim().toLowerCase();
  
  const speciesMap: Record<string, string> = {
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

/**
 * Parse date string to ISO format
 */
function parseDate(dateStr: string): string | null {
  try {
    // Handle various date formats
    const cleaned = dateStr.trim();
    
    // Try parsing common formats
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

/**
 * Extract numeric value from string (e.g., "500 lbs" -> 500)
 */
function extractNumber(text: string): number | undefined {
  const match = text.match(/[\d,]+/);
  if (match) {
    return parseInt(match[0].replace(/,/g, ''), 10);
  }
  return undefined;
}

/**
 * Fetch stocking data with date range search for maximum historical data
 */
async function fetchStockingDataWithDateRange(startDate: string, endDate: string): Promise<string> {
  try {
    // The form uses GET method with query parameters
    // Date format expected by DWR: "Month+DD%2C+YYYY" (e.g., "January+1%2C+2020")
    const url = new URL(STOCKING_SCHEDULE_URL);
    url.searchParams.set('start_date', startDate);
    url.searchParams.set('end_date', endDate);

    console.log(`Requesting URL: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': STOCKING_SCHEDULE_URL,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    console.error('Error fetching with date range:', error);
    throw error;
  }
}

/**
 * Convert Date to DWR URL format: "Month+DD%2C+YYYY"
 */
function formatDateForURL(date: Date): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  
  // Format: "Month+DD%2C+YYYY" (e.g., "January+1%2C+2020")
  // Note: %2C is the URL-encoded comma, but we'll let URLSearchParams handle encoding
  return `${month} ${day}, ${year}`;
}

/**
 * Scrape stocking schedule data with date range search for maximum historical data
 */
export async function scrapeStockingData(): Promise<StockingEvent[]> {
  try {
    // Try to get maximum historical data
    // Start from January 1, 2015 (10 years of history) and extend to 1 year in the future for upcoming stockings
    const currentDate = new Date();
    const startDate = new Date(2015, 0, 1); // January 1, 2015 - maximize historical data
    
    const endDate = new Date(currentDate);
    endDate.setFullYear(currentDate.getFullYear() + 1); // 1 year future for scheduled stockings
    
    const startDateStr = formatDateForURL(startDate);
    const endDateStr = formatDateForURL(endDate);

    console.log(`Fetching stocking data from ${startDateStr} to ${endDateStr}...`);

    let html: string;
    
    try {
      // Try GET request with date range first (gets maximum data)
      html = await fetchStockingDataWithDateRange(startDateStr, endDateStr);
    } catch (error) {
      console.log('Date range search failed, falling back to default page scrape:', error);
      // Fallback to simple GET request
      const response = await fetch(STOCKING_SCHEDULE_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      html = await response.text();
    }

    const root = parse(html);
    const events: StockingEvent[] = [];

    // Strategy 1: Look for table with class containing "stocking" or "schedule"
    const tables = root.querySelectorAll('table');
    
    if (tables.length === 0) {
      console.warn('No tables found on page');
      return [];
    }

    // Try each table to find stocking data
    for (const table of tables) {
      const rows = table.querySelectorAll('tr');
      
      if (rows.length === 0) continue;

      // Try to identify header row
      const headerRow = rows[0];
      const headers = headerRow.querySelectorAll('th, td');
      
      if (headers.length === 0) continue;

      // Map header indices (case-insensitive matching)
      const headerTexts = headers.map(h => h.text.trim().toLowerCase());
      
      const indices = {
        date: headerTexts.findIndex(h => h.includes('date') || h.includes('when')),
        waterBody: headerTexts.findIndex(h => h.includes('water') || h.includes('location') || h.includes('stream') || h.includes('lake') || h.includes('waterbody')),
        county: headerTexts.findIndex(h => h.includes('county')),
        species: headerTexts.findIndex(h => h.includes('species') || h.includes('fish') || h.includes('stocked')),
        category: headerTexts.findIndex(h => h.includes('category') || h.includes('cat')),
        pounds: headerTexts.findIndex(h => h.includes('pound') || h.includes('lbs') || h.includes('weight')),
        number: headerTexts.findIndex(h => h.includes('number') || h.includes('count') || h.includes('qty')),
      };

      // Skip if we can't find at least date and water body
      if (indices.date === -1 || indices.waterBody === -1) {
        continue;
      }

      console.log(`Found table with headers:`, headerTexts);
      console.log(`Column indices:`, indices);

      // Process data rows (skip header)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td');
        
        if (cells.length === 0) continue;

        try {
          const dateStr = cells[indices.date]?.text.trim();
          const waterBody = cells[indices.waterBody]?.text.trim();
          
          if (!dateStr || !waterBody) continue;

          const date = parseDate(dateStr);
          if (!date) continue;

          // Extract species - may contain multiple species separated by +, /, or commas
          const speciesText = indices.species !== -1 ? cells[indices.species]?.text.trim() : 'Unknown';
          
          // Parse multiple species if separated
          const speciesList = speciesText
            .split(/[+\/,]/)
            .map(s => normalizeSpecies(s))
            .filter(s => s && s !== 'Unknown')
            .join(' + ');

          const event: StockingEvent = {
            id: `${waterBody}-${date}-${i}`.replace(/\s+/g, '-').toLowerCase(),
            waterBody,
            county: indices.county !== -1 ? cells[indices.county]?.text.trim() : 'Unknown',
            species: speciesList || 'Unknown',
            date,
          };

          // Add optional fields
          if (indices.pounds !== -1 && cells[indices.pounds]) {
            event.pounds = extractNumber(cells[indices.pounds].text);
          }
          if (indices.number !== -1 && cells[indices.number]) {
            event.numberOfFish = extractNumber(cells[indices.number].text);
          }
          if (indices.category !== -1 && cells[indices.category]) {
            event.category = cells[indices.category].text.trim();
          }

          events.push(event);
        } catch (error) {
          console.error('Error parsing row:', error);
          continue;
        }
      }

      // If we found events, break (we found the right table)
      if (events.length > 0) {
        break;
      }
    }

    console.log(`Successfully scraped ${events.length} stocking events`);
    return events;

  } catch (error) {
    console.error('Error scraping stocking data:', error);
    throw new Error(`Failed to scrape stocking data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Filter stocking events by date range
 */
export function filterEventsByDateRange(
  events: StockingEvent[],
  startDate?: string,
  endDate?: string
): StockingEvent[] {
  return events.filter(event => {
    if (startDate && event.date < startDate) return false;
    if (endDate && event.date > endDate) return false;
    return true;
  });
}

/**
 * Group events by water body
 */
export function groupEventsByWaterBody(events: StockingEvent[]): Record<string, StockingEvent[]> {
  return events.reduce((acc, event) => {
    if (!acc[event.waterBody]) {
      acc[event.waterBody] = [];
    }
    acc[event.waterBody].push(event);
    return acc;
  }, {} as Record<string, StockingEvent[]>);
}
