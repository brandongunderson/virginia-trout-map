// ArcGIS MapServer configuration for Virginia DWR TroutApp

export const ARCGIS_SERVICE_URL = 'https://services.dwr.virginia.gov/arcgis/rest/services/Projects/TroutApp/MapServer';

export const LAYER_IDS = {
  TROUT_STREAMS: 0,
  STOCKING_LOCATIONS: 1,
  STOCKING_EVENTS: 2,
  TROUT_REGULATIONS: 3,
  PUBLIC_LAKES: 4,
  WILDLIFE_MANAGEMENT_AREAS: 5,
};

export const LAYER_NAMES: Record<number, string> = {
  [LAYER_IDS.TROUT_STREAMS]: 'Trout Streams',
  [LAYER_IDS.STOCKING_LOCATIONS]: 'Stocking Locations',
  [LAYER_IDS.STOCKING_EVENTS]: 'Stocking Events',
  [LAYER_IDS.TROUT_REGULATIONS]: 'Trout Regulations',
  [LAYER_IDS.PUBLIC_LAKES]: 'Public Lakes',
  [LAYER_IDS.WILDLIFE_MANAGEMENT_AREAS]: 'Wildlife Management Areas',
};

export const LAYER_STYLES: Record<number, {
  color: string;
  weight?: number;
  radius?: number;
  fillOpacity?: number;
  opacity?: number;
}> = {
  [LAYER_IDS.TROUT_STREAMS]: {
    color: '#2563eb', // Blue for streams
    weight: 3,
    opacity: 0.8,
  },
  [LAYER_IDS.STOCKING_LOCATIONS]: {
    color: '#10b981', // Green for stocking locations
    radius: 6,
    fillOpacity: 0.7,
    opacity: 1,
  },
  [LAYER_IDS.STOCKING_EVENTS]: {
    color: '#f59e0b', // Orange for events
    radius: 5,
    fillOpacity: 0.6,
    opacity: 0.9,
  },
  [LAYER_IDS.TROUT_REGULATIONS]: {
    color: '#8b5cf6', // Purple for regulations
    weight: 2,
    fillOpacity: 0.3,
    opacity: 0.7,
  },
  [LAYER_IDS.PUBLIC_LAKES]: {
    color: '#06b6d4', // Cyan for lakes
    weight: 2,
    fillOpacity: 0.4,
    opacity: 0.8,
  },
  [LAYER_IDS.WILDLIFE_MANAGEMENT_AREAS]: {
    color: '#84cc16', // Lime green for WMAs
    weight: 2,
    fillOpacity: 0.2,
    opacity: 0.6,
  },
};

export const QUERY_PARAMS = {
  where: '1=1',
  outFields: '*',
  f: 'json',
  outSR: '4326', // WGS84 coordinate system
  returnGeometry: 'true',
};

// Base map configurations
export const BASE_MAPS = {
  STREET: {
    name: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  TOPO: {
    name: 'Topographic',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
  SATELLITE: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
};
