export const handle = { protected: true };
import React, { useEffect, useState } from "react";
import type { RecordModel } from "pocketbase";
import AssetCard from "../components/AssetCard/AssetCard";
import type { AssetRevision } from "../types";
import Header from "../components/Header/Header";
import RevisionForm from "../components/RevisionForm/RevisionForm";
import { useAuth } from "../contexts/AuthContext";

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

  useEffect(() => {
    setSelectedProject("");
    setSelectedAsset("");
    setProjects([]);
    setAssets([]);
    setRevisions([]);

    if (!selectedClient) return;

    const client = clients.find((c) => c.id === selectedClient);
    const expanded = client?.expand?.client_projects ?? [];
    setProjects(expanded);
  }, [selectedClient, clients]);

  useEffect(() => {
    setSelectedAsset("");
    setAssets([]);
    setRevisions([]);

    if (!selectedProject) return;

    const fetchProjectWithAssets = async () => {
      try {
        const project = await pb
          .collection("projects")
          .getOne(selectedProject, {
            expand: "project_assets",
          });
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
        const asset = await pb.collection("assets").getOne(selectedAsset, {
          expand: "revision_assets",
        });
        const expandedAssestRevision = asset?.expand?.revision_assets ?? [];
        setRevisions(expandedAssestRevision);
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div>
        <Header />
      </div>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            className="p-2 rounded border border-gray-300 bg-white shadow-sm"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
          >
            <option value="">Select Client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>

          <select
            className="p-2 rounded border border-gray-300 bg-white shadow-sm"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            disabled={!selectedClient}
          >
            <option value="">Select Project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <select
            className="p-2 rounded border border-gray-300 bg-white shadow-sm"
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            disabled={!selectedProject}
          >
            <option value="">Select Asset</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-8">
          {loading && (
            <p className="text-center text-gray-500">
              Loading asset revisions...
            </p>
          )}
          {error && <p className="text-center text-red-500">{error}</p>}
          {!loading && !error && selectedAsset && revisions.length === 0 && (
            <div className="text-center space-y-4">
              <p className="text-gray-400">
                No revisions found for this asset.
              </p>
              <button
                onClick={() => setIsFormOpen(true)}
                className="bg-gray-600 text-white px-4 py-2 rounded shadow"
              >
                Upload New Revision
              </button>
            </div>
          )}
          {!loading && revisions.length > 0 && (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {revisions.map((revision) => (
                <AssetCard key={revision.id} revision={revision} />
              ))}
            </div>
          )}
          {selectedAsset && revisions.length > 0 && (
            <div className="text-center mt-6">
              <button
                onClick={() => setIsFormOpen(true)}
                className="bg-gray-600 text-white px-4 py-2 rounded shadow"
              >
                Upload New Revision
              </button>
            </div>
          )}
        </div>
      </div>
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
