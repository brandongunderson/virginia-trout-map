// ArcGIS FeatureServer integration for Virginia DWR geospatial data

import { GeoJSONData, GeoJSONFeature, LayerType, LayerData } from './types';

// Virginia DWR ArcGIS FeatureServer URLs
const ARCGIS_BASE_URL = 'https://gis.dgif.virginia.gov/fos/rest/services/VMDB/Public_VMDB/FeatureServer';

const LAYER_URLS = {
  'stocked-streams': `${ARCGIS_BASE_URL}/0/query`,
  'stocked-lakes': `${ARCGIS_BASE_URL}/1/query`,
  'wild-streams': `${ARCGIS_BASE_URL}/2/query`,
};

/**
 * Normalize field names from ArcGIS response
 * Field names may vary in casing (Name, NAME, name)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeProperties(properties: any): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalized: any = {};
  
  // Common field mappings with fallbacks
  const fieldMappings = [
    { target: 'name', sources: ['Name', 'NAME', 'name', 'WATER_NAME', 'WaterName'] },
    { target: 'county', sources: ['County', 'COUNTY', 'county', 'COUNTY_NAME'] },
    { target: 'type', sources: ['Type', 'TYPE', 'type', 'WATER_TYPE', 'WaterType'] },
    { target: 'species', sources: ['Species', 'SPECIES', 'species', 'TROUT_SPECIES'] },
    { target: 'description', sources: ['Description', 'DESCRIPTION', 'description', 'DESC'] },
  ];

  // Apply field mappings
  fieldMappings.forEach(({ target, sources }) => {
    for (const source of sources) {
      if (properties[source] !== undefined && properties[source] !== null) {
        normalized[target] = properties[source];
        break;
      }
    }
  });

  // Keep all original properties as well
  Object.assign(normalized, properties);

  return normalized;
}

/**
 * Fetch GeoJSON data from a single layer
 */
async function fetchLayerData(layerType: LayerType): Promise<GeoJSONData> {
  const url = LAYER_URLS[layerType];
  
  // ArcGIS query parameters for GeoJSON output
  const params = new URLSearchParams({
    where: '1=1', // Get all features
    outFields: '*', // Get all fields
    f: 'geojson', // Request GeoJSON format
    returnGeometry: 'true',
  });

  try {
    const response = await fetch(`${url}?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Normalize feature properties
    if (data.features && Array.isArray(data.features)) {
      data.features = data.features.map((feature: GeoJSONFeature) => ({
        ...feature,
        properties: normalizeProperties(feature.properties),
      }));
    }

    return data as GeoJSONData;
  } catch (error) {
    console.error(`Error fetching ${layerType} data:`, error);
    throw new Error(`Failed to fetch ${layerType} data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetch all GeoJSON layers simultaneously with individual error handling
 */
export async function fetchAllGeoJSONData(): Promise<LayerData[]> {
  const layerTypes: LayerType[] = ['stocked-streams', 'stocked-lakes', 'wild-streams'];
  
  // Fetch all layers in parallel with individual error handling
  const results = await Promise.all(
    layerTypes.map(async (type) => {
      try {
        const data = await fetchLayerData(type);
        console.log(`✓ Successfully fetched ${type} from external API`);
        return {
          type,
          data,
          lastUpdated: new Date().toISOString(),
        };
      } catch {
        console.log(`✗ External API failed for ${type}, falling back to local data`);
        // Fallback to local data for this specific layer
        try {
          return await fetchLocalGeoJSONData(type);
        } catch (localError) {
          console.error(`✗ Failed to load local data for ${type}:`, localError);
          throw new Error(`Failed to load ${type}: external API and local fallback both failed`);
        }
      }
    })
  );

  return results;
}

/**
 * Fetch a single layer's GeoJSON data with fallback
 */
export async function fetchGeoJSONData(layerType: LayerType): Promise<LayerData> {
  try {
    const data = await fetchLayerData(layerType);
    console.log(`✓ Successfully fetched ${layerType} from external API`);
    return {
      type: layerType,
      data,
      lastUpdated: new Date().toISOString(),
    };
  } catch {
    console.log(`✗ External API failed for ${layerType}, falling back to local data`);
    // Fallback to local data
    try {
      return await fetchLocalGeoJSONData(layerType);
    } catch (localError) {
      console.error(`✗ Failed to load local data for ${layerType}:`, localError);
      throw new Error(`Failed to load ${layerType}: external API and local fallback both failed`);
    }
  }
}

/**
 * Fetch local GeoJSON data (fallback when external API fails)
 */
export async function fetchLocalGeoJSONData(layerType: LayerType): Promise<LayerData> {
  const fileMap: Record<LayerType, string> = {
    'stocked-streams': '/data/stocked-streams.json',
    'stocked-lakes': '/data/stocked-lakes.json',
    'wild-streams': '/data/wild-streams.json',
  };

  try {
    // Use dynamic import for Node.js environment (server-side)
    if (typeof window === 'undefined') {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const filePath = path.join(process.cwd(), 'public', fileMap[layerType]);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      
      return {
        type: layerType,
        data,
        lastUpdated: new Date().toISOString(),
      };
    } else {
      // Client-side: use relative URL
      const response = await fetch(fileMap[layerType]);
      if (!response.ok) {
        throw new Error(`Failed to load local data: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        type: layerType,
        data,
        lastUpdated: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error(`Error loading local ${layerType} data:`, error);
    throw error;
  }
}

/**
 * Fetch all local GeoJSON layers
 */
export async function fetchAllLocalGeoJSONData(): Promise<LayerData[]> {
  const layerTypes: LayerType[] = ['stocked-streams', 'stocked-lakes', 'wild-streams'];
  
  const results = await Promise.all(
    layerTypes.map(async (type) => {
      return fetchLocalGeoJSONData(type);
    })
  );

  return results;
}
