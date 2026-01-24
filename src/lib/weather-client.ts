/**
 * Weather API Client
 * Uses Open-Meteo API (free, no API key required)
 * @see https://open-meteo.com/
 */

import type { WeatherConditions } from '@/types/assistant';

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1';

/**
 * Open-Meteo API response type
 */
interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    weather_code: number;
    precipitation: number;
    relative_humidity_2m: number;
  };
  hourly?: {
    time: string[];
    precipitation_probability: number[];
  };
}

/**
 * Map WMO weather codes to condition categories
 * @see https://open-meteo.com/en/docs#weathervariables
 */
function mapWeatherCode(code: number): {
  condition: WeatherConditions['condition'];
  description: string;
} {
  // Clear sky
  if (code === 0) {
    return { condition: 'clear', description: 'Clear sky' };
  }
  // Mainly clear, partly cloudy
  if (code >= 1 && code <= 2) {
    return { condition: 'clear', description: 'Mostly clear' };
  }
  // Overcast
  if (code === 3) {
    return { condition: 'cloudy', description: 'Overcast' };
  }
  // Fog
  if (code >= 45 && code <= 48) {
    return { condition: 'cloudy', description: 'Foggy' };
  }
  // Drizzle
  if (code >= 51 && code <= 55) {
    return { condition: 'rain', description: 'Drizzle' };
  }
  // Freezing drizzle
  if (code >= 56 && code <= 57) {
    return { condition: 'rain', description: 'Freezing drizzle' };
  }
  // Rain - slight to moderate
  if (code >= 61 && code <= 63) {
    return { condition: 'rain', description: 'Rain' };
  }
  // Heavy rain
  if (code === 65) {
    return { condition: 'heavy_rain', description: 'Heavy rain' };
  }
  // Freezing rain
  if (code >= 66 && code <= 67) {
    return { condition: 'heavy_rain', description: 'Freezing rain' };
  }
  // Snow
  if (code >= 71 && code <= 77) {
    return { condition: 'snow', description: 'Snow' };
  }
  // Rain showers
  if (code >= 80 && code <= 81) {
    return { condition: 'rain', description: 'Rain showers' };
  }
  // Heavy rain showers
  if (code === 82) {
    return { condition: 'heavy_rain', description: 'Heavy showers' };
  }
  // Snow showers
  if (code >= 85 && code <= 86) {
    return { condition: 'snow', description: 'Snow showers' };
  }
  // Thunderstorm
  if (code >= 95 && code <= 99) {
    return { condition: 'heavy_rain', description: 'Thunderstorm' };
  }
  // Default
  return { condition: 'cloudy', description: 'Variable conditions' };
}

/**
 * Fetch current weather conditions for a location
 */
export async function getWeather(
  lat: number,
  lon: number
): Promise<WeatherConditions | null> {
  try {
    const url = new URL(`${OPEN_METEO_BASE_URL}/forecast`);
    url.searchParams.set('latitude', lat.toString());
    url.searchParams.set('longitude', lon.toString());
    url.searchParams.set('current', 'temperature_2m,weather_code,precipitation,relative_humidity_2m');
    url.searchParams.set('hourly', 'precipitation_probability');
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '1');

    console.log('[Weather API] Fetching weather for:', { lat, lon });

    const response = await fetch(url.toString(), {
      next: { revalidate: 600 }, // Cache for 10 minutes
    });

    if (!response.ok) {
      console.error('[Weather API] Error:', response.status, response.statusText);
      return null;
    }

    const data: OpenMeteoResponse = await response.json();

    // Get current hour's precipitation probability
    let precipitationProbability = 0;
    if (data.hourly?.time && data.hourly?.precipitation_probability) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDateStr = now.toISOString().split('T')[0];

      const hourIndex = data.hourly.time.findIndex((t) => {
        const timeDate = new Date(t);
        return (
          timeDate.toISOString().split('T')[0] === currentDateStr &&
          timeDate.getHours() === currentHour
        );
      });

      if (hourIndex !== -1) {
        precipitationProbability = data.hourly.precipitation_probability[hourIndex];
      }
    }

    const { condition, description } = mapWeatherCode(data.current.weather_code);

    const weather: WeatherConditions = {
      temperature: Math.round(data.current.temperature_2m),
      condition,
      precipitationProbability,
      description,
      weatherCode: data.current.weather_code,
    };

    console.log('[Weather API] Weather:', weather);

    return weather;
  } catch (error) {
    console.error('[Weather API] Failed to fetch weather:', error);
    return null;
  }
}

/**
 * Get weather impact factor for journey planning
 * Returns a multiplier (1.0 = no impact, higher = more delay expected)
 */
export function getWeatherImpact(weather: WeatherConditions | null): number {
  if (!weather) return 1.0;

  switch (weather.condition) {
    case 'clear':
      return 1.0;
    case 'cloudy':
      return 1.0;
    case 'rain':
      return 1.1; // 10% longer for light rain
    case 'heavy_rain':
      return 1.2; // 20% longer for heavy rain
    case 'snow':
      return 1.3; // 30% longer for snow
    default:
      return 1.0;
  }
}
