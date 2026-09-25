export interface Command {
    id: string;
    label: string;
    description: string;
    action: () => void;
}

export interface TimestampPill {
    id: string;
    text: string;
    timestamp: string;
}

export function generateShareLink(revisionId: string): string {
    const expires = Date.now() + 60 * 60 * 1000;
    const token = crypto.randomUUID();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/revision/${revisionId}?token=${token}&expires=${expires}`;
}

export function formatTime(timeInSeconds: number): string {
    const minutes = Math.floor(timeInSeconds / 60)
        .toString()
        .padStart(2, "0");
    const seconds = Math.floor(timeInSeconds % 60)
        .toString()
        .padStart(2, "0");
    return `${minutes}:${seconds}`;
}
