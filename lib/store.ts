// Zustand state management store

import { create } from 'zustand';
import { StockingEvent, LayerData, LayerType, CacheStatus } from './types';

interface AppState {
  // Active tab
  activeTab: 'map' | 'schedule' | 'waters';
  setActiveTab: (tab: 'map' | 'schedule' | 'waters') => void;

  // Map layers
  layers: LayerData[];
  setLayers: (layers: LayerData[]) => void;
  activeLayerTypes: Set<LayerType>;
  toggleLayer: (layerType: LayerType) => void;

  // Stocking events
  stockingEvents: StockingEvent[];
  setStockingEvents: (events: StockingEvent[]) => void;
  
  // Schedule view mode
  scheduleViewMode: 'list' | 'calendar';
  setScheduleViewMode: (mode: 'list' | 'calendar') => void;

  // Filters
  selectedCounties: string[];
  toggleCounty: (county: string) => void;
  clearCounties: () => void;

  selectedSpecies: string[];
  toggleSpecies: (species: string) => void;
  clearSpecies: () => void;

  dateRange: { start: string | null; end: string | null };
  setDateRange: (start: string | null, end: string | null) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Sort
  sortBy: 'date' | 'waterBody' | 'county' | 'species';
  sortOrder: 'asc' | 'desc';
  setSorting: (by: 'date' | 'waterBody' | 'county' | 'species', order: 'asc' | 'desc') => void;

  // Cache status
  cacheStatus: CacheStatus | null;
  setCacheStatus: (status: CacheStatus) => void;

  // Loading states
  isLoadingLayers: boolean;
  setIsLoadingLayers: (loading: boolean) => void;

  isLoadingEvents: boolean;
  setIsLoadingEvents: (loading: boolean) => void;

  // Error states
  error: string | null;
  setError: (error: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  // Tab
  activeTab: 'map',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Layers
  layers: [],
  setLayers: (layers) => set({ layers }),
  activeLayerTypes: new Set<LayerType>(['stocked-streams', 'stocked-lakes']),
  toggleLayer: (layerType) =>
    set((state) => {
      const newSet = new Set(state.activeLayerTypes);
      if (newSet.has(layerType)) {
        newSet.delete(layerType);
      } else {
        newSet.add(layerType);
      }
      return { activeLayerTypes: newSet };
    }),

  // Stocking events
  stockingEvents: [],
  setStockingEvents: (events) => set({ stockingEvents: events }),

  // Schedule view
  scheduleViewMode: 'list',
  setScheduleViewMode: (mode) => set({ scheduleViewMode: mode }),

  // Filters
  selectedCounties: [],
  toggleCounty: (county) =>
    set((state) => {
      const isSelected = state.selectedCounties.includes(county);
      return {
        selectedCounties: isSelected
          ? state.selectedCounties.filter((c) => c !== county)
          : [...state.selectedCounties, county],
      };
    }),
  clearCounties: () => set({ selectedCounties: [] }),

  selectedSpecies: [],
  toggleSpecies: (species) =>
    set((state) => {
      const isSelected = state.selectedSpecies.includes(species);
      return {
        selectedSpecies: isSelected
          ? state.selectedSpecies.filter((s) => s !== species)
          : [...state.selectedSpecies, species],
      };
    }),
  clearSpecies: () => set({ selectedSpecies: [] }),

  dateRange: { start: null, end: null },
  setDateRange: (start, end) => set({ dateRange: { start, end } }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Sort
  sortBy: 'date',
  sortOrder: 'asc',
  setSorting: (by, order) => set({ sortBy: by, sortOrder: order }),

  // Cache
  cacheStatus: null,
  setCacheStatus: (status) => set({ cacheStatus: status }),

  // Loading
  isLoadingLayers: false,
  setIsLoadingLayers: (loading) => set({ isLoadingLayers: loading }),

  isLoadingEvents: false,
  setIsLoadingEvents: (loading) => set({ isLoadingEvents: loading }),

  // Error
  error: null,
  setError: (error) => set({ error }),
}));
