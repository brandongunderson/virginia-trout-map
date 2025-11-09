'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { useStore } from '@/lib/store';
import { LayerData } from '@/lib/types';
import 'leaflet/dist/leaflet.css';

export default function MapTab() {
  const { layers, setLayers, activeLayerTypes, toggleLayer, setError, isLoadingLayers, setIsLoadingLayers } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadLayers() {
      setIsLoadingLayers(true);
      setError(null);

      try {
        const response = await fetch('/api/geojson');
        const result = await response.json();

        if (result.success) {
          setLayers(result.data);
        } else {
          setError(result.error || 'Failed to load map data');
        }
      } catch (error) {
        console.error('Error loading layers:', error);
        setError('Failed to load map data');
      } finally {
        setIsLoadingLayers(false);
      }
    }

    if (layers.length === 0) {
      loadLayers();
    }
  }, [layers.length, setIsLoadingLayers, setError, setLayers]);

  // Layer styles
  const getLayerStyle = (layerType: string) => {
    const styles: Record<string, { color: string; weight?: number; opacity?: number; fillOpacity?: number }> = {
      'stocked-streams': {
        color: '#2563eb',
        weight: 3,
        opacity: 0.7,
      },
      'stocked-lakes': {
        color: '#10b981',
        weight: 2,
        fillOpacity: 0.3,
      },
      'wild-streams': {
        color: '#f59e0b',
        weight: 3,
        opacity: 0.6,
      },
    };

    return styles[layerType] || { color: '#6b7280' };
  };

  // Popup content for features
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onEachFeature = (feature: any, layer: any) => {
    if (feature.properties) {
      const { name, county, species, type } = feature.properties;
      
      let popupContent = `<div class="p-2">`;
      if (name) popupContent += `<h3 class="font-bold text-lg mb-1">${name}</h3>`;
      if (county) popupContent += `<p class="text-sm text-gray-600">County: ${county}</p>`;
      if (species) popupContent += `<p class="text-sm text-gray-600">Species: ${species}</p>`;
      if (type) popupContent += `<p class="text-sm text-gray-600">Type: ${type}</p>`;
      popupContent += `</div>`;

      layer.bindPopup(popupContent);
    }
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
          <p className="text-gray-600">Loading map layers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Layer toggle controls */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-4 space-y-2">
        <h3 className="font-semibold text-sm mb-2">Map Layers</h3>
        {layers.map((layerData: LayerData) => (
          <label key={layerData.type} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={activeLayerTypes.has(layerData.type)}
              onChange={() => toggleLayer(layerData.type)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm">
              {layerData.type === 'stocked-streams' && 'Stocked Streams'}
              {layerData.type === 'stocked-lakes' && 'Stocked Lakes'}
              {layerData.type === 'wild-streams' && 'Wild Streams'}
            </span>
            <span
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: getLayerStyle(layerData.type).color }}
            ></span>
          </label>
        ))}
      </div>

      <MapContainer
        center={[37.5, -79.5]}
        zoom={7}
        style={{ height: '600px', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {layers.map((layerData: LayerData) => {
          if (!activeLayerTypes.has(layerData.type)) return null;

          return (
            <GeoJSON
              key={layerData.type}
              data={layerData.data}
              style={getLayerStyle(layerData.type)}
              onEachFeature={onEachFeature}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
