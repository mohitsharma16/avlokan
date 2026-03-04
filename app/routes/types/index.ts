export interface Client {
  id: string;
  name: string;
  created: string;
  updated: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  created: string;
  updated: string;
}

export interface Asset {
  id: string;
  name: string;
  project: string;
  created: string;
  updated: string;
}

export interface AssetRevision {
  id: string;
  title: string;
  description: string;
  asset: string;
  version: string;
  versionNumber?: number;
  thumbnail?: string;
  video?: string;
  video_file?: string;
  created: string;
  updated: string;
}

export interface DropdownOption {
  value: string;
  label: string;
}

export interface Comment {
  id: string;
  name: string;
  timestamp: string;
  text: string;
  revisionId: string;
  parentId?: string;
  mentions?: string[];
  created: string;
}

export interface Revision {
  id: string;
  title: string;
  description: string;
  video?: string;
}

export interface LoaderData {
  revision: Revision;
  comments: Comment[];
  revisionId: string;
}

export interface Annotation {
  id: string;
  revisionId: string;
  timestamp: number;
  duration?: number;
  canvasData: any;
  createdBy?: string;
  created?: string;
  updated?: string;
}

export interface AssetCardProps {
  revision: AssetRevision;
}

export interface Task {
  id: string;
  commentId: string;
  revisionId: string;
  assignedTo: string;
  assignedBy: string;
  status: "open" | "in_progress" | "done";
  description: string;
  created: string;
  updated: string;
}

export interface PBUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: "comment_added" | "annotation_added" | "revision_uploaded" | "mention" | "task_assigned";
  message: string;
  revisionId: string;
  sourceUser: string;
  read: boolean;
  created: string;
}
