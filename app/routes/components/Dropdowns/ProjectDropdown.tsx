import React, { useState, useEffect } from "react";
import { pocketBaseService } from "~/routes/services/pocketbaseServices";
import type { Project, DropdownOption } from "../../types";

interface ProjectDropdownProps {
  value: string;
  onChange: (value: string) => void;
  clientId: string;
  disabled?: boolean;
}

const ProjectDropdown: React.FC<ProjectDropdownProps> = ({
  value,
  onChange,
  clientId,
  disabled = false,
}) => {
  const [options, setOptions] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clientId) {
      setOptions([]);
      return;
    }

    const fetchProjects = async () => {
      setLoading(true);
      try {
        const projects = await pocketBaseService.getProjects(clientId);
        const projectOptions = projects.map((project: Project) => ({
          value: project.id,
          label: project.name,
        }));
        setOptions(projectOptions);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [clientId]);

  return (
    <div className="dropdown-container">
      <label htmlFor="project-select" className="dropdown-label">
        Select Project
      </label>
      <select
        id="project-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="dropdown-select"
        disabled={disabled || loading}
      >
        <option value="">
          {loading
            ? "Loading projects..."
            : disabled
            ? "Select a client first"
            : "Choose a project"}
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

export default ProjectDropdown;
