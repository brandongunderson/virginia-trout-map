// Server-side API route for ArcGIS MapServer proxy

import { NextRequest, NextResponse } from 'next/server';
import { ARCGIS_SERVICE_URL, QUERY_PARAMS } from '../../../lib/arcgis-config';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const layerId = searchParams.get('layer');
  const where = searchParams.get('where') || '1=1';
  const outFields = searchParams.get('outFields') || '*';

  if (!layerId) {
    return NextResponse.json({ error: 'Layer ID required' }, { status: 400 });
  }

  try {
    const url = `${ARCGIS_SERVICE_URL}/${layerId}/query`;
    const params = new URLSearchParams({
      ...QUERY_PARAMS,
      where,
      outFields,
    });
    
    console.log(`Fetching ArcGIS layer ${layerId} from: ${url}`);
    
    const response = await fetch(`${url}?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ArcGIS API error (${response.status}):`, errorText);
      throw new Error(`ArcGIS API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Log successful fetch
    const featureCount = data.features?.length || 0;
    console.log(`Successfully fetched layer ${layerId}: ${featureCount} features`);
    
    return NextResponse.json({
      success: true,
      data,
      layerId: parseInt(layerId),
      featureCount,
    });
  } catch (error) {
    console.error('ArcGIS fetch error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch ArcGIS data',
        layerId: parseInt(layerId || '0'),
      },
      { status: 500 }
    );
  }
}

// POST endpoint to refresh specific layer cache
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const layerId = body.layer;

    if (!layerId) {
      return NextResponse.json({ error: 'Layer ID required' }, { status: 400 });
    }

    // Trigger a fresh fetch by calling the GET endpoint
    const url = `${ARCGIS_SERVICE_URL}/${layerId}/query`;
    const params = new URLSearchParams(QUERY_PARAMS);
    
    const response = await fetch(`${url}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`ArcGIS API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: `Layer ${layerId} data refreshed`,
      featureCount: data.features?.length || 0,
    });
  } catch (error) {
    console.error('ArcGIS refresh error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh ArcGIS data',
      },
      { status: 500 }
    );
  }
}
