'use client';

import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import TabNavigation from '@/components/ui/TabNavigation';
import ScheduleTab from '@/components/schedule/ScheduleTab';
import WatersTab from '@/components/waters/WatersTab';

// Dynamic import for MapTab to avoid SSR issues with Leaflet
const MapTab = dynamic(() => import('@/components/map/MapTab'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] flex items-center justify-center bg-gray-50">
      <p>Loading map...</p>
    </div>
  ),
});

export default function Home() {
  const { activeTab, error } = useStore();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Virginia Trout Stocking Map</h1>
              <p className="text-sm text-gray-600">Track trout stocking schedules across Virginia</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-white">
        <TabNavigation />
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 mb-12">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {activeTab === 'map' && <MapTab />}
          {activeTab === 'schedule' && <ScheduleTab />}
          {activeTab === 'waters' && <WatersTab />}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            Data source: Virginia Department of Wildlife Resources (DWR) • Updates hourly
          </p>
        </div>
      </footer>
    </div>
  );
}
