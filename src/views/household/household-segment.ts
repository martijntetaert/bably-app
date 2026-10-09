export type HouseholdSegment = 'tasks' | 'members' | 'insights';

export const householdSegments: HouseholdSegment[] = ['tasks', 'members', 'insights'];

export function householdSegmentFrom(value: unknown): HouseholdSegment {
    return householdSegments.includes(value as HouseholdSegment) ? (value as HouseholdSegment) : 'tasks';
}
