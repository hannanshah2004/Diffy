export interface ChangelogEntry {
  id: string;
  title: string;
  description: string | null;
  category: string;
  version: string | null;
  repo_owner: string | null;
  repo_name: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
} 