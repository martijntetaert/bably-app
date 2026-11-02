export interface SwipeActionInterface {
    label: string;
    tone: 'primary' | 'neutral' | 'destructive';
    run: () => void;
}
