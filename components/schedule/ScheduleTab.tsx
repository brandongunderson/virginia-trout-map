'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Download, Filter } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function ScheduleTab() {
  const {
    stockingEvents,
    setStockingEvents,
    selectedCounties,
    toggleCounty,
    clearCounties,
    selectedSpecies,
    toggleSpecies,
    clearSpecies,
    searchQuery,
    setSearchQuery,
    sortBy,
    sortOrder,
    setSorting,
    isLoadingEvents,
    setIsLoadingEvents,
    setError,
    cacheStatus,
    setCacheStatus,
  } = useStore();

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    async function loadEvents() {
      setIsLoadingEvents(true);
      setError(null);

      try {
        const response = await fetch('/api/stocking-data');
        const result = await response.json();

        if (result.success) {
          setStockingEvents(result.data);
          setCacheStatus(result.cache);
        } else {
          setError(result.error || 'Failed to load stocking data');
        }
      } catch (error) {
        console.error('Error loading stocking events:', error);
        setError('Failed to load stocking data');
      } finally {
        setIsLoadingEvents(false);
      }
    }

    if (stockingEvents.length === 0) {
      loadEvents();
    }
  }, [stockingEvents.length, setIsLoadingEvents, setError, setStockingEvents, setCacheStatus]);

  // Get unique counties and species
  const availableCounties = useMemo(() => {
    const counties = new Set(stockingEvents.map(e => e.county).filter(Boolean));
    return Array.from(counties).sort();
  }, [stockingEvents]);

  const availableSpecies = useMemo(() => {
    const species = new Set(stockingEvents.map(e => e.species).filter(Boolean));
    return Array.from(species).sort();
  }, [stockingEvents]);

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let filtered = [...stockingEvents];

    // Apply county filter
    if (selectedCounties.length > 0) {
      filtered = filtered.filter(e => selectedCounties.includes(e.county));
    }

    // Apply species filter
    if (selectedSpecies.length > 0) {
      filtered = filtered.filter(e => selectedSpecies.includes(e.species));
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.waterBody.toLowerCase().includes(query) ||
        e.county.toLowerCase().includes(query) ||
        e.species.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let compareA: string | number = a[sortBy] as string | number;
      let compareB: string | number = b[sortBy] as string | number;

      if (sortBy === 'date') {
        compareA = new Date(a.date).getTime();
        compareB = new Date(b.date).getTime();
      } else {
        compareA = compareA?.toString().toLowerCase() || '';
        compareB = compareB?.toString().toLowerCase() || '';
      }

      if (compareA < compareB) return sortOrder === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [stockingEvents, selectedCounties, selectedSpecies, searchQuery, sortBy, sortOrder]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Water Body', 'County', 'Species', 'Pounds', 'Number of Fish'];
    const rows = filteredEvents.map(e => [
      format(new Date(e.date), 'yyyy-MM-dd'),
      e.waterBody,
      e.county,
      e.species,
      e.pounds || '',
      e.numberOfFish || '',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `virginia-trout-stocking-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  // Sort handler
  const handleSort = (column: 'date' | 'waterBody' | 'county' | 'species') => {
    if (sortBy === column) {
      setSorting(column, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSorting(column, 'asc');
    }
  };

  if (isLoadingEvents) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stocking schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with cache status */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Trout Stocking Schedule</h2>
          {cacheStatus?.isCached && (
            <p className="text-sm text-muted-foreground mt-1">
              Last updated: {cacheStatus.lastUpdated ? format(new Date(cacheStatus.lastUpdated), 'PPp') : 'Unknown'}
            </p>
          )}
        </div>
        <Button onClick={exportToCSV}>
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Search and filters */}
      <div className="mb-4 space-y-4">
        <div className="flex gap-4">
          <Input
            type="text"
            placeholder="Search water body, county, or species..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4">
              {/* County filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-medium">Counties</Label>
                  {selectedCounties.length > 0 && (
                    <Button variant="link" size="sm" onClick={clearCounties}>
                      Clear
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableCounties.map(county => (
                    <div key={county} className="flex items-center space-x-2">
                      <Checkbox
                        id={`county-${county}`}
                        checked={selectedCounties.includes(county)}
                        onCheckedChange={() => toggleCounty(county)}
                      />
                      <Label htmlFor={`county-${county}`} className="text-sm font-normal cursor-pointer">
                        {county}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Species filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-medium">Species</Label>
                  {selectedSpecies.length > 0 && (
                    <Button variant="link" size="sm" onClick={clearSpecies}>
                      Clear
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {availableSpecies.map(species => (
                    <div key={species} className="flex items-center space-x-2">
                      <Checkbox
                        id={`species-${species}`}
                        checked={selectedSpecies.includes(species)}
                        onCheckedChange={() => toggleSpecies(species)}
                      />
                      <Label htmlFor={`species-${species}`} className="text-sm font-normal cursor-pointer">
                        {species}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredEvents.length} of {stockingEvents.length} events
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {[
                { key: 'date', label: 'Date' },
                { key: 'waterBody', label: 'Water Body' },
                { key: 'county', label: 'County' },
                { key: 'species', label: 'Species' },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key as 'date' | 'waterBody' | 'county' | 'species')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-1">
                    {label}
                    {sortBy === key && (
                      <span>
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEvents.map((event) => (
              <tr key={event.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(new Date(event.date), 'MMM dd, yyyy')}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {event.waterBody}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {event.county}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {event.species}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {event.pounds && `${event.pounds} lbs`}
                  {event.pounds && event.numberOfFish && ' • '}
                  {event.numberOfFish && `${event.numberOfFish} fish`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No stocking events found. Try adjusting your filters.
        </div>
      )}
    </div>
  );
}
