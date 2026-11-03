export interface StoreInterface {
    identifier: string;
    name: string;
    place: string | null;
    recognisable: boolean;
    routeLength: number;
    tripsCount: number;
    location: StoreLocationInterface | null;
    suggestedLocation: StoreLocationInterface | null;
}

export interface StoreLocationInterface {
    googlePlaceId: string;
    name: string;
    address: string | null;
}
