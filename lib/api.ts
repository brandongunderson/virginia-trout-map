// ArcGIS FeatureServer integration for Virginia DWR geospatial data

import { GeoJSONData, GeoJSONFeature, LayerType, LayerData } from './types';

// Virginia DWR ArcGIS FeatureServer URLs
const ARCGIS_BASE_URL = 'https://gis.dgif.virginia.gov/server/rest/services';

const LAYER_URLS = {
  'stocked-streams': `${ARCGIS_BASE_URL}/Virginia_Trout_Stocked_Streams/FeatureServer/0/query`,
  'stocked-lakes': `${ARCGIS_BASE_URL}/Virginia_Trout_Stocked_Lakes/FeatureServer/0/query`,
  'wild-streams': `${ARCGIS_BASE_URL}/Virginia_Trout_Wild_Streams/FeatureServer/0/query`,
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
 * Fetch all GeoJSON layers simultaneously
 */
export async function fetchAllGeoJSONData(): Promise<LayerData[]> {
  const layerTypes: LayerType[] = ['stocked-streams', 'stocked-lakes', 'wild-streams'];
  
  try {
    // Fetch all layers in parallel
    const results = await Promise.all(
      layerTypes.map(async (type) => {
        const data = await fetchLayerData(type);
        return {
          type,
          data,
          lastUpdated: new Date().toISOString(),
        };
      })
    );

    return results;
  } catch (error) {
    console.error('Error fetching GeoJSON data:', error);
    throw error;
  }
}

/**
 * Fetch a single layer's GeoJSON data
 */
export async function fetchGeoJSONData(layerType: LayerType): Promise<LayerData> {
  const data = await fetchLayerData(layerType);
  return {
    type: layerType,
    data,
    lastUpdated: new Date().toISOString(),
  };
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
    const response = await fetch(`http://localhost:3000${fileMap[layerType]}`);
    if (!response.ok) {
      throw new Error(`Failed to load local data: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      type: layerType,
      data,
      lastUpdated: new Date().toISOString(),
    };
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
