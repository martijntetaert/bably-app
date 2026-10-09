import { UserInterface } from '@/interfaces/UserInterface';

export interface ProfileInterface {
    user: UserInterface;
    emailVerified: boolean;
    isLastMember: boolean;
    calendarUrl: string | null;
    wantsTaskReminder: boolean;
}
