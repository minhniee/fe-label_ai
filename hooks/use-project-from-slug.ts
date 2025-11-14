import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { slugToProjectId, type Project, getSelectedProject } from "@/types/project";

export function useProjectFromSlug(): { project: Project | null; isLoading: boolean } {
  const params = useParams();
  const slug = params.projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setIsLoading(false);
      return;
    }

    // Try to get from localStorage first
    const selectedProject = getSelectedProject();
    
    if (selectedProject) {
      const projectIdFromSlug = slugToProjectId(slug);
      if (selectedProject.id === projectIdFromSlug) {
        setProject(selectedProject);
        setIsLoading(false);
        return;
      }
    }

    // If not in localStorage, we might need to fetch from API
    // For now, just extract the ID from slug
    const projectId = slugToProjectId(slug);
    
    // You could fetch the project details from API here if needed
    // For now, we'll use what's in localStorage or set to null
    setProject(selectedProject);
    setIsLoading(false);
  }, [slug]);

  return { project, isLoading };
}

