import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

interface RevisionFormProps {
  assetId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const RevisionForm: React.FC<RevisionFormProps> = ({ assetId, onClose, onSuccess }) => {
  const { pb } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [video, setVideo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !video || !assetId) return;

    setLoading(true);
    try {
      const asset = await pb.collection("assets").getOne(assetId, { expand: "revision_assets" });
      const revisions = asset?.expand?.revision_assets ?? [];
      const nextVersion = revisions.length > 0
        ? Math.max(...revisions.map((r: any) => r.versionNumber || 0)) + 1
        : 1;

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("video", video);
      formData.append("asset", assetId);
      formData.append("versionNumber", nextVersion.toString());

      const newRevision = await pb.collection("assets_revision").create(formData);
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
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        padding: 24,
        fontFamily: "var(--font-apple)",
      }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="animate-apple-scale-in"
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-modal)",
          padding: "36px 32px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: 0 }}>
            Upload Revision
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: "none",
              background: "var(--bg)",
              color: "var(--text-secondary)",
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>Title</label>
          <input
            type="text"
            placeholder="e.g. Final Cut v2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="apple-input"
          />
        </div>

        {/* Description */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>
            Description <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            placeholder="What changed in this revision?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="apple-input"
            style={{ resize: "vertical" }}
          />
        </div>

        {/* File upload */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>Video file</label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "16px",
              borderRadius: "var(--radius-md)",
              border: `2px dashed ${video ? "var(--accent)" : "var(--border)"}`,
              background: video ? "rgba(0,113,227,0.04)" : "transparent",
              cursor: "pointer",
              transition: "var(--transition)",
            }}
          >
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideo(e.target.files?.[0] || null)}
              required
              style={{ display: "none" }}
            />
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: "var(--accent)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span style={{ fontSize: 13, color: video ? "var(--accent)" : "var(--text-secondary)" }}>
              {video ? video.name : "Click to select video…"}
            </span>
          </label>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "9px 20px",
              borderRadius: "var(--radius-pill)",
              border: "1.5px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              transition: "var(--transition)",
              fontFamily: "var(--font-apple)",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="apple-btn-primary"
            style={{ padding: "9px 24px", fontSize: 14 }}
          >
            {loading ? "Uploading…" : "Upload"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RevisionForm;
