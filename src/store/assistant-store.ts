/**
 * Assistant Store - State management for the AI journey planner
 */

import { create } from 'zustand';
import type { Stop } from '@/types/tfl';
import type { JourneyRecommendation, WeatherConditions } from '@/types/assistant';

export type AssistantStep = 'destination' | 'time' | 'results';

interface AssistantState {
  // Current step in the wizard
  step: AssistantStep;

  // Destination selection
  destination: Stop | null;

  // Time selection
  arrivalTime: Date | null;

  // Results
  recommendations: JourneyRecommendation[];
  weather: WeatherConditions | null;
  destinationName: string | null;

  // Loading/error state
  isLoading: boolean;
  error: string | null;

  // Actions
  setStep: (step: AssistantStep) => void;
  setDestination: (destination: Stop | null) => void;
  setArrivalTime: (time: Date | null) => void;
  setRecommendations: (recommendations: JourneyRecommendation[]) => void;
  setWeather: (weather: WeatherConditions | null) => void;
  setDestinationName: (name: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Multi-field setters
  setResults: (data: {
    recommendations: JourneyRecommendation[];
    weather: WeatherConditions | null;
    destinationName: string;
  }) => void;

  // Navigation helpers
  goToDestination: () => void;
  goToTime: () => void;
  goToResults: () => void;
  goBack: () => void;

  // Reset
  reset: () => void;
  resetResults: () => void;
}

const initialState = {
  step: 'destination' as AssistantStep,
  destination: null,
  arrivalTime: null,
  recommendations: [],
  weather: null,
  destinationName: null,
  isLoading: false,
  error: null,
};

export const useAssistantStore = create<AssistantState>((set, get) => ({
  ...initialState,

  // Actions
  setStep: (step) => set({ step }),
  setDestination: (destination) => set({ destination }),
  setArrivalTime: (arrivalTime) => set({ arrivalTime }),
  setRecommendations: (recommendations) => set({ recommendations }),
  setWeather: (weather) => set({ weather }),
  setDestinationName: (destinationName) => set({ destinationName }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Multi-field setter for results
  setResults: (data) =>
    set({
      recommendations: data.recommendations,
      weather: data.weather,
      destinationName: data.destinationName,
    }),

  // Navigation helpers
  goToDestination: () => set({ step: 'destination' }),
  goToTime: () => set({ step: 'time' }),
  goToResults: () => set({ step: 'results' }),

  goBack: () => {
    const { step } = get();
    if (step === 'time') {
      set({ step: 'destination' });
    } else if (step === 'results') {
      set({ step: 'time' });
    }
  },

  // Reset functions
  reset: () => set(initialState),

  resetResults: () =>
    set({
      recommendations: [],
      weather: null,
      destinationName: null,
      error: null,
    }),
}));
