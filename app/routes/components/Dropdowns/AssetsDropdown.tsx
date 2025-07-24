import React, { useState, useEffect } from "react";
import { pocketBaseService } from "~/routes/services/pocketbaseServices";
import type { Asset, DropdownOption } from "../../types";

interface AssetsDropdownProps {
  value: string;
  onChange: (value: string) => void;
  projectId: string;
  disabled?: boolean;
}

const AssetsDropdown: React.FC<AssetsDropdownProps> = ({
  value,
  onChange,
  projectId,
  disabled = false,
}) => {
  const [options, setOptions] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setOptions([]);
      return;
    }

    const fetchAssets = async () => {
      setLoading(true);
      try {
        const assets = await pocketBaseService.getAssets(projectId);
        const assetOptions = assets.map((asset: Asset) => ({
          value: asset.id,
          label: asset.name,
        }));
        setOptions(assetOptions);
      } catch (error) {
        console.error("Failed to fetch assets:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [projectId]);

  return (
    <div className="dropdown-container">
      <label htmlFor="assets-select" className="dropdown-label">
        Select Asset
      </label>
      <select
        id="assets-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="dropdown-select"
        disabled={disabled || loading}
      >
        <option value="">
          {loading
            ? "Loading assets..."
            : disabled
            ? "Select a project first"
            : "Choose an asset"}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default AssetsDropdown;
