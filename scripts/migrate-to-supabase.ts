// Migration script to populate Supabase database with historical stocking data
// Run this ONCE to migrate all historical data from web scraping to database

import { createClient } from '@supabase/supabase-js';
import { scrapeStockingData } from '../lib/scraper';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function migrateData() {
  console.log('Starting migration of historical stocking data...\n');
  
  try {
    // Step 1: Scrape all historical data
    console.log('Step 1: Scraping historical data from Virginia DWR website...');
    const events = await scrapeStockingData();
    console.log(`Successfully scraped ${events.length} stocking events\n`);
    
    if (events.length === 0) {
      console.warn('Warning: No events were scraped. Please check the scraper.');
      return;
    }

    // Step 2: Transform data to match database schema
    console.log('Step 2: Transforming data for database insertion...');
    const dbRecords = events.map(event => ({
      stocking_date: new Date(event.date).toISOString().split('T')[0], // Convert to DATE format
      location: event.waterBody,
      county: event.county,
      species: event.species,
      size: event.category || null,
      number_of_fish: event.numberOfFish || null,
    }));

    // Step 3: Insert data in batches (500 at a time for performance)
    console.log('Step 3: Inserting data into Supabase database...');
    const batchSize = 500;
    let totalInserted = 0;
    let totalDuplicates = 0;
    
    for (let i = 0; i < dbRecords.length; i += batchSize) {
      const batch = dbRecords.slice(i, i + batchSize);
      
      // Use upsert to handle duplicates gracefully
      const { data, error } = await supabase
        .from('trout_stocking_events')
        .upsert(batch, { 
          onConflict: 'stocking_date,location,species',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
        throw error;
      }

      const inserted = data?.length || 0;
      totalInserted += inserted;
      totalDuplicates += batch.length - inserted;
      
      console.log(`Batch ${Math.floor(i / batchSize) + 1}: Inserted ${inserted} records, Duplicates: ${batch.length - inserted}`);
    }

    // Step 4: Verify the migration
    console.log('\nStep 4: Verifying migration...');
    const { count, error: countError } = await supabase
      .from('trout_stocking_events')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting records:', countError);
    } else {
      console.log(`Total records in database: ${count}`);
    }

    // Step 5: Show summary
    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Events scraped:        ${events.length}`);
    console.log(`Records inserted:      ${totalInserted}`);
    console.log(`Duplicates skipped:    ${totalDuplicates}`);
    console.log(`Total in database:     ${count}`);
    console.log('='.repeat(60));
    console.log('\nMigration completed successfully!');
    console.log('The database is now ready for use.\n');

  } catch (error) {
    console.error('\nMigration failed:', error);
    throw error;
  }
}

// Run migration
migrateData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
