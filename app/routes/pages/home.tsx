export const handle = { protected: true };
import React, { useEffect, useState } from "react";
import type { RecordModel } from "pocketbase";
import AssetCard from "../components/AssetCard/AssetCard";
import type { AssetRevision } from "../types";
import Header from "../components/Header/Header";
import RevisionForm from "../components/RevisionForm/RevisionForm";
import RevisionCompare from "../components/RevisionCompare/RevisionCompare";
import AssetTimeline from "../components/AssetTimeline/AssetTimeline";
import { useAuth } from "../contexts/AuthContext";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

function stripMarkdown(md?: string) {
  if (!md) return "";
  return (
    md
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/`{1,3}([^`]*)`{1,3}/g, "$1")
      .replace(/^#+\s?/gm, "")
      .replace(/^>\s?/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/[_*~]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function avatarUrl(pb: any, collectionName: string, recordId: string, filename?: string) {
  if (!filename) return "";
  return `${pb.baseUrl}/api/files/${collectionName}/${recordId}/${filename}`;
}

function initials(name = "") {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

// ── Reusable section heading ──
const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2
    style={{
      fontSize: 22,
      fontWeight: 700,
      letterSpacing: "-0.03em",
      color: "var(--text-primary)",
      marginBottom: 16,
      fontFamily: "var(--font-apple)",
    }}
  >
    {children}
  </h2>
);

const Home: React.FC = () => {
  const { pb } = useAuth();

  const [clients, setClients] = useState<RecordModel[]>([]);
  const [projects, setProjects] = useState<RecordModel[]>([]);
  const [assets, setAssets] = useState<RecordModel[]>([]);

  const [selectedClient, setSelectedClient] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedAsset, setSelectedAsset] = useState("");

  const [revisions, setRevisions] = useState<AssetRevision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const [openClientModal, setOpenClientModal] = useState<RecordModel | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await pb.collection("clients").getFullList({ expand: "client_projects" });
        setClients(res);
      } catch (err) {
        console.error("Error fetching clients:", err);
      }
    };
    fetchClients();
  }, [pb]);

  useEffect(() => {
    setSelectedProject("");
    setSelectedAsset("");
    setProjects([]);
    setAssets([]);
    setRevisions([]);

    if (!selectedClient) return;

    const client = clients.find((c) => c.id === selectedClient);
    const expanded = (client?.expand?.client_projects as any) ?? [];
    setProjects(expanded);
  }, [selectedClient, clients]);

  useEffect(() => {
    setSelectedAsset("");
    setAssets([]);
    setRevisions([]);

    if (!selectedProject) return;

    const fetchProjectWithAssets = async () => {
      try {
        const project = await pb.collection("projects").getOne(selectedProject, { expand: "project_assets" });
        const expandedAssets = project?.expand?.project_assets ?? [];
        setAssets(expandedAssets);
      } catch (err) {
        console.error("Error fetching project assets:", err);
      }
    };

    fetchProjectWithAssets();
  }, [selectedProject, pb]);

  useEffect(() => {
    setRevisions([]);
    setError(null);

    const fetchRevisions = async () => {
      if (!selectedAsset) return;
      setLoading(true);
      try {
        const asset = await pb.collection("assets").getOne(selectedAsset, { expand: "revision_assets" });
        const expandedAssetRevisions = asset?.expand?.revision_assets ?? [];
        setRevisions(expandedAssetRevisions);
      } catch (err) {
        console.error("Error fetching revisions:", err);
        setError("Failed to load asset revisions.");
      } finally {
        setLoading(false);
      }
    };

    fetchRevisions();
  }, [selectedAsset, pb]);

  const handleUploadSuccess = () => {
    setIsFormOpen(false);
    const currentAsset = selectedAsset;
    setSelectedAsset("");
    setTimeout(() => setSelectedAsset(currentAsset), 0);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--font-apple)" }}>
      <Header />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px", display: "flex", flexDirection: "column", gap: 56 }}>

        {/* ── Clients ── */}
        <section>
          <SectionHeading>Clients</SectionHeading>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {clients.map((client) => {
              const isSelected = selectedClient === client.id;
              const previewText = stripMarkdown((client as any).description ?? "");
              const avatar = (client as any).avatar;
              const avatarSrc = avatar ? avatarUrl(pb, "clients", client.id, avatar) : "";

              return (
                <div
                  key={client.id}
                  onClick={() => setSelectedClient(client.id)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 16,
                    padding: "18px 20px",
                    borderRadius: "var(--radius-lg)",
                    cursor: "pointer",
                    background: isSelected ? "rgba(0,113,227,0.07)" : "var(--bg-elevated)",
                    border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                    boxShadow: isSelected ? "0 0 0 3px rgba(0,113,227,0.12)" : "var(--shadow-card)",
                    transition: "var(--transition)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-hover)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = isSelected
                      ? "0 0 0 3px rgba(0,113,227,0.12)"
                      : "var(--shadow-card)";
                  }}
                >
                  {/* Avatar */}
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={client.name}
                      style={{
                        width: 64,
                        height: 64,
                        objectFit: "cover",
                        borderRadius: 12,
                        flexShrink: 0,
                        border: "1px solid var(--border)",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 12,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: isSelected ? "var(--accent)" : "var(--bg)",
                        color: isSelected ? "#fff" : "var(--text-secondary)",
                        fontSize: 20,
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {initials(client.name as string)}
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
                        {client.name}
                      </h3>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenClientModal(client); }}
                        style={{
                          flexShrink: 0,
                          fontSize: 12,
                          fontWeight: 500,
                          color: "var(--accent)",
                          background: "rgba(0,113,227,0.08)",
                          border: "none",
                          borderRadius: "var(--radius-pill)",
                          padding: "5px 12px",
                          cursor: "pointer",
                          transition: "var(--transition)",
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(0,113,227,0.15)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(0,113,227,0.08)")}
                        aria-label={`View ${client.name} description`}
                      >
                        View
                      </button>
                    </div>
                    <p style={{
                      marginTop: 6,
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as const,
                      lineHeight: "1.5",
                    }}>
                      {previewText || "No description"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Projects ── */}
        {projects.length > 0 && (
          <section>
            <SectionHeading>Projects</SectionHeading>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
              {projects.map((project) => {
                const isSelected = selectedProject === project.id;
                return (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProject(project.id)}
                    style={{
                      flexShrink: 0,
                      width: 220,
                      padding: "16px 18px",
                      borderRadius: "var(--radius-lg)",
                      cursor: "pointer",
                      background: isSelected ? "rgba(0,113,227,0.07)" : "var(--bg-elevated)",
                      border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                      boxShadow: isSelected ? "0 0 0 3px rgba(0,113,227,0.12)" : "var(--shadow-card)",
                      transition: "var(--transition)",
                    }}
                  >
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px", letterSpacing: "-0.01em" }}>
                      {project.name}
                    </h3>
                    {project.description && (
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: "1.4", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const }}>
                        {stripMarkdown(project.description)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Assets ── */}
        {assets.length > 0 && (
          <section>
            <SectionHeading>Assets</SectionHeading>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {assets.map((asset) => {
                const isSelected = selectedAsset === asset.id;
                return (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset.id)}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "var(--radius-pill)",
                      border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                      background: isSelected ? "var(--accent)" : "var(--bg-elevated)",
                      color: isSelected ? "#fff" : "var(--text-primary)",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                      boxShadow: "var(--shadow-card)",
                      transition: "var(--transition)",
                      fontFamily: "var(--font-apple)",
                    }}
                  >
                    {asset.name}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Revisions ── */}
        <section>
          {loading && (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "2.5px solid var(--border)",
                borderTopColor: "var(--accent)",
                animation: "spin 0.7s linear infinite",
                margin: "0 auto 12px",
              }} />
              <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Loading revisions…</p>
            </div>
          )}

          {error && (
            <p style={{ color: "var(--danger)", textAlign: "center", fontSize: 14 }}>{error}</p>
          )}

          {!loading && !error && selectedAsset && revisions.length === 0 && (
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <p style={{ color: "var(--text-secondary)", marginBottom: 20, fontSize: 15 }}>
                No revisions for this asset yet.
              </p>
              <button className="apple-btn-primary" onClick={() => setIsFormOpen(true)}>
                Upload First Revision
              </button>
            </div>
          )}

          {!loading && revisions.length > 0 && (
            <>
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <SectionHeading>Revisions</SectionHeading>
                  <button
                    onClick={() => setShowTimeline(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: "var(--radius-pill)",
                      border: "1.5px solid var(--border)",
                      background: "var(--bg-elevated)",
                      color: "var(--text-secondary)",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      boxShadow: "var(--shadow-card)",
                      transition: "var(--transition)",
                      fontFamily: "var(--font-apple)",
                    }}
                  >
                    <span>⏱</span>
                    <span>Timeline</span>
                  </button>
                </div>

                {revisions.length >= 2 && (
                  <button
                    onClick={() => { setCompareMode(!compareMode); setSelectedForCompare([]); }}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "var(--radius-pill)",
                      border: `1.5px solid ${compareMode ? "var(--danger)" : "var(--accent)"}`,
                      background: compareMode ? "rgba(255,69,58,0.08)" : "rgba(0,113,227,0.08)",
                      color: compareMode ? "var(--danger)" : "var(--accent)",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "var(--transition)",
                      fontFamily: "var(--font-apple)",
                    }}
                  >
                    {compareMode ? "✕ Cancel Compare" : "Compare Revisions"}
                  </button>
                )}
              </div>

              {compareMode && (
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
                  Select exactly 2 revisions to compare ({selectedForCompare.length}/2 selected)
                </p>
              )}

              <div
                style={{
                  display: "grid",
                  gap: 20,
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                }}
              >
                {revisions.map((revision) => {
                  const isSelectedForCompare = selectedForCompare.includes(revision.id);
                  return (
                    <div key={revision.id} style={{ position: "relative" }}>
                      {compareMode && (
                        <div
                          onClick={() => {
                            setSelectedForCompare((prev) => {
                              if (prev.includes(revision.id)) return prev.filter((id) => id !== revision.id);
                              if (prev.length >= 2) return prev;
                              return [...prev, revision.id];
                            });
                          }}
                          style={{
                            position: "absolute",
                            inset: 0,
                            zIndex: 10,
                            borderRadius: "var(--radius-lg)",
                            cursor: "pointer",
                            border: `3px solid ${isSelectedForCompare ? "var(--accent)" : "transparent"}`,
                            background: isSelectedForCompare ? "rgba(0,113,227,0.08)" : "transparent",
                            transition: "var(--transition)",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              top: 12,
                              right: 12,
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              border: `2px solid ${isSelectedForCompare ? "var(--accent)" : "var(--border)"}`,
                              background: isSelectedForCompare ? "var(--accent)" : "var(--bg-elevated)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {isSelectedForCompare && (
                              <svg width="12" height="12" fill="#fff" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                      )}
                      <AssetCard revision={revision} />
                    </div>
                  );
                })}
              </div>

              {/* Compare floating CTA */}
              {compareMode && selectedForCompare.length === 2 && (
                <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 40 }}>
                  <button
                    onClick={() => setShowComparison(true)}
                    className="apple-btn-primary"
                    style={{ padding: "14px 36px", fontSize: 16, boxShadow: "0 8px 32px rgba(0,113,227,0.35)" }}
                  >
                    Compare Selected
                  </button>
                </div>
              )}

              {/* Upload button */}
              <div style={{ textAlign: "center", marginTop: 40 }}>
                <button className="apple-btn-secondary" onClick={() => setIsFormOpen(true)}>
                  Upload New Revision
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      {/* ── Client description modal ── */}
      {openClientModal && (
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
            padding: 24,
          }}
          onClick={() => setOpenClientModal(null)}
        >
          <div
            className="animate-apple-scale-in"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-elevated)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-modal)",
              border: "1px solid var(--border)",
              width: "100%",
              maxWidth: 640,
              maxHeight: "80vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                padding: "28px 28px 20px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
                  {openClientModal.name}
                </h3>
                <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
                  {openClientModal.id}
                </p>
              </div>
              <button
                onClick={() => setOpenClientModal(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "none",
                  background: "var(--bg)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
              <div
                style={{ color: "var(--text-secondary)", fontSize: 15, lineHeight: "1.7" }}
                className="prose dark:prose-invert max-w-none"
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, rehypeSanitize]}
                >
                  {(openClientModal as any).description || "No description."}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <RevisionForm
          assetId={selectedAsset}
          onClose={() => setIsFormOpen(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* Revision Comparison Modal */}
      {showComparison && selectedForCompare.length === 2 && (() => {
        const revA = revisions.find((r) => r.id === selectedForCompare[0]);
        const revB = revisions.find((r) => r.id === selectedForCompare[1]);
        if (!revA || !revB) return null;
        return (
          <RevisionCompare
            revisionA={revA}
            revisionB={revB}
            videoUrlA={revA.video ? pb.files.getURL(revA, revA.video) : ""}
            videoUrlB={revB.video ? pb.files.getURL(revB, revB.video) : ""}
            onClose={() => { setShowComparison(false); setCompareMode(false); setSelectedForCompare([]); }}
          />
        );
      })()}

      {/* Asset Timeline Modal */}
      {showTimeline && selectedAsset && (
        <AssetTimeline
          asset={assets.find((a) => a.id === selectedAsset)}
          revisions={revisions}
          onClose={() => setShowTimeline(false)}
        />
      )}

      {/* Loading spinner keyframe inline */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Home;
