export const handle = { public: true };

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router-dom";
import PocketBase from "pocketbase";
import type { LoaderData, Revision, PBUser } from "../types";
import { useCommentEditor } from "../components/AssetCard/useCommentEditor";
import { useAnnotations } from "../components/AssetCard/useAnnotations";
import { useTaskAssignments } from "../hooks/useTaskAssignments";
import CommentsPanel from "../components/AssetCard/CommentsPanel";
import AnnotationToolbar from "../components/AssetCard/AnnotationToolbar";

const pb = new PocketBase("http://127.0.0.1:8090");

interface ActionData {
  errors?: {
    form?: string;
  };
  isAuthorized?: boolean;
  userEmail?: string;
}

export async function loader({
  params,
  request,
}: {
  params: { id: string };
  request: Request;
}) {
  const revisionId = params.id;
  if (!revisionId) {
    throw new Response("Not Found", { status: 404 });
  }
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const expires = Number(url.searchParams.get("expires"));

  if (!token || isNaN(expires) || Date.now() > expires) {
    throw new Response(
      "The share link is invalid or has expired. Please request a new one.",
      { status: 403 }
    );
  }

  try {
    const revision = await pb
      .collection("assets_revision")
      .getOne<Revision>(revisionId, { requestKey: null });

    return { revision, comments: [], revisionId };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log("Fetch aborted, likely due to HMR. Ignoring.");
    }
    console.error("Loader Error - Failed to fetch revision data:", error);
    throw new Response("This revision could not be found.", { status: 404 });
  }
}

export async function action({
  request,
}: {
  request: Request;
  params: { id: string };
}) {
  const formData = await request.formData();
  const submissionType = formData.get("_action");

  if (submissionType === "authorize") {
    const email = formData.get("email") as string;
    if (!email || !email.includes("@")) {
      return { errors: { form: "Please enter a valid email address." } };
    }
    try {
      await pb.admins.authWithPassword(
        import.meta.env.VITE_SUPERADMIN_EMAIL,
        import.meta.env.VITE_SUPERADMIN_PASSWORD,
        { requestKey: null }
      );

      try {
        await pb
          .collection("users")
          .getFirstListItem(`email = "${email}"`, { requestKey: null });
      } catch (e) {
        const randomPassword = crypto.randomUUID();
        await pb.collection("users").create(
          {
            email,
            emailVisibility: false,
            password: randomPassword,
            passwordConfirm: randomPassword,
          },
          { requestKey: null }
        );
      }
      return { isAuthorized: true, userEmail: email };
    } catch (err) {
      console.error("Action Error - Authentication failed:", err);
      return { errors: { form: "Authentication failed. Please try again." } };
    }
  }

  return { errors: { form: "Invalid form submission." } };
}

export default function RevisionViewer() {
  const { revision } = useLoaderData() as LoaderData;
  const actionData = useActionData() as ActionData | undefined;
  const navigation = useNavigation();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isAuthorized, setIsAuthorized] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("isAuthorized") === "true";
    }
    return false;
  });
  const [reviewerName, setReviewerName] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("reviewerName");
    }
    return null;
  });

  useEffect(() => {
    if (actionData?.isAuthorized && actionData.userEmail) {
      const name = actionData.userEmail.split("@")[0];
      setIsAuthorized(true);
      setReviewerName(name);
      sessionStorage.setItem("isAuthorized", "true");
      sessionStorage.setItem("reviewerName", name);
    }
  }, [actionData]);

  // Reuse the same annotation hook from AssetCard
  const {
    isAnnotating,
    annotationTool,
    setAnnotationTool,
    currentAnnotation,
    brushColor,
    setBrushColor,
    brushSize,
    setBrushSize,
    annotationDuration,
    setAnnotationDuration,
    saveAnnotation,
    clearCurrentAnnotations,
    fetchAnnotations,
    toggleAnnotating,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useAnnotations({
    pb,
    revision,
    user: reviewerName ? { name: reviewerName, email: reviewerName } : null,
    videoRef,
    canvasRef,
    containerRef,
    showModal: isAuthorized,
  });

  // Reuse the same comment editor hook from AssetCard
  const {
    comments,
    commentText,
    timestampPills,
    showCommandPalette,
    filteredCommands,
    selectedCommandIndex,
    timeRangeDuration,
    setTimeRangeDuration,
    handleEditorChange,
    handleEditorMount,
    handleSubmit,
    executeCommand,
    removePill,
    seekToTimestamp,
    fetchComments,
    // @Mentions
    showMentionSuggestions,
    filteredUsers,
    selectedMentionIndex,
    selectMention,
    allUsers,
    // Threading
    replyingTo,
    setReplyingTo,
    cancelReply,
    // Task assignment
    showAssignDropdown,
    setShowAssignDropdown,
    assignFilteredUsers,
    selectedAssignIndex,
  } = useCommentEditor({
    pb,
    revision,
    user: reviewerName ? { name: reviewerName, email: reviewerName } : null,
    videoRef,
    showModal: isAuthorized,
  });

  // Task assignments hook
  const { tasks, createTask, updateTaskStatus } = useTaskAssignments({
    pb,
    revisionId: revision.id,
  });

  // Handle assign task to user
  const handleAssignTask = useCallback(
    async (assignUser: PBUser) => {
      const assignerName = reviewerName || "Unknown";
      const description = commentText.trim() || "Task from comment";
      try {
        await createTask(
          "",
          assignUser.name || assignUser.email.split("@")[0],
          assignerName,
          description
        );
        setShowAssignDropdown(false);
      } catch (err) {
        console.error("Failed to assign task:", err);
      }
    },
    [createTask, reviewerName, commentText, setShowAssignDropdown]
  );

  // Fetch comments and annotations when authorized
  useEffect(() => {
    if (isAuthorized && revision.id) {
      fetchComments();
      fetchAnnotations();
    }
  }, [isAuthorized, revision.id]);

  if (!isAuthorized) {
    return (
      <div
        className="animate-apple-fade-in"
        style={{
          minHeight: "100svh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          padding: 24,
          fontFamily: "var(--font-apple)",
        }}
      >
        <div
          className="animate-apple-scale-in"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-modal)",
            padding: 32,
            maxWidth: 420,
            width: "100%",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--accent)" }}>
            Avlokan
          </span>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-primary)", margin: "8px 0 4px" }}>
            You've been asked to review this
          </h2>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", margin: "0 0 20px" }}>
            Enter your email to open this revision. This link is unique to you and will expire.
          </p>
          <Form method="post">
            <input type="hidden" name="_action" value="authorize" />

            {actionData?.errors?.form && (
              <div
                style={{
                  marginBottom: 16,
                  padding: 10,
                  background: "rgba(255, 69, 58, 0.1)",
                  border: "1px solid rgba(255, 69, 58, 0.25)",
                  color: "var(--danger)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                }}
              >
                {actionData.errors.form}
              </div>
            )}

            <input
              type="email"
              name="email"
              placeholder="you@company.com"
              className="apple-input"
              style={{ marginBottom: 16 }}
              required
              disabled={navigation.state === "submitting"}
            />
            <button
              type="submit"
              disabled={navigation.state === "submitting"}
              className="apple-btn-primary"
              style={{ width: "100%" }}
            >
              {navigation.state === "submitting"
                ? "Authenticating…"
                : "Access Revision"}
            </button>
          </Form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100svh", background: "var(--bg)", fontFamily: "var(--font-apple)" }}>
      <div style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 24px" }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--accent)" }}>
            Avlokan
          </span>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: "4px 0 0" }}>
            {revision.title}
          </h1>
          {revision.description && (
            <div
              className="prose max-w-none mt-2"
              style={{ fontSize: 14, color: "var(--text-secondary)" }}
              dangerouslySetInnerHTML={{ __html: revision.description }}
            />
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px" }}>
        <div className="flex flex-col lg:flex-row lg:gap-6">
          <div className="lg:w-2/3">
            {revision.video && (
              <div
                className="sticky top-6"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "var(--shadow-card)",
                  padding: 8,
                }}
              >
                <div className="relative" ref={containerRef}>
                  <video
                    ref={videoRef}
                    src={pb.files.getURL(revision, revision.video)}
                    controls
                    className="w-full rounded-md"
                    style={{ position: 'relative', zIndex: 1 }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      zIndex: 10,
                      pointerEvents: isAnnotating ? 'auto' : 'none',
                    }}
                  >
                    <canvas ref={canvasRef} />
                  </div>

                  {/* Annotation Toolbar */}
                  {isAnnotating && (
                    <AnnotationToolbar
                      annotationTool={annotationTool}
                      setAnnotationTool={setAnnotationTool}
                      brushColor={brushColor}
                      setBrushColor={setBrushColor}
                      brushSize={brushSize}
                      setBrushSize={setBrushSize}
                      annotationDuration={annotationDuration}
                      setAnnotationDuration={setAnnotationDuration}
                      onSave={saveAnnotation}
                      onClear={clearCurrentAnnotations}
                      onUndo={undo}
                      onRedo={redo}
                      canUndo={canUndo}
                      canRedo={canRedo}
                    />
                  )}

                  {/* Annotation Toggle Button */}
                  <button
                    onClick={toggleAnnotating}
                    className="absolute top-4 right-4 z-20"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "9px 16px",
                      borderRadius: "var(--radius-pill)",
                      border: isAnnotating ? "1px solid var(--danger)" : "none",
                      background: isAnnotating ? "rgba(255, 69, 58, 0.12)" : "var(--accent)",
                      color: isAnnotating ? "var(--danger)" : "#fff",
                      fontFamily: "var(--font-apple)",
                      fontSize: 14,
                      fontWeight: 500,
                      letterSpacing: "-0.01em",
                      boxShadow: isAnnotating ? "none" : "var(--shadow-card)",
                      cursor: "pointer",
                      transition: "var(--transition)",
                    }}
                  >
                    {isAnnotating ? 'Exit Annotation' : 'Annotate'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:w-1/3 mt-6 lg:mt-0">
            <div
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-card)",
                overflow: "hidden",
              }}
            >
              <CommentsPanel
                comments={comments}
                isAnnotating={isAnnotating}
                currentAnnotation={currentAnnotation}
                showCommandPalette={showCommandPalette}
                filteredCommands={filteredCommands}
                selectedCommandIndex={selectedCommandIndex}
                timestampPills={timestampPills}
                commentText={commentText}
                timeRangeDuration={timeRangeDuration}
                onTimeRangeDurationChange={setTimeRangeDuration}
                onSeekToTimestamp={seekToTimestamp}
                onExecuteCommand={executeCommand}
                onRemovePill={removePill}
                onEditorChange={handleEditorChange}
                onEditorMount={handleEditorMount}
                onSubmit={handleSubmit}
                // @Mentions
                showMentionSuggestions={showMentionSuggestions}
                filteredUsers={filteredUsers}
                selectedMentionIndex={selectedMentionIndex}
                onSelectMention={selectMention}
                // Threading
                replyingTo={replyingTo}
                onReply={setReplyingTo}
                onCancelReply={cancelReply}
                // Tasks
                tasks={tasks}
                onUpdateTaskStatus={updateTaskStatus}
                // Assign dropdown
                showAssignDropdown={showAssignDropdown}
                assignFilteredUsers={assignFilteredUsers}
                selectedAssignIndex={selectedAssignIndex}
                onAssignTask={handleAssignTask}
                onCloseAssignDropdown={() => setShowAssignDropdown(false)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
