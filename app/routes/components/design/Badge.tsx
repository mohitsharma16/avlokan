import React from "react";

export type Status = "draft" | "in_review" | "changes_requested" | "approved" | "resolved" | "open" | "in_progress" | "done" | "accent";

export const STATUS_LABEL: Record<Status, string> = {
  draft: "Draft",
  in_review: "In review",
  changes_requested: "Changes requested",
  approved: "Approved",
  resolved: "Resolved",
  open: "Open",
  in_progress: "In progress",
  done: "Done",
  accent: "",
};

export const Badge: React.FC<{ status?: Status; plain?: boolean; children?: React.ReactNode; className?: string }> = ({ status, plain, children, className }) => (
  <span className={["av-badge", plain && "av-badge-plain", className].filter(Boolean).join(" ")} data-status={status}>
    {children ?? (status ? STATUS_LABEL[status] : null)}
  </span>
);
export default Badge;
