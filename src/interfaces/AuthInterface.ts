import { UserInterface } from '@/interfaces/UserInterface';

export interface AuthInterface {
    token: string;
    user: UserInterface;
    emailVerified: boolean;
}
