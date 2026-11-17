import type { Tag } from "../utils/tags";
export type Priority = "low" | "normal" | "high";
export type Filter = "all" | "active" | "completed";
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  createdAt: string;
  dueDate?: string | null;
  tag?: Tag | null;
  note?: string;
}
