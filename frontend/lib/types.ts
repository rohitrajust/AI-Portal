export type MessageRole = "user" | "assistant";

export interface DebateMessage {
  role: MessageRole;
  content: string;
  speaker?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  route: string;
  backendUrl: string;
  status: string;
  owner?: string;
  allowedUsers?: string[];
}
