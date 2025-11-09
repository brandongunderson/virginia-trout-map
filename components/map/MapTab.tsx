'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useStore } from '@/lib/store';
import { ARCGIS_SERVICE_URL, LAYER_IDS, LAYER_NAMES, LAYER_STYLES, BASE_MAPS } from '@/lib/arcgis-config';
import { fetchAllArcGISLayers, TroutStream, StockingLocation, PublicLake } from '@/lib/arcgis-client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Extend Window interface for ESRI-Leaflet
declare global {
  interface Window {
    L?: typeof L & {
      esri?: {
        dynamicMapLayer: (options: {
          url: string;
          layers?: number[];
          opacity?: number;
        }) => L.Layer;
      };
    };
  }
}

type BaseMapType = 'STREET' | 'TOPO' | 'SATELLITE';

// Component to handle ESRI-Leaflet dynamic layers
function ESRILayers({ activeLayers }: { activeLayers: Set<number> }) {
  const map = useMap();
  const [esriLoaded, setEsriLoaded] = useState(false);
  const layerRef = useRef<L.Layer | null>(null);

  // Load ESRI-Leaflet script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already loaded
    if (window.L?.esri) {
      setEsriLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/esri-leaflet@3.0.10/dist/esri-leaflet.js';
    script.async = true;
    script.onload = () => {
      console.log('ESRI-Leaflet loaded successfully');
      setEsriLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load ESRI-Leaflet');
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Create dynamic map layer when ESRI is loaded
  useEffect(() => {
    if (!esriLoaded || !window.L?.esri || !map) return;

    // Remove existing layer if it exists
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    // Create dynamic layer with active layers
    const activeLayerArray = Array.from(activeLayers);
    
    if (activeLayerArray.length > 0) {
      try {
        layerRef.current = window.L.esri.dynamicMapLayer({
          url: ARCGIS_SERVICE_URL,
          layers: activeLayerArray,
          opacity: 0.8,
        });
        
        layerRef.current.addTo(map);
        console.log('ESRI dynamic layers added:', activeLayerArray);
      } catch (error) {
        console.error('Error creating ESRI dynamic layer:', error);
      }
    }

    return () => {
      if (layerRef.current && map) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [esriLoaded, activeLayers, map]);

  return null;
}

export default function MapTab() {
  const { setError, isLoadingLayers, setIsLoadingLayers } = useStore();
  const [mounted, setMounted] = useState(false);
  const [activeArcGISLayers, setActiveArcGISLayers] = useState<Set<number>>(
    new Set([LAYER_IDS.TROUT_STREAMS, LAYER_IDS.STOCKING_LOCATIONS, LAYER_IDS.PUBLIC_LAKES])
  );
  const [baseMap, setBaseMap] = useState<BaseMapType>('STREET');
  const [dataLayers, setDataLayers] = useState<{
    streams: TroutStream[];
    locations: StockingLocation[];
    lakes: PublicLake[];
  } | null>(null);
  const [showLegend, setShowLegend] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load ArcGIS layers data (for popups and filtering)
  useEffect(() => {
    async function loadArcGISData() {
      setIsLoadingLayers(true);
      setError(null);

      try {
        const data = await fetchAllArcGISLayers();
        setDataLayers(data);
        console.log('ArcGIS data loaded:', {
          streams: data.streams.length,
          locations: data.locations.length,
          lakes: data.lakes.length,
        });
      } catch (error) {
        console.error('Error loading ArcGIS data:', error);
        setError('Failed to load map data from Virginia DWR');
      } finally {
        setIsLoadingLayers(false);
      }
    }

    loadArcGISData();
  }, [setIsLoadingLayers, setError]);

  const toggleArcGISLayer = (layerId: number) => {
    setActiveArcGISLayers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(layerId)) {
        newSet.delete(layerId);
      } else {
        newSet.add(layerId);
      }
      return newSet;
    });
  };

  const getLayerColor = (layerId: number): string => {
    return LAYER_STYLES[layerId]?.color || '#6b7280';
  };

  if (!mounted) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-gray-50">
        <p>Loading map...</p>
      </div>
    );
  }

  if (isLoadingLayers) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Virginia DWR TroutApp layers...</p>
          <p className="text-sm text-gray-500 mt-2">Connecting to ArcGIS MapServer</p>
        </div>
      </div>
    );
  }

  const currentBaseMap = BASE_MAPS[baseMap];

  return (
    <div className="relative">
      {/* Layer Controls */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-4 space-y-3 max-w-xs">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Map Layers</h3>
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {showLegend ? 'Hide Legend' : 'Show Legend'}
          </button>
        </div>
        
        {/* ArcGIS MapServer Layers */}
        <div className="space-y-2">
          {Object.entries(LAYER_IDS).slice(0, 6).map(([, layerId]) => (
            <label key={layerId} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={activeArcGISLayers.has(layerId)}
                onChange={() => toggleArcGISLayer(layerId)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="flex-1">{LAYER_NAMES[layerId]}</span>
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getLayerColor(layerId) }}
              />
            </label>
          ))}
        </div>

        {/* Base Map Selector */}
        <div className="pt-3 border-t border-gray-200">
          <h4 className="font-medium text-xs text-gray-600 mb-2">Base Map</h4>
          <div className="flex gap-1">
            {(Object.keys(BASE_MAPS) as BaseMapType[]).map((mapType) => (
              <button
                key={mapType}
                onClick={() => setBaseMap(mapType)}
                className={`flex-1 px-2 py-1 text-xs rounded ${
                  baseMap === mapType
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {BASE_MAPS[mapType].name}
              </button>
            ))}
          </div>
        </div>

        {/* Data Summary */}
        {dataLayers && (
          <div className="pt-3 border-t border-gray-200 text-xs text-gray-600">
            <div>Streams: {dataLayers.streams.length}</div>
            <div>Locations: {dataLayers.locations.length}</div>
            <div>Lakes: {dataLayers.lakes.length}</div>
          </div>
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3 text-xs">
          <h4 className="font-semibold mb-2">Legend</h4>
          <div className="space-y-1">
            {Array.from(activeArcGISLayers).map((layerId) => (
              <div key={layerId} className="flex items-center gap-2">
                <div
                  className="w-4 h-1 rounded"
                  style={{ backgroundColor: getLayerColor(layerId) }}
                />
                <span className="text-gray-700">{LAYER_NAMES[layerId]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map Container */}
      <MapContainer
        center={[37.5, -79.5]}
        zoom={7}
        style={{ height: '600px', width: '100%' }}
        className="z-0"
      >
        {/* Base Map Tile Layer */}
        <TileLayer
          key={baseMap}
          attribution={currentBaseMap.attribution}
          url={currentBaseMap.url}
          maxZoom={18}
        />

        {/* ESRI-Leaflet Dynamic Layers */}
        <ESRILayers activeLayers={activeArcGISLayers} />
      </MapContainer>

      {/* Info Panel */}
      <div className="absolute top-4 left-4 z-[1000] bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs max-w-xs">
        <h4 className="font-semibold text-blue-900 mb-1">Virginia DWR TroutApp</h4>
        <p className="text-blue-800">
          Interactive map showing trout streams, stocking locations, public lakes, and fishing regulations across Virginia.
        </p>
        <p className="text-blue-700 mt-2 text-[10px]">
          Data source: Virginia Department of Wildlife Resources ArcGIS MapServer
        </p>
      </div>
    </div>
  );
}
