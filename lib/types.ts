// Core data types for the Virginia Trout Stocking Map application

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon' | 'MultiLineString' | 'MultiPolygon';
    coordinates: number[] | number[][] | number[][][];
  };
  properties: {
    name: string;
    county?: string;
    type?: string;
    species?: string;
    description?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

export interface GeoJSONData {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface StockingEvent {
  id: string;
  waterBody: string;
  county: string;
  species: string;
  date: string; // ISO format
  pounds?: number;
  numberOfFish?: number;
  waterType?: 'stream' | 'lake';
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheStatus {
  isCached: boolean;
  lastUpdated?: string;
  expiresAt?: string;
  age?: number; // in milliseconds
}

export type LayerType = 'stocked-streams' | 'stocked-lakes' | 'wild-streams';

export interface LayerData {
  type: LayerType;
  data: GeoJSONData;
  lastUpdated: string;
}
