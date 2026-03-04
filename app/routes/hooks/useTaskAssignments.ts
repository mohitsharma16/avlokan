import { useState, useEffect, useCallback } from "react";
import type PocketBase from "pocketbase";
import type { Task } from "../types";

interface UseTaskAssignmentsProps {
    pb: PocketBase;
    revisionId: string;
}

export function useTaskAssignments({ pb, revisionId }: UseTaskAssignmentsProps) {
    const [tasks, setTasks] = useState<Task[]>([]);

    const fetchTasks = useCallback(async () => {
        if (!revisionId) return;
        try {
            const res = await pb.collection("tasks").getFullList({
                filter: `revisionId = "${revisionId}"`,
                sort: "-created",
                requestKey: null,
            });
            setTasks(res as unknown as Task[]);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    }, [revisionId, pb]);

    // Initial fetch
    useEffect(() => {
        if (revisionId) {
            fetchTasks();
        }
    }, [revisionId, fetchTasks]);

    // Realtime subscription
    useEffect(() => {
        if (!revisionId) return;

        let unsubscribe: (() => Promise<void>) | null = null;

        pb.collection("tasks")
            .subscribe("*", (data: any) => {
                const record = data.record;
                if (record.revisionId !== revisionId) return;

                switch (data.action) {
                    case "create":
                        setTasks((prev) => {
                            if (prev.some((t) => t.id === record.id)) return prev;
                            return [record as unknown as Task, ...prev];
                        });
                        break;
                    case "update":
                        setTasks((prev) =>
                            prev.map((t) =>
                                t.id === record.id ? (record as unknown as Task) : t
                            )
                        );
                        break;
                    case "delete":
                        setTasks((prev) => prev.filter((t) => t.id !== record.id));
                        break;
                }
            })
            .then((unsub: () => Promise<void>) => {
                unsubscribe = unsub;
            })
            .catch((err: any) => {
                console.error("Error subscribing to tasks:", err);
            });

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [revisionId, pb]);

    const createTask = useCallback(
        async (
            commentId: string,
            assignedTo: string,
            assignedBy: string,
            description: string
        ) => {
            try {
                const record = await pb.collection("tasks").create(
                    {
                        commentId,
                        revisionId,
                        assignedTo,
                        assignedBy,
                        status: "open",
                        description,
                    },
                    { requestKey: null }
                );

                // Create notification for the assignee
                try {
                    await pb.collection("notifications").create(
                        {
                            userId: assignedTo,
                            type: "task_assigned",
                            message: `${assignedBy} assigned you a task: "${description}"`,
                            revisionId,
                            sourceUser: assignedBy,
                            read: false,
                        },
                        { requestKey: null }
                    );
                } catch (notifErr) {
                    console.warn("Could not create task notification:", notifErr);
                }

                return record;
            } catch (error) {
                console.error("Error creating task:", error);
                throw error;
            }
        },
        [pb, revisionId]
    );

    const updateTaskStatus = useCallback(
        async (taskId: string, status: Task["status"]) => {
            try {
                await pb.collection("tasks").update(
                    taskId,
                    { status },
                    { requestKey: null }
                );
            } catch (error) {
                console.error("Error updating task status:", error);
                throw error;
            }
        },
        [pb]
    );

    return {
        tasks,
        fetchTasks,
        createTask,
        updateTaskStatus,
    };
}
