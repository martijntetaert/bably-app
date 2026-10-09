export interface UserInterface {
    identifier: string;
    firstname: string;
    lastname: string;
    displayName: string;
    photoUrl: string | null;
    name: string;
    email: string;
    pendingEmail?: string | null;
    openTaskCount?: number;
}
