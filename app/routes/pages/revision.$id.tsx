export const handle = { public: true };

import { useEffect, useRef, useState } from "react";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  redirect,
} from "react-router-dom";
import PocketBase from "pocketbase";
import type { LoaderData, Revision } from "../types";

const pb = new PocketBase("http://127.0.0.1:8090");
interface ActionData {
  errors?: {
    form?: string;
    name?: string;
    timestamp?: string;
    text?: string;
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
    const comments = await pb.collection("comments").getFullList<Comment>({
      filter: `revisionId = "${revisionId}"`,
      sort: "created",
      requestKey: null,
    });

    return { revision, comments, revisionId };
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
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const formData = await request.formData();
  const submissionType = formData.get("_action");
  const revisionId = params.id;

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

  if (submissionType === "createComment") {
    const newComment = {
      name: formData.get("name") as string,
      timestamp: formData.get("timestamp") as string,
      text: formData.get("text") as string,
      revisionId: revisionId,
    };

    const errors: ActionData["errors"] = {};
    if (!newComment.name.trim()) errors.name = "Name is required.";
    if (!newComment.text.trim()) errors.text = "Comment text cannot be empty.";
    if (newComment.timestamp && !/^\d{2}:\d{2}$/.test(newComment.timestamp)) {
      errors.timestamp = "Invalid timestamp format.";
    }

    if (Object.keys(errors).length > 0) {
      return { errors, isAuthorized: true, userEmail: newComment.name };
    }

    try {
      await pb.collection("comments").create(newComment, { requestKey: null });
      return redirect(request.url);
    } catch (error) {
      console.error("Action Error - Failed to create comment:", error);
      return {
        errors: { form: "Failed to post comment. Please try again." },
        isAuthorized: true,
        userEmail: newComment.name,
      };
    }
  }

  return { errors: { form: "Invalid form submission." } };
}
export default function RevisionViewer() {
  const { revision, comments } = useLoaderData() as LoaderData;
  const actionData = useActionData() as ActionData | undefined;
  const navigation = useNavigation();

  const videoRef = useRef<HTMLVideoElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const [capturedTimestamp, setCapturedTimestamp] = useState<string | null>(
    null
  );
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    if (actionData?.isAuthorized && actionData.userEmail) {
      const name = actionData.userEmail.split("@")[0];
      setIsAuthorized(true);
      setReviewerName(name);
      sessionStorage.setItem("isAuthorized", "true");
      sessionStorage.setItem("reviewerName", name);
    }
  }, [actionData]);

  useEffect(() => {
    const formData = navigation.formData;
    const isSuccessfulComment =
      navigation.state === "idle" &&
      formData &&
      formData.get("_action") === "createComment" &&
      !actionData?.errors;

    if (isSuccessfulComment) {
      setCommentText("");
      setCapturedTimestamp(null);
    }
  }, [navigation, actionData]);

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(timeInSeconds % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const handleCommentKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === "#") {
      e.preventDefault();
      if (videoRef.current) {
        const currentTime = videoRef.current.currentTime;
        const formattedTime = formatTime(currentTime);
        setCapturedTimestamp(formattedTime);
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newText =
          commentText.substring(0, start) +
          `@${formattedTime} ` +
          commentText.substring(end);
        setCommentText(newText);
      }
    }
  };

  const seekToTimestamp = (ts: string) => {
    const parts = ts.split(":").map(Number);
    const seconds = parts.reduce(
      (acc, val, index) => acc + val * Math.pow(60, parts.length - 1 - index),
      0
    );
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(console.error);
    }
  };

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
                <video
                  ref={videoRef}
                  src={pb.files.getURL(revision, revision.video)}
                  controls
                  className="w-full rounded-md"
                />
              </div>
            )}
          </div>

          <div className="lg:w-1/3 space-y-6 flex flex-col mt-6 lg:mt-0">
            <div className="bg-white rounded-lg shadow-sm p-6 flex-grow">
              <h3 className="text-lg font-semibold mb-4">
                Comments ({comments.length})
              </h3>
              {comments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No comments yet.
                </p>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="border border-gray-200 p-3 rounded-md"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-900 text-sm">
                            {comment.name}
                          </span>
                          {comment.timestamp && (
                            <button
                              onClick={() => seekToTimestamp(comment.timestamp)}
                              className="text-blue-600 hover:text-blue-800 underline font-mono text-sm"
                            >
                              {comment.timestamp}
                            </button>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(comment.created).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap text-sm">
                        {comment.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Add Comment</h3>
              <Form method="post">
                <input type="hidden" name="_action" value="createComment" />
                <input
                  type="hidden"
                  name="timestamp"
                  value={capturedTimestamp || ""}
                />
                <div className="space-y-4">
                  <div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={reviewerName || ""}
                      readOnly
                      className="border border-gray-300 px-3 py-2 rounded-md w-full bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="text"
                      className="block text-sm font-medium text-gray-600 mb-1"
                    >
                      Comment (Press # to tag time)
                    </label>
                    <textarea
                      ref={textareaRef}
                      id="text"
                      name="text"
                      placeholder="Write your comment..."
                      rows={4}
                      required
                      className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={handleCommentKeyDown}
                    />
                    {actionData?.errors?.text && (
                      <p className="text-red-500 text-sm mt-1">
                        {actionData.errors.text}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={navigation.state === "submitting"}
                  className="mt-4 w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors font-semibold"
                >
                  {navigation.state === "submitting"
                    ? "Submitting..."
                    : "Submit"}
                </button>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
