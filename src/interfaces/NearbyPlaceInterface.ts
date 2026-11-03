import { PlaceSuggestionInterface } from '@/interfaces/PlaceSuggestionInterface';

export interface NearbyPlaceInterface extends PlaceSuggestionInterface {
    distanceMeters: number;
}
