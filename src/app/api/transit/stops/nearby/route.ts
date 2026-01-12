import { NextRequest, NextResponse } from 'next/server';
import { getNearbyStopsInCity } from '@/lib/providers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const radius = searchParams.get('radius') || '500';
  const cityId = searchParams.get('city') || 'london';

  if (!lat || !lon) {
    return NextResponse.json(
      { success: false, error: 'Missing lat or lon parameter' },
      { status: 400 }
    );
  }

  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  const radiusNum = parseInt(radius, 10);

  if (isNaN(latNum) || isNaN(lonNum)) {
    return NextResponse.json(
      { success: false, error: 'Invalid lat or lon parameter' },
      { status: 400 }
    );
  }

  try {
    const result = await getNearbyStopsInCity(cityId, {
      lat: latNum,
      lon: lonNum,
      radius: radiusNum,
      maxResults: 30,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      timestamp: result.timestamp,
    });
  } catch (error) {
    console.error('[API] Nearby stops error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch nearby stops' },
      { status: 500 }
    );
  }
}
