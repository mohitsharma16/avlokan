export const handle = { protected: true };
import React, { useEffect, useState } from "react";
import type { RecordModel } from "pocketbase";
import AssetCard from "../components/AssetCard/AssetCard";
import type { AssetRevision } from "../types";
import Header from "../components/Header/Header";
import RevisionForm from "../components/RevisionForm/RevisionForm";
import { useAuth } from "../contexts/AuthContext";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

/**
 * Helper - simple markdown -> plain text (used for preview/clamping).
 * Not perfect but good for card preview; keeps whitespace readable.
 */
function stripMarkdown(md?: string) {
  if (!md) return "";
  return (
    md
      // remove images
      .replace(/!\[.*?\]\(.*?\)/g, "")
      // show link text only
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      // remove inline code/backticks
      .replace(/`{1,3}([^`]*)`{1,3}/g, "$1")
      // remove headings, blockquote markers, list bullets
      .replace(/^#+\s?/gm, "")
      .replace(/^>\s?/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      // remove remaining markdown punctuation that's noisy
      .replace(/[_*~]/g, "")
      // collapse whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** Helper to create file URL from PocketBase record */
function avatarUrl(
  pb: any,
  collectionName: string,
  recordId: string,
  filename?: string
) {
  if (!filename) return "";
  return `${pb.baseUrl}/api/files/${collectionName}/${recordId}/${filename}`;
}

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

  // Modal for full client description
  const [openClientModal, setOpenClientModal] = useState<RecordModel | null>(
    null
  );

  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await pb.collection("clients").getFullList({
          expand: "client_projects",
        });
        setClients(res);
      } catch (err) {
        console.error("Error fetching clients:", err);
      }
    };
    fetchClients();
  }, [pb]);

  // Reset on client change
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

  // Fetch assets on project change
  useEffect(() => {
    setSelectedAsset("");
    setAssets([]);
    setRevisions([]);

    if (!selectedProject) return;

    const fetchProjectWithAssets = async () => {
      try {
        const project = await pb
          .collection("projects")
          .getOne(selectedProject, { expand: "project_assets" });
        const expandedAssets = project?.expand?.project_assets ?? [];
        setAssets(expandedAssets);
      } catch (err) {
        console.error("Error fetching project assets:", err);
      }
    };

    fetchProjectWithAssets();
  }, [selectedProject, pb]);

  // Fetch revisions on asset change
  useEffect(() => {
    setRevisions([]);
    setError(null);

    const fetchRevisions = async () => {
      if (!selectedAsset) return;
      setLoading(true);
      try {
        const asset = await pb.collection("assets").getOne(selectedAsset, {
          expand: "revision_assets",
        });
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

  // small fallback avatar (initials)
  const initials = (name = "") =>
    name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <div className="min-h-screen bg-[#efe6d6]">
      <Header />

      <div className="max-w-6xl mx-auto p-6 space-y-10">
        {/* Clients */}
        <section>
          <h2 className="text-2xl font-bold mb-4 text-[#2b1f18]">Clients</h2>

          <div className="grid gap-4">
            {clients.map((client) => {
              const isSelected = selectedClient === client.id;
              // PocketBase editor fields can be HTML strings; preview uses stripped text:
              const rawDesc = (client as any).description ?? "";
              const previewText = stripMarkdown(rawDesc);

              // avatar URL: adjust collection name 'clients' (based on your schema)
              const avatar = (client as any).avatar;
              const avatarSrc = avatar
                ? avatarUrl(pb, "clients", client.id, avatar)
                : "";

              return (
                <div
                  key={client.id}
                  onClick={() => setSelectedClient(client.id)}
                  className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all border-2
                    ${
                      isSelected
                        ? "border-[#8B5E3C] bg-[#d4b785] shadow-lg"
                        : "border-[#6B4F3A] bg-[#fff7ed] hover:shadow-lg"
                    }`}
                >
                  {/* Left: avatar or initials */}
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={client.name}
                      className="w-20 h-20 object-cover rounded-lg border border-[#6B4F3A] flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg flex items-center justify-center bg-[#6B4F3A] text-white font-bold text-xl flex-shrink-0">
                      {initials(client.name as string)}
                    </div>
                  )}

                  {/* Right: name + truncated preview */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-[#2b1f18]">
                          {client.name}
                        </h3>
                        <div
                          className="mt-1 text-sm text-[#3b2f2b] line-clamp-3 overflow-hidden"
                          // We render a text preview (not HTML/MD) for consistent clamping
                        >
                          {previewText || (
                            <span className="text-gray-500">
                              No description
                            </span>
                          )}
                        </div>
                      </div>

                      {/* small View button to open full description */}
                      <div className="flex-shrink-0 self-start">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // don't change selected client
                            setOpenClientModal(client);
                          }}
                          className="text-sm px-2 py-1 rounded text-[#6B4F3A] border border-[#6B4F3A] hover:bg-[#6B4F3A] hover:text-white transition"
                          aria-label={`View ${client.name} description`}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Projects */}
        {projects.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#2b1f18]">Projects</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => setSelectedProject(project.id)}
                  className={`flex-shrink-0 w-60 p-4 rounded-2xl transition border-2
                    ${
                      selectedProject === project.id
                        ? "border-[#8B5E3C] bg-[#d4b785] shadow"
                        : "border-[#6B4F3A] bg-[#fff7ed] hover:shadow-lg"
                    }`}
                >
                  <h3 className="font-semibold text-[#2b1f18]">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-sm text-[#3b2f2b] mt-1 line-clamp-3 overflow-hidden">
                      {/* project.description might be HTML/MD; use preview text to clamp */}
                      {stripMarkdown(project.description)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Assets */}
        {assets.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#2b1f18]">Assets</h2>
            <div className="flex flex-wrap gap-3">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset.id)}
                  className={`px-4 py-2 rounded-full border-2 shadow-sm transition
                    ${
                      selectedAsset === asset.id
                        ? "bg-[#6B4F3A] border-[#6B4F3A] text-white"
                        : "bg-[#fff7ed] border-[#6B4F3A] text-[#2b1f18] hover:shadow-lg"
                    }`}
                >
                  {asset.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Revisions */}
        <section>
          {loading && (
            <p className="text-center text-[#3b2f2b]">
              Loading asset revisions...
            </p>
          )}
          {error && <p className="text-center text-red-600">{error}</p>}

          {!loading && !error && selectedAsset && revisions.length === 0 && (
            <div className="text-center space-y-4">
              <p className="text-[#3b2f2b]">
                No revisions found for this asset.
              </p>
              <button
                onClick={() => setIsFormOpen(true)}
                className="bg-[#6B4F3A] text-white px-4 py-2 rounded-lg shadow hover:opacity-95"
              >
                Upload New Revision
              </button>
            </div>
          )}

          {!loading && revisions.length > 0 && (
            <>
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {revisions.map((revision) => (
                  <AssetCard key={revision.id} revision={revision} />
                ))}
              </div>
              <div className="text-center mt-6">
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-[#6B4F3A] text-white px-4 py-2 rounded-lg shadow"
                >
                  Upload New Revision
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Full description modal */}
      {openClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-3xl rounded-lg p-6 shadow-lg overflow-auto max-h-[80vh]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-[#2b1f18]">
                  {openClientModal.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {openClientModal.id}
                </p>
              </div>
              <div>
                <button
                  onClick={() => setOpenClientModal(null)}
                  className="px-3 py-1 rounded border text-sm"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mt-4 text-[#3b2f2b] prose max-w-none">
              {/* Render both Markdown + raw HTML safely */}
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
              >
                {(openClientModal as any).description || "No description."}
              </ReactMarkdown>
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
    </div>
  );
};

export default Home;
