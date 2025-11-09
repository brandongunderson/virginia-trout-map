// Client-side ArcGIS data fetching functions

import { LAYER_IDS } from './arcgis-config';

export interface TroutStream {
  id: string;
  name: string;
  county: string;
  species: string[];
  waterType: string;
  regulation: string;
  geometry: {
    type: 'LineString' | 'MultiLineString';
    coordinates: number[][] | number[][][];
  };
  properties: Record<string, unknown>;
}

export interface StockingLocation {
  id: string;
  name: string;
  county: string;
  species: string;
  stockingDate: string;
  waterBody: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: Record<string, unknown>;
}

export interface PublicLake {
  id: string;
  name: string;
  county: string;
  acres: number;
  species: string[];
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  properties: Record<string, unknown>;
}

interface ArcGISResponse {
  success: boolean;
  data?: {
    features: Array<{
      attributes: Record<string, unknown>;
      geometry: unknown;
    }>;
  };
  error?: string;
}

async function fetchArcGISLayer(layerId: number, where: string = '1=1'): Promise<ArcGISResponse> {
  // Use server-side API route as proxy to avoid CORS issues
  const params = new URLSearchParams({
    layer: layerId.toString(),
    where,
    outFields: '*',
  });
  
  const response = await fetch(`/api/arcgis?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch ArcGIS data');
  }
  
  return result;
}

// Convert ESRI geometry to GeoJSON format
function convertESRIGeometryToGeoJSON(
  esriGeometry: { x?: number; y?: number; paths?: number[][][]; rings?: number[][][] },
  geometryType: string
): { type: string; coordinates: number[] | number[][] | number[][][] | number[][][][] } {
  if (geometryType === 'esriGeometryPoint' && esriGeometry.x !== undefined && esriGeometry.y !== undefined) {
    return {
      type: 'Point',
      coordinates: [esriGeometry.x, esriGeometry.y],
    };
  } else if (geometryType === 'esriGeometryPolyline' && esriGeometry.paths) {
    return {
      type: esriGeometry.paths.length === 1 ? 'LineString' : 'MultiLineString',
      coordinates: esriGeometry.paths.length === 1 ? esriGeometry.paths[0] : esriGeometry.paths,
    };
  } else if (geometryType === 'esriGeometryPolygon' && esriGeometry.rings) {
    return {
      type: esriGeometry.rings.length === 1 ? 'Polygon' : 'MultiPolygon',
      coordinates: esriGeometry.rings.length === 1 ? [esriGeometry.rings[0]] : esriGeometry.rings,
    };
  }
  // Default fallback for unknown geometry types
  return {
    type: 'Point',
    coordinates: [0, 0],
  };
}

export async function fetchTroutStreamsClient(countyFilter?: string): Promise<TroutStream[]> {
  const where = countyFilter ? `COUNTY = '${countyFilter}'` : '1=1';
  const result = await fetchArcGISLayer(LAYER_IDS.TROUT_STREAMS, where);
  
  if (!result.data?.features) {
    return [];
  }
  
  return result.data.features.map((feature: { attributes: Record<string, unknown>; geometry: unknown }) => {
    const attrs = feature.attributes;
    return {
      id: String(attrs.OBJECTID || attrs.FID || attrs.ID || 'unknown'),
      name: String(attrs.NAME || attrs.WATER_NAME || attrs.STREAM_NAME || 'Unnamed Stream'),
      county: String(attrs.COUNTY || attrs.COUNTY_NAME || 'Unknown'),
      species: String(attrs.SPECIES || attrs.TROUT_SPECIES || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      waterType: String(attrs.WATER_TYPE || attrs.TYPE || 'Stream'),
      regulation: String(attrs.REGULATION || attrs.REG_TYPE || 'General'),
      geometry: convertESRIGeometryToGeoJSON(feature.geometry as { x?: number; y?: number; paths?: number[][][]; rings?: number[][][] }, 'esriGeometryPolyline') as { type: 'LineString' | 'MultiLineString'; coordinates: number[][] | number[][][]; },
      properties: attrs,
    };
  });
}

export async function fetchStockingLocationsClient(countyFilter?: string): Promise<StockingLocation[]> {
  const where = countyFilter ? `COUNTY = '${countyFilter}'` : '1=1';
  const result = await fetchArcGISLayer(LAYER_IDS.STOCKING_LOCATIONS, where);
  
  if (!result.data?.features) {
    return [];
  }
  
  return result.data.features.map((feature: { attributes: Record<string, unknown>; geometry: unknown }) => {
    const attrs = feature.attributes;
    return {
      id: String(attrs.OBJECTID || attrs.FID || attrs.ID || 'unknown'),
      name: String(attrs.NAME || attrs.LOCATION || attrs.LOCATION_NAME || 'Unnamed Location'),
      county: String(attrs.COUNTY || attrs.COUNTY_NAME || 'Unknown'),
      species: String(attrs.SPECIES || attrs.TROUT_SPECIES || 'Unknown'),
      stockingDate: String(attrs.STOCKING_DATE || attrs.STOCK_DATE || ''),
      waterBody: String(attrs.WATER_BODY || attrs.WATER_NAME || attrs.NAME || ''),
      geometry: convertESRIGeometryToGeoJSON(feature.geometry as { x?: number; y?: number; paths?: number[][][]; rings?: number[][][] }, 'esriGeometryPoint') as { type: 'Point'; coordinates: [number, number]; },
      properties: attrs,
    };
  });
}

export async function fetchPublicLakesClient(countyFilter?: string): Promise<PublicLake[]> {
  const where = countyFilter ? `COUNTY = '${countyFilter}'` : '1=1';
  const result = await fetchArcGISLayer(LAYER_IDS.PUBLIC_LAKES, where);
  
  if (!result.data?.features) {
    return [];
  }
  
  return result.data.features.map((feature: { attributes: Record<string, unknown>; geometry: unknown }) => {
    const attrs = feature.attributes;
    return {
      id: String(attrs.OBJECTID || attrs.FID || attrs.ID || 'unknown'),
      name: String(attrs.NAME || attrs.LAKE_NAME || attrs.WATER_NAME || 'Unnamed Lake'),
      county: String(attrs.COUNTY || attrs.COUNTY_NAME || 'Unknown'),
      acres: parseFloat(String(attrs.ACRES || attrs.AREA_ACRES || 0)),
      species: String(attrs.SPECIES || attrs.FISH_SPECIES || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      geometry: convertESRIGeometryToGeoJSON(feature.geometry as { x?: number; y?: number; paths?: number[][][]; rings?: number[][][] }, 'esriGeometryPolygon') as { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][]; },
      properties: attrs,
    };
  });
}

// Fetch all layers for initial map load
export async function fetchAllArcGISLayers() {
  try {
    const [streams, locations, lakes] = await Promise.all([
      fetchTroutStreamsClient(),
      fetchStockingLocationsClient(),
      fetchPublicLakesClient(),
    ]);

    return {
      streams,
      locations,
      lakes,
    };
  } catch (error) {
    console.error('Error fetching ArcGIS layers:', error);
    throw error;
  }
}
