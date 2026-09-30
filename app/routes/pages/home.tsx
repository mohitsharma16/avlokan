export const handle = { protected: true };
import React, { useEffect, useState } from "react";
import type { RecordModel } from "pocketbase";
import AssetCard from "../components/AssetCard/AssetCard";
import type { AssetRevision } from "../types";
import Header from "../components/Header/Header";
import RevisionForm from "../components/RevisionForm/RevisionForm";
import { Modal } from "../components/design";
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

// ── Section heading: index + title + count, actions on the right ──
const Section: React.FC<{ index: string; title: string; count?: number; actions?: React.ReactNode; children: React.ReactNode }> = ({ index, title, count, actions, children }) => (
  <section aria-labelledby={`sec-${title}`} className="av-anim-fade-in">
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
      <span className="av-mono" style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{index}</span>
      <h2 id={`sec-${title}`} style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.025em" }}>{title}</h2>
      {count !== undefined && <span className="av-mono" style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{count}</span>}
      <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{actions}</div>
    </div>
    {children}
  </section>
);

const SkeletonGrid: React.FC = () => (
  <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }} aria-busy="true" aria-label="Loading revisions">
    {[0, 1, 2].map((i) => (
      <div key={i} className="av-surface" style={{ padding: 12 }}>
        <div className="av-skeleton" style={{ aspectRatio: "16/9" }} />
        <div className="av-skeleton" style={{ height: 14, width: "60%", marginTop: 14 }} />
        <div className="av-skeleton" style={{ height: 12, width: "40%", marginTop: 8 }} />
      </div>
    ))}
  </div>
);

const Empty: React.FC<{ title: string; hint: string; action?: React.ReactNode }> = ({ title, hint, action }) => (
  <div style={{ padding: "56px 24px", border: "1px dashed var(--color-border-strong)", borderRadius: "var(--av-radius-lg)", textAlign: "center" }}>
    <p style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>{title}</p>
    <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--color-text-secondary)" }}>{hint}</p>
    {action && <div style={{ marginTop: 20 }}>{action}</div>}
  </div>
);

const selectableStyle = (selected: boolean): React.CSSProperties => ({
  textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer",
  background: selected ? "color-mix(in srgb, var(--color-accent) 7%, var(--color-surface))" : "var(--color-surface)",
  border: `1px solid ${selected ? "var(--color-accent)" : "var(--color-border)"}`,
  boxShadow: selected ? "0 0 0 3px color-mix(in srgb, var(--color-accent) 14%, transparent)" : "none",
});

const Home: React.FC = () => {
  const { pb, user } = useAuth();

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

  const selectedClientRec = clients.find((c) => c.id === selectedClient);
  const selectedProjectRec = projects.find((p) => p.id === selectedProject);
  const selectedAssetRec = assets.find((a) => a.id === selectedAsset);
  const firstName = ((user?.name as string) || (user?.email as string) || "").split(/[ @]/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", fontFamily: "var(--font-sans)" }}>
      <Header context={[selectedClientRec?.name, selectedProjectRec?.name, selectedAssetRec?.name].filter(Boolean) as string[]} />

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 24px 120px", display: "flex", flexDirection: "column", gap: 56 }}>
        <div>
          <p className="av-eyebrow" style={{ marginBottom: 10 }}>Workspace</p>
          <h1 style={{ margin: 0, fontSize: "clamp(30px, 4vw, 44px)", fontWeight: 650, letterSpacing: "-0.04em", lineHeight: 1.05 }}>
            {greeting}{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: 15, color: "var(--color-text-secondary)" }}>
            Pick a client, project and asset to review its revisions.
          </p>
        </div>

        {/* ── Clients ── */}
        <Section index="01" title="Clients" count={clients.length}>
          {clients.length === 0 ? (
            <Empty title="No clients yet." hint="Clients you have access to will show up here." />
          ) : (
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
              {clients.map((client) => {
                const isSelected = selectedClient === client.id;
                const previewText = stripMarkdown((client as any).description ?? "");
                const avatar = (client as any).avatar;
                const avatarSrc = avatar ? avatarUrl(pb, "clients", client.id, avatar) : "";

                return (
                  <div key={client.id} style={{ position: "relative" }}>
                    <button
                      onClick={() => setSelectedClient(client.id)} aria-pressed={isSelected}
                      className="av-surface av-surface-interactive"
                      style={{ ...selectableStyle(isSelected), width: "100%", display: "flex", alignItems: "flex-start", gap: 14, padding: 16, paddingRight: 84, borderRadius: "var(--av-radius-lg)" }}
                    >
                      {avatarSrc ? (
                        <img src={avatarSrc} alt="" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: "var(--av-radius-md)", flexShrink: 0, border: "1px solid var(--color-border)" }} />
                      ) : (
                        <div aria-hidden style={{ width: 52, height: 52, borderRadius: "var(--av-radius-md)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isSelected ? "var(--color-accent)" : "var(--color-bg-tertiary)", color: isSelected ? "var(--color-accent-ink)" : "var(--color-text-secondary)", fontSize: 17, fontWeight: 650, letterSpacing: "-0.02em" }}>
                          {initials(client.name as string)}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.02em" }}>{client.name}</h3>
                        <p style={{ margin: "5px 0 0", fontSize: 13, lineHeight: 1.45, color: "var(--color-text-secondary)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                          {previewText || "No description"}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => setOpenClientModal(client)} className="av-btn av-btn-ghost av-btn-sm"
                      style={{ position: "absolute", top: 12, right: 12 }} aria-label={`View ${client.name} description`}
                    >
                      Details
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ── Projects ── */}
        {projects.length > 0 && (
          <Section index="02" title="Projects" count={projects.length}>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
              {projects.map((project) => {
                const isSelected = selectedProject === project.id;
                return (
                  <button key={project.id} onClick={() => setSelectedProject(project.id)} aria-pressed={isSelected} className="av-surface av-surface-interactive" style={{ ...selectableStyle(isSelected), padding: "16px 18px", borderRadius: "var(--av-radius-lg)" }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em" }}>{project.name}</h3>
                    {project.description && (
                      <p style={{ fontSize: 12.5, color: "var(--color-text-secondary)", margin: "6px 0 0", lineHeight: 1.45, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const }}>
                        {stripMarkdown(project.description)}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {/* ── Assets ── */}
        {assets.length > 0 && (
          <Section index="03" title="Assets" count={assets.length}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} role="group" aria-label="Assets">
              {assets.map((asset) => {
                const isSelected = selectedAsset === asset.id;
                return (
                  <button
                    key={asset.id} onClick={() => setSelectedAsset(asset.id)} aria-pressed={isSelected}
                    className="av-btn"
                    style={{ borderRadius: "var(--av-radius-pill)", height: 36, background: isSelected ? "var(--color-accent)" : "var(--color-surface)", color: isSelected ? "var(--color-accent-ink)" : "var(--color-text-primary)", borderColor: isSelected ? "var(--color-accent)" : "var(--color-border-strong)" }}
                  >
                    {asset.name}
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {/* ── Revisions ── */}
        {(selectedAsset || loading) && (
          <Section
            index="04" title="Revisions" count={loading ? undefined : revisions.length}
            actions={!loading && revisions.length > 0 ? (
              <>
                <button onClick={() => setShowTimeline(true)} className="av-btn av-btn-secondary av-btn-sm">Timeline</button>
                {revisions.length >= 2 && (
                  <button
                    onClick={() => { setCompareMode(!compareMode); setSelectedForCompare([]); }}
                    className={`av-btn av-btn-sm ${compareMode ? "av-btn-danger" : "av-btn-secondary"}`}
                  >
                    {compareMode ? "Cancel compare" : "Compare revisions"}
                  </button>
                )}
                <button className="av-btn av-btn-primary av-btn-sm" onClick={() => setIsFormOpen(true)}>Upload revision</button>
              </>
            ) : undefined}
          >
            {loading && <SkeletonGrid />}

            {error && <p role="alert" style={{ color: "var(--color-danger)", fontSize: 14 }}>{error}</p>}

            {!loading && !error && selectedAsset && revisions.length === 0 && (
              <Empty
                title="No revisions yet."
                hint="Upload the first version to start the review."
                action={<button className="av-btn av-btn-primary" onClick={() => setIsFormOpen(true)}>Upload first revision</button>}
              />
            )}

            {!loading && revisions.length > 0 && (
              <>
                {compareMode && (
                  <p className="av-mono" style={{ fontSize: 12.5, color: "var(--color-text-secondary)", margin: "0 0 20px" }}>
                    Select exactly 2 revisions to compare · {selectedForCompare.length}/2 selected
                  </p>
                )}

                <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                  {revisions.map((revision) => {
                    const isSelectedForCompare = selectedForCompare.includes(revision.id);
                    return (
                      <div key={revision.id} style={{ position: "relative" }}>
                        {compareMode && (
                          <button
                            aria-pressed={isSelectedForCompare} aria-label={`Select revision ${revision.title || revision.version} for comparison`}
                            onClick={() => {
                              setSelectedForCompare((prev) => {
                                if (prev.includes(revision.id)) return prev.filter((id) => id !== revision.id);
                                if (prev.length >= 2) return prev;
                                return [...prev, revision.id];
                              });
                            }}
                            style={{ position: "absolute", inset: 0, zIndex: 10, borderRadius: "var(--av-radius-lg)", cursor: "pointer", border: `2px solid ${isSelectedForCompare ? "var(--color-accent)" : "transparent"}`, background: isSelectedForCompare ? "color-mix(in srgb, var(--color-accent) 8%, transparent)" : "transparent", transition: "var(--transition)" }}
                          >
                            <span aria-hidden style={{ position: "absolute", top: 12, right: 12, width: 24, height: 24, borderRadius: 7, border: `1.5px solid ${isSelectedForCompare ? "var(--color-accent)" : "var(--color-border-strong)"}`, background: isSelectedForCompare ? "var(--color-accent)" : "var(--color-surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {isSelectedForCompare && (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                              )}
                            </span>
                          </button>
                        )}
                        <AssetCard revision={revision} />
                      </div>
                    );
                  })}
                </div>

                {compareMode && selectedForCompare.length === 2 && (
                  <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 40 }}>
                    <button onClick={() => setShowComparison(true)} className="av-btn av-btn-primary av-btn-lg" style={{ boxShadow: "var(--av-shadow-deep)" }}>
                      Compare selected
                    </button>
                  </div>
                )}
              </>
            )}
          </Section>
        )}
      </main>

      {/* ── Client description modal ── */}
      <Modal open={!!openClientModal} onClose={() => setOpenClientModal(null)} title={openClientModal?.name} maxWidth={640}>
        {openClientModal && (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "24px 28px 18px", borderBottom: "1px solid var(--color-border)" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 650, letterSpacing: "-0.03em" }}>{openClientModal.name}</h3>
                <p className="av-mono" style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "4px 0 0" }}>{openClientModal.id}</p>
              </div>
              <button onClick={() => setOpenClientModal(null)} className="av-btn av-btn-icon" aria-label="Close" data-tip="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            <div style={{ padding: "22px 28px 28px" }}>
              <div style={{ color: "var(--color-text-secondary)", fontSize: 15, lineHeight: 1.7 }} className="prose dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]}>
                  {(openClientModal as any).description || "No description."}
                </ReactMarkdown>
              </div>
            </div>
          </>
        )}
      </Modal>

      {isFormOpen && (
        <RevisionForm assetId={selectedAsset} onClose={() => setIsFormOpen(false)} onSuccess={handleUploadSuccess} />
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
        <AssetTimeline asset={assets.find((a) => a.id === selectedAsset)} revisions={revisions} onClose={() => setShowTimeline(false)} />
      )}
    </div>
  );
};

export default Home;
