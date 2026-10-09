import { HouseholdInterface } from '@/interfaces/HouseholdInterface';
import { HouseholdInvitationInterface } from '@/interfaces/HouseholdInvitationInterface';
import { UserInterface } from '@/interfaces/UserInterface';

export interface HouseholdOverviewInterface {
    household: HouseholdInterface;
    members: UserInterface[];
    invitations: HouseholdInvitationInterface[];
}

export interface InsightsInterface {
    month: string;
    currentMonth: string;
    insights: {
        tasks: { identifier: string; displayName: string; firstname: string; photoUrl: string | null; count: number }[];
        products: { name: string; count: number }[];
        cooking: { days: number; recipes: { name: string; count: number }[] };
        shopping: { trips: number; store: string | null };
    };
}
