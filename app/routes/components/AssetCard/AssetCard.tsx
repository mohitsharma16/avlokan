import React, { useState, useEffect, useRef } from "react";
import PocketBase, { type RecordModel } from "pocketbase";
import type { AssetRevision } from "../../types";
import { useAuth } from "../../contexts/AuthContext";

const pb = new PocketBase("http://127.0.0.1:8090");

interface Comment {
  id: string;
  name: string;
  timestamp: string;
  text: string;
  revisionId: string;
  created: string;
}

interface AssetCardProps {
  revision: AssetRevision;
}

function generateShareLink(revisionId: string): string {
  const expires = Date.now() + 60 * 60 * 1000; // 1 hour
  const token = crypto.randomUUID();
  return `http://localhost:5173/revision/${revisionId}?token=${token}&expires=${expires}`;
}

const AssetCard: React.FC<AssetCardProps> = ({ revision }: any) => {
  const videoUrl = revision.video
    ? pb.files.getURL(revision, revision.video)
    : "";
  const videoRef = useRef<HTMLVideoElement>(null);

  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [capturedTimestamp, setCapturedTimestamp] = useState<string | null>(
    null
  );

  useEffect(() => {
    const fetchComments = async () => {
      if (!revision.id) return;
      try {
        const res: RecordModel[] = await pb.collection("comments").getFullList({
          filter: `revisionId = "${revision.id}"`,
          sort: "created",
        });
        const mapped: Comment[] = res.map((r: any) => ({
          id: r.id,
          name: r.name,
          timestamp: r.timestamp,
          text: r.text,
          revisionId: r.revisionId,
          created: r.created,
        }));
        setComments(mapped);
      } catch (error) {
        console.error("Error fetching comments:", error);
      }
    };
    if (showModal) {
      fetchComments();
    }
  }, [showModal, revision.id]);

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
    if (e.key === "$") {
      e.preventDefault();
      if (videoRef.current) {
        const currentTime = videoRef.current.currentTime;
        const formattedTime = formatTime(currentTime);
        const timeTag = `@${formattedTime} `;

        setCapturedTimestamp(formattedTime);

        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newText =
          commentText.substring(0, start) +
          timeTag +
          commentText.substring(end);

        setCommentText(newText);
      }
    }
  };

  const handleSubmit = async () => {
    const commenterName = user?.name || user?.email;

    if (!commenterName || !commentText.trim()) {
      alert(
        "Cannot post comment: User name is missing or comment text is empty."
      );
      return;
    }

    try {
      const newComment = {
        name: commenterName,
        timestamp: capturedTimestamp || "",
        text: commentText,
        revisionId: revision.id,
      };

      const created: RecordModel = await pb
        .collection("comments")
        .create(newComment);

      const saved: Comment = {
        id: created.id,
        name: created.name,
        timestamp: created.timestamp,
        text: created.text,
        revisionId: created.revisionId,
        created: created.created,
      };
      setComments((prev) => [...prev, saved]);

      setCommentText("");
      setCapturedTimestamp(null);
    } catch (error: any) {
      console.error("Error saving comment:", error);
      alert(`Failed to post comment. Error: ${error.message}`);
    }
  };

  const seekToTimestamp = (ts: string) => {
    const parts = ts.split(":").map(Number);
    const seconds =
      parts.length === 3
        ? parts[0] * 3600 + parts[1] * 60 + parts[2]
        : parts.length === 2
        ? parts[0] * 60 + parts[1]
        : parts[0];
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = generateShareLink(revision.id);
    navigator.clipboard.writeText(link);
    alert("Share link copied to clipboard!");
  };

  return (
    <>
      <div
        className="rounded-2xl shadow-lg overflow-hidden bg-white max-w-md mx-auto border border-gray-200 transition-transform hover:scale-[1.01] cursor-pointer"
        onClick={() => setShowModal(true)}
      >
        <div className="w-full aspect-video bg-gray-100">
          {videoUrl && (
            <video
              src={videoUrl}
              controls
              className="w-full h-full object-cover rounded-t-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
        <div className="p-5 space-y-2">
          {revision.title && (
            <h3 className="text-xl font-bold text-gray-900">
              {revision.title}
            </h3>
          )}
          {!!revision.description && (
            <div
              className="text-gray-700 text-sm leading-relaxed prose max-w-none"
              dangerouslySetInnerHTML={{ __html: revision.description }}
            />
          )}
          <div className="pt-2">
            <button
              onClick={handleShareClick}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Share
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center">
          <div className="relative bg-white w-full h-full flex">
            <div className="flex-1 bg-black">
              {videoUrl && (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <div className="w-96 bg-white border-l border-gray-200 p-4 flex flex-col">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-lg font-semibold">
                  Comments ({comments.length})
                </h2>
                <button
                  className="text-sm text-red-500 hover:underline"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {comments.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No comments yet.</p>
                  </div>
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
                                onClick={() =>
                                  seekToTimestamp(comment.timestamp)
                                }
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

              <div className="mt-4 space-y-2 border-t pt-4">
                <textarea
                  rows={4}
                  className="w-full border px-2 py-1 rounded-md"
                  placeholder="Write your comment... (Press # to tag time)"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={handleCommentKeyDown}
                />
                <button
                  className="bg-green-600 text-white px-3 py-1 rounded w-full"
                  onClick={handleSubmit}
                >
                  Post Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AssetCard;
