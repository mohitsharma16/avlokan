import type PocketBase from "pocketbase";
import type { RecordSubscription } from "pocketbase";

export function subscribeToRecords(
    pb: PocketBase,
    collection: string,
    onRecord: (event: RecordSubscription) => void,
): () => void {
    let disposed = false;
    const subscription = pb.collection(collection).subscribe("*", (event) => {
        if (!disposed) onRecord(event);
    });

    // Observe setup failures even if the view stays mounted.
    const ready = subscription.catch((error) => {
        console.error("Error subscribing to", collection, error);
    });

    return () => {
        if (disposed) return;
        disposed = true;
        void ready.then(unsubscribe => unsubscribe?.()).catch(error => {
            console.error("Error unsubscribing from", collection, error);
        });
    };
}
