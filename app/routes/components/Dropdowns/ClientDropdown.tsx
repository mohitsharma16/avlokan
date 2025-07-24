import React, { useState, useEffect } from "react";
import { pocketBaseService } from "~/routes/services/pocketbaseServices";
import type { Client, DropdownOption } from "../../types";

interface ClientDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

const ClientDropdown: React.FC<ClientDropdownProps> = ({ value, onChange }) => {
  const [options, setOptions] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      try {
        const clients = await pocketBaseService.getClients();
        const clientOptions = clients.map((client: Client) => ({
          value: client.id,
          label: client.name,
        }));
        setOptions(clientOptions);
      } catch (error) {
        console.error("Failed to fetch clients:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  return (
    <div className="dropdown-container">
      <label htmlFor="client-select" className="dropdown-label">
        Select Client
      </label>
      <select
        id="client-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="dropdown-select"
        disabled={loading}
      >
        <option value="">
          {loading ? "Loading clients..." : "Choose a client"}
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

export default ClientDropdown;
