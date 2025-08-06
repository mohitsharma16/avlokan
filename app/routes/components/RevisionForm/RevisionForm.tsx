import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

interface RevisionFormProps {
  assetId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const RevisionForm: React.FC<RevisionFormProps> = ({
  assetId,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [video, setVideo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { pb } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !video || !assetId) return;

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("video", video);
    formData.append("asset", assetId);

    setLoading(true);
    try {
      const newRevision = await pb
        .collection("assets_revision")
        .create(formData);
      const asset = await pb.collection("assets").getOne(assetId);
      const existingRevisions = asset.revision_assets || [];

      await pb.collection("assets").update(assetId, {
        revision_assets: [...existingRevisions, newRevision.id],
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Upload or relation mapping failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-700 bg-opacity-50 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg space-y-4 w-full max-w-md"
      >
        <h2 className="text-xl font-semibold">Upload New Revision</h2>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border p-2 rounded"
          rows={3}
        />
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setVideo(e.target.files?.[0] || null)}
          className="w-full"
          required
        />
        <div className="flex justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:underline"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-gray-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RevisionForm;
