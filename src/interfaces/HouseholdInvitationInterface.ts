import { UserInterface } from '@/interfaces/UserInterface';

export interface HouseholdInvitationInterface {
    identifier: string;
    email: string;
    expiresAt: string;
    invitedBy?: UserInterface;
}
