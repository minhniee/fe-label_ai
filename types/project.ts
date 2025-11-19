// Project types for frontend

export interface Project {
  id: string;
  name: string;
  description?: string;
  labeling_type?: string;
  status: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  dataset_id?: number; // Dataset ID associated with the project workspace
}

// Helper function to convert project name to URL-friendly slug
export const projectToSlug = (project: Project): string => {
  return `${project.id}-${project.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`;
};

// Helper function to extract project ID from slug
export const slugToProjectId = (slug: string): string => {
  return slug.split('-')[0];
};

// Selected project management using localStorage
const STORAGE_KEY = "selected_project";

export const getSelectedProject = (): Project | null => {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
};

export const setSelectedProject = (project: Project | null) => {
  if (typeof window === "undefined") return;
  if (project) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  // Trigger storage event for other components
  window.dispatchEvent(new Event("project-changed"));
};

export const clearSelectedProject = () => {
  setSelectedProject(null);
};

