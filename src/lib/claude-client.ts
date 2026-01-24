/**
 * Claude API Client for Journey Planning
 * Uses Anthropic SDK for AI-powered transit analysis
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ClaudeJourneyInput,
  ClaudeJourneyOutput,
  JourneyRecommendation,
  JourneyWarning,
} from '@/types/assistant';

// ============================================================================
// Configuration
// ============================================================================

const SYSTEM_PROMPT = `You are an expert transit journey planner for UK bus services. Your job is to analyze real-time arrival data and provide departure recommendations.

Given:
- A destination bus stop with upcoming arrivals
- The user's desired arrival time
- Current weather conditions
- User's location (if available)

Provide 2-3 departure recommendations with different confidence levels:
- "safe": High confidence (85-100%), allows buffer time for delays
- "moderate": Medium confidence (65-84%), reasonable timing with some risk
- "tight": Lower confidence (50-64%), cutting it close but possible

For each recommendation, consider:
1. Walking time to the stop (typically 5-10 minutes if location provided)
2. Wait time at the stop
3. Bus journey time (estimate based on typical conditions)
4. Weather impact on walking and bus delays
5. Service reliability (frequent services are more reliable)

Output your analysis as JSON with this exact structure:
{
  "recommendations": [
    {
      "departureTime": "ISO 8601 timestamp",
      "arrivalTime": "ISO 8601 timestamp",
      "confidenceScore": number (0-100),
      "totalDurationMinutes": number,
      "segments": [
        {
          "type": "walk" | "wait" | "bus",
          "durationMinutes": number,
          "description": "string",
          "lineName": "optional bus line",
          "stopName": "optional stop name"
        }
      ],
      "reasoning": "Brief explanation"
    }
  ],
  "warnings": [
    {
      "type": "weather" | "reliability" | "disruption",
      "severity": "info" | "warning" | "critical",
      "message": "string"
    }
  ]
}

Important:
- Always respond with valid JSON only, no markdown or extra text
- Times must be in ISO 8601 format
- Provide at least 2 recommendations if possible
- Be realistic about walking speeds (4-5 km/h typical)
- Consider that buses may be slightly delayed in bad weather`;

// ============================================================================
// Client
// ============================================================================

let anthropicClient: Anthropic | null = null;

/**
 * Get or create Anthropic client
 */
function getClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is required. ' +
        'Please add it to your .env.local file.'
      );
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

/**
 * Build the prompt for Claude
 */
function buildPrompt(input: ClaudeJourneyInput): string {
  const lines = [
    '## Journey Planning Request',
    '',
    `**Current Time:** ${input.currentTime}`,
    `**Desired Arrival Time:** ${input.desiredArrivalTime}`,
    '',
    '### Destination Stop',
    `- Name: ${input.destinationStop.name}`,
    `- ID: ${input.destinationStop.id}`,
    `- Location: ${input.destinationStop.lat}, ${input.destinationStop.lon}`,
    `- Lines serving this stop: ${input.destinationStop.lines.join(', ') || 'Unknown'}`,
    '',
  ];

  if (input.userLocation) {
    lines.push(
      '### User Location',
      `- Coordinates: ${input.userLocation.lat}, ${input.userLocation.lon}`,
      ''
    );
  }

  lines.push('### Upcoming Arrivals at Destination');
  if (input.arrivals.length === 0) {
    lines.push('No arrivals currently scheduled.');
  } else {
    input.arrivals.slice(0, 10).forEach((arrival, i) => {
      lines.push(
        `${i + 1}. **${arrival.lineName}** to ${arrival.destinationName}`,
        `   - Expected: ${arrival.expectedArrival}`,
        `   - Time to station: ${Math.round(arrival.timeToStation / 60)} minutes`
      );
    });
  }
  lines.push('');

  if (input.weather) {
    lines.push(
      '### Weather Conditions',
      `- Temperature: ${input.weather.temperature}°C`,
      `- Condition: ${input.weather.description || input.weather.condition}`,
      `- Precipitation probability: ${input.weather.precipitationProbability}%`,
      ''
    );
  }

  lines.push(
    '### Task',
    'Analyze this data and provide 2-3 departure recommendations.',
    'Respond with JSON only.'
  );

  return lines.join('\n');
}

/**
 * Parse Claude's response
 */
function parseResponse(responseText: string): ClaudeJourneyOutput {
  // Try to extract JSON from the response
  let jsonText = responseText.trim();

  // Remove markdown code blocks if present
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonText);

    // Validate structure
    if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
      throw new Error('Invalid response structure: missing recommendations array');
    }

    return {
      recommendations: parsed.recommendations,
      warnings: parsed.warnings || [],
    };
  } catch (error) {
    console.error('[Claude] Failed to parse response:', error);
    console.error('[Claude] Raw response:', responseText);
    throw new Error('Failed to parse AI response');
  }
}

/**
 * Generate confidence level from score
 */
function getConfidenceLevel(score: number): 'safe' | 'moderate' | 'tight' {
  if (score >= 85) return 'safe';
  if (score >= 65) return 'moderate';
  return 'tight';
}

/**
 * Analyze journey and generate recommendations
 */
export async function analyzeJourney(
  input: ClaudeJourneyInput
): Promise<{ recommendations: JourneyRecommendation[]; warnings: JourneyWarning[] }> {
  console.log('[Claude] Analyzing journey for:', input.destinationStop.name);

  const client = getClient();
  const prompt = buildPrompt(input);

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text from response
    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    const output = parseResponse(textContent.text);

    // Transform to JourneyRecommendation format
    const recommendations: JourneyRecommendation[] = output.recommendations.map(
      (rec, index) => ({
        id: `rec-${index + 1}-${Date.now()}`,
        departureTime: rec.departureTime,
        arrivalTime: rec.arrivalTime,
        confidenceScore: rec.confidenceScore,
        confidenceLevel: getConfidenceLevel(rec.confidenceScore),
        totalDurationMinutes: rec.totalDurationMinutes,
        segments: rec.segments,
        warnings: [],
      })
    );

    // Sort by confidence (highest first)
    recommendations.sort((a, b) => b.confidenceScore - a.confidenceScore);

    // Attach relevant warnings to recommendations
    const warnings = output.warnings;

    console.log('[Claude] Generated', recommendations.length, 'recommendations');

    return { recommendations, warnings };
  } catch (error) {
    console.error('[Claude] API error:', error);
    throw error;
  }
}

/**
 * Generate fallback recommendations when Claude is unavailable
 */
export function generateFallbackRecommendations(
  input: ClaudeJourneyInput
): { recommendations: JourneyRecommendation[]; warnings: JourneyWarning[] } {
  console.log('[Claude] Using fallback recommendations');

  const desiredArrival = new Date(input.desiredArrivalTime);
  const now = new Date(input.currentTime);

  // Simple heuristic: recommend leaving 30, 45, and 60 minutes before
  const allRecommendations: JourneyRecommendation[] = [
    {
      id: 'fallback-safe',
      departureTime: new Date(desiredArrival.getTime() - 60 * 60 * 1000).toISOString(),
      arrivalTime: new Date(desiredArrival.getTime() - 10 * 60 * 1000).toISOString(),
      confidenceScore: 90,
      confidenceLevel: 'safe' as const,
      totalDurationMinutes: 50,
      segments: [
        { type: 'walk' as const, durationMinutes: 10, description: 'Walk to stop' },
        { type: 'wait' as const, durationMinutes: 10, description: 'Wait for bus' },
        { type: 'bus' as const, durationMinutes: 30, description: 'Bus journey' },
      ],
      warnings: [],
    },
    {
      id: 'fallback-moderate',
      departureTime: new Date(desiredArrival.getTime() - 45 * 60 * 1000).toISOString(),
      arrivalTime: new Date(desiredArrival.getTime() - 5 * 60 * 1000).toISOString(),
      confidenceScore: 75,
      confidenceLevel: 'moderate' as const,
      totalDurationMinutes: 40,
      segments: [
        { type: 'walk' as const, durationMinutes: 10, description: 'Walk to stop' },
        { type: 'wait' as const, durationMinutes: 5, description: 'Wait for bus' },
        { type: 'bus' as const, durationMinutes: 25, description: 'Bus journey' },
      ],
      warnings: [],
    },
  ];

  const recommendations = allRecommendations.filter((rec) => new Date(rec.departureTime) > now);

  const warnings: JourneyWarning[] = [
    {
      type: 'reliability',
      severity: 'info',
      message: 'These are estimated times. Real-time data may vary.',
    },
  ];

  return { recommendations, warnings };
}
