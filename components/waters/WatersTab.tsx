'use client';

import { useMemo, useState } from 'react';
import { MapPin, Calendar } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function WatersTab() {
  const { stockingEvents } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCounty, setSelectedCounty] = useState<string>('all');

  interface WaterBody {
    name: string;
    county: string;
    events: typeof stockingEvents;
    species: Set<string>;
    totalStockings: number;
  }

  // Group events by water body
  const waterBodies = useMemo(() => {
    const grouped = stockingEvents.reduce((acc, event) => {
      const key = event.waterBody;
      if (!acc[key]) {
        acc[key] = {
          name: event.waterBody,
          county: event.county,
          events: [],
          species: new Set<string>(),
          totalStockings: 0,
        };
      }
      acc[key].events.push(event);
      acc[key].species.add(event.species);
      acc[key].totalStockings += 1;
      return acc;
    }, {} as Record<string, WaterBody>);

    return Object.values(grouped);
  }, [stockingEvents]);

  // Get unique counties
  const counties = useMemo(() => {
    const uniqueCounties = new Set(waterBodies.map((w) => w.county).filter(Boolean));
    return Array.from(uniqueCounties).sort();
  }, [waterBodies]);

  // Filter water bodies
  const filteredWaters = useMemo(() => {
    let filtered = [...waterBodies];

    // Apply county filter
    if (selectedCounty !== 'all') {
      filtered = filtered.filter((w) => w.county === selectedCounty);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((w) =>
        w.name.toLowerCase().includes(query) ||
        w.county.toLowerCase().includes(query)
      );
    }

    // Sort alphabetically
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    return filtered;
  }, [waterBodies, searchQuery, selectedCounty]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Stocked Waters Directory</h2>
        <p className="text-gray-600 mt-1">Browse all water bodies stocked with trout in Virginia</p>
      </div>

      {/* Search and filter */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <Input
            type="text"
            placeholder="Search water bodies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <select
            value={selectedCounty}
            onChange={(e) => setSelectedCounty(e.target.value)}
            className="px-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="all">All Counties</option>
            {counties.map((county: string) => (
              <option key={county} value={county}>{county}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-muted-foreground">
        {filteredWaters.length} water {filteredWaters.length === 1 ? 'body' : 'bodies'} found
      </div>

      {/* Water bodies grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWaters.map((water) => (
          <Card key={water.name} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{water.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{water.county} County</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{water.totalStockings} stocking{water.totalStockings !== 1 ? 's' : ''}</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {Array.from(water.species).map((species: string) => (
                  <Badge key={species} variant="secondary">
                    {species}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredWaters.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No water bodies found. Try adjusting your search or filters.
        </div>
      )}
    </div>
  );
}
