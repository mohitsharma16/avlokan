export const handle = { public: true };

import { useEffect, useRef, useState } from "react";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router-dom";
import PocketBase from "pocketbase";
import type { LoaderData, Revision } from "../types";
import { useCommentEditor } from "../components/AssetCard/useCommentEditor";
import { useAnnotations } from "../components/AssetCard/useAnnotations";
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
  } = useCommentEditor({
    pb,
    revision,
    user: reviewerName ? { name: reviewerName, email: reviewerName } : null,
    videoRef,
    showModal: isAuthorized,
  });

  // Fetch comments and annotations when authorized
  useEffect(() => {
    if (isAuthorized && revision.id) {
      fetchComments();
      fetchAnnotations();
    }
  }, [isAuthorized, revision.id]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Enter your email to view the revision
          </h2>
          <Form method="post">
            <input type="hidden" name="_action" value="authorize" />

            {actionData?.errors?.form && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                {actionData.errors.form}
              </div>
            )}

            <input
              type="email"
              name="email"
              placeholder="Email address"
              className="border border-gray-300 px-3 py-2 rounded-md mb-4 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={navigation.state === "submitting"}
            />
            <button
              type="submit"
              disabled={navigation.state === "submitting"}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md w-full transition-colors font-semibold"
            >
              {navigation.state === "submitting"
                ? "Authenticating..."
                : "Access Revision"}
            </button>
          </Form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">{revision.title}</h1>
          {revision.description && (
            <div
              className="prose max-w-none text-gray-700 mt-2"
              dangerouslySetInnerHTML={{ __html: revision.description }}
            />
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex flex-col lg:flex-row lg:gap-8">
          <div className="lg:w-2/3">
            {revision.video && (
              <div className="bg-white rounded-lg shadow-sm p-2 sticky top-6">
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
                    />
                  )}

                  {/* Annotation Toggle Button */}
                  <button
                    onClick={toggleAnnotating}
                    className={`absolute top-4 right-4 px-4 py-2 rounded-lg font-medium transition-colors z-20 ${isAnnotating
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                  >
                    {isAnnotating ? 'Exit Annotation' : 'Annotate'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:w-1/3 mt-6 lg:mt-0">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
