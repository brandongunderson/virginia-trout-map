// API endpoint for GeoJSON layer data with caching

import { NextRequest, NextResponse } from 'next/server';
import { fetchAllGeoJSONData, fetchGeoJSONData } from '../../../lib/api';
import { cache } from '../../../lib/cache';
import { LayerType, LayerData } from '../../../lib/types';

const CACHE_KEY_PREFIX = 'geojson-';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const layerParam = searchParams.get('layer') as LayerType | null;
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Fetch single layer or all layers
    if (layerParam) {
      const cacheKey = `${CACHE_KEY_PREFIX}${layerParam}`;
      
      // Check cache first
      let layerData: LayerData | null = null;
      
      if (!forceRefresh) {
        layerData = cache.get<LayerData>(cacheKey);
      }

      // If not cached, fetch fresh data
      if (!layerData) {
        console.log(`Fetching fresh GeoJSON data for ${layerParam}...`);
        layerData = await fetchGeoJSONData(layerParam);
        cache.set(cacheKey, layerData);
      }

      const cacheStatus = cache.getStatus(cacheKey);

      return NextResponse.json({
        success: true,
        data: layerData,
        cache: cacheStatus,
      });

    } else {
      // Fetch all layers
      const cacheKey = `${CACHE_KEY_PREFIX}all`;
      
      let allLayers: LayerData[] | null = null;
      
      if (!forceRefresh) {
        allLayers = cache.get<LayerData[]>(cacheKey);
      }

      if (!allLayers) {
        console.log('Fetching fresh GeoJSON data for all layers...');
        allLayers = await fetchAllGeoJSONData();
        cache.set(cacheKey, allLayers);
      }

      const cacheStatus = cache.getStatus(cacheKey);

      return NextResponse.json({
        success: true,
        data: allLayers,
        cache: cacheStatus,
      });
    }

  } catch (error) {
    console.error('Error in geojson API:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch GeoJSON data',
      },
      { status: 500 }
    );
  }
}

// Force refresh endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const layer = body.layer as LayerType | undefined;

    if (layer) {
      // Clear specific layer cache
      const cacheKey = `${CACHE_KEY_PREFIX}${layer}`;
      cache.clear(cacheKey);
      
      // Fetch fresh data
      const layerData = await fetchGeoJSONData(layer);
      cache.set(cacheKey, layerData);

      return NextResponse.json({
        success: true,
        message: `Cache refreshed for ${layer}`,
      });
    } else {
      // Clear all layer caches
      cache.clear(`${CACHE_KEY_PREFIX}all`);
      cache.clear(`${CACHE_KEY_PREFIX}stocked-streams`);
      cache.clear(`${CACHE_KEY_PREFIX}stocked-lakes`);
      cache.clear(`${CACHE_KEY_PREFIX}wild-streams`);
      
      // Fetch fresh data
      const allLayers = await fetchAllGeoJSONData();
      cache.set(`${CACHE_KEY_PREFIX}all`, allLayers);

      return NextResponse.json({
        success: true,
        message: 'Cache refreshed for all layers',
      });
    }

  } catch (error) {
    console.error('Error refreshing GeoJSON data:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh GeoJSON data',
      },
      { status: 500 }
    );
  }
}
