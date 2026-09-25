import type PocketBase from "pocketbase";

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

/**
 * Create a server-verified share link: the token + expiry are stored in the
 * "share_links" collection and validated there by revision.$id.tsx's loader,
 * so the URL's expires can't be tampered with by whoever holds the link.
 */
export async function generateShareLink(
    pb: PocketBase,
    revisionId: string,
    createdBy?: string
): Promise<string> {
    const expires = Date.now() + 60 * 60 * 1000;
    const token = crypto.randomUUID();

    await pb.collection("share_links").create({
        token,
        revisionId,
        expires,
        createdBy: createdBy || "",
    });

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/revision/${revisionId}?token=${token}`;
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
