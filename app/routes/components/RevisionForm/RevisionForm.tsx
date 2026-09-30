import React, { useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Modal } from "../design";

interface RevisionFormProps {
  assetId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const RevisionForm: React.FC<RevisionFormProps> = ({ assetId, onClose, onSuccess }) => {
  const { pb } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [video, setVideo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const pickFile = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("That doesn't look like a video file.");
      return;
    }
    setError(null);
    setVideo(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !video || !assetId) return;

    setLoading(true);
    setError(null);
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
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !!title && !!video && !loading;

  return (
    <Modal open onClose={loading ? () => {} : onClose} title="New revision" maxWidth={520}>
      <form onSubmit={handleSubmit} style={{ padding: "26px 28px 24px", fontFamily: "var(--font-sans)" }}>
        <p className="av-eyebrow" style={{ margin: 0, fontSize: 11 }}>New revision</p>
        <h2 style={{ fontSize: 22, fontWeight: 650, letterSpacing: "-0.03em", margin: "6px 0 22px" }}>Upload the next version</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Drop zone */}
          <div>
            <span className="av-label">Video</span>
            <div
              role="button" tabIndex={0} aria-label="Choose a video file"
              onClick={() => fileInput.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), fileInput.current?.click())}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]); }}
              style={{ cursor: "pointer", padding: video ? "14px 16px" : "28px 16px", textAlign: video ? "left" : "center", borderRadius: "var(--av-radius-md)", border: `1.5px dashed ${dragging ? "var(--color-accent)" : "var(--color-border-strong)"}`, background: dragging ? "color-mix(in srgb, var(--color-accent) 7%, transparent)" : "var(--color-bg-secondary)", transition: "var(--transition)" }}
            >
              {video ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span aria-hidden style={{ width: 36, height: 36, borderRadius: "var(--av-radius-sm)", background: "var(--color-bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-accent-text)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M10 9.5v5l4.5-2.5z" /></svg>
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 550, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{video.name}</span>
                    <span className="av-mono" style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{formatBytes(video.size)} · click to replace</span>
                  </span>
                </div>
              ) : (
                <>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 550 }}>Drop a video here, or <span style={{ color: "var(--color-accent-text)" }}>browse</span></p>
                  <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--color-text-tertiary)" }}>MP4, MOV or WebM</p>
                </>
              )}
              <input ref={fileInput} type="file" accept="video/*" required={!video} onChange={(e) => pickFile(e.target.files?.[0])} style={{ display: "none" }} />
            </div>
          </div>

          <div>
            <label className="av-label" htmlFor="rev-title">Title</label>
            <input id="rev-title" className="av-input" type="text" placeholder="e.g. Colour-graded cut" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div>
            <label className="av-label" htmlFor="rev-desc">Notes <span style={{ color: "var(--color-text-tertiary)", fontWeight: 400 }}>(optional)</span></label>
            <textarea id="rev-desc" className="av-input" rows={3} placeholder="What changed in this version?" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {error && (
            <p role="alert" style={{ margin: 0, padding: "10px 14px", borderRadius: "var(--av-radius-md)", fontSize: 13, color: "var(--color-danger)", background: "color-mix(in srgb, var(--color-danger) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--color-danger) 28%, transparent)" }}>{error}</p>
          )}

          {loading && (
            <div role="status" aria-label="Uploading" style={{ height: 3, borderRadius: 3, background: "var(--color-bg-tertiary)", overflow: "hidden" }}>
              <div className="av-skeleton" style={{ height: "100%", borderRadius: 3, background: "linear-gradient(100deg, var(--color-accent) 30%, var(--color-accent-soft) 50%, var(--color-accent) 70%)", backgroundSize: "200% 100%" }} />
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
          <button type="button" className="av-btn av-btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" className="av-btn av-btn-primary" disabled={!canSubmit}>{loading ? "Uploading…" : "Upload revision"}</button>
        </div>
      </form>
    </Modal>
  );
};

export default RevisionForm;
