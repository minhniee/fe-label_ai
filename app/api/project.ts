import api from './client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ProjectCreateRequest {
  name: string;
  description?: string;
}

export interface ProjectResponse {
  project_id: number;
  name: string;
  description?: string;
  status: string;
  labeling_type?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  dataset_id?: number; // Dataset ID associated with the project workspace
}

export interface ProjectWithRoleResponse extends ProjectResponse {
  role: string;
  is_owner: boolean;
}

export interface SetLabelingTypeRequest {
  labeling_type: 'myself' | 'team';
}

export interface AddCollaboratorRequest {
  email: string;
  role_id: number; // 1=owner, 2=manager, 3=labeler, 4=reviewer
}

export interface ProjectCollaboratorResponse {
  collaborator_id: number;
  project_id: number;
  user_id: number;
  role_id: number;
  role?: number; // For backward compatibility
  assigned_by: number;
  assigned_at: string;
  user_email?: string;
  user_username?: string;
  role_name?: string;
}

export interface InvitationResponse {
  invitation_id: number;
  project_id: number;
  email: string;
  role_id: number;
  invite_token: string;
  status: string;
  invited_by: number;
  invited_at: string;
  expires_at: string;
}

export interface AcceptInviteRequest {
  invite_token: string;
}

export interface AcceptInviteResponse {
  collaborator_id: number;
  project_id: number;
  user_id: number;
  role: number;
  accepted_at: string;
}

export interface InvitationDetailsResponse {
  invitation_id: number;
  project_id: number;
  project_name: string;
  email: string;
  role_id: number;
  role_name: string;
  invite_token: string;
  status: string;
  invited_by: number;
  inviter_name: string;
  invited_at: string;
  expires_at: string;
}

export interface ProjectFileResponse {
  file_id: number;
  filename: string;
  file_path: string;
  file_type: string;
  annotation_status: 'unannotated' | 'annotating' | 'completed' | 'verified';
  uploaded_at: string;
  uploaded_by: number;
}

export interface ProjectStatsResponse {
  project_id: number;
  total_files: number;
  unannotated: number;
  annotating: number;
  completed: number;
  verified: number;
  completion_percentage: number;
}

export interface UploadFilesResponse {
  success: boolean;
  project_id: number;
  uploaded_count: number;
  files: Array<{
    file_id: number;
    filename: string;
    file_path: string;
    file_type: string;
  }>;
}

export interface GenerateDatasetRequest {
  dataset_name: string;
  dataset_description?: string;
  export_type: 'full' | 'partial' | 'verified_only';
  copy_permissions?: boolean;
}

export interface GenerateDatasetResponse {
  message: string;
  dataset_id: number;
  project_id: number;
  files_exported: number;
  permissions_copied?: number;
}

export interface ProjectUpdateRequest {
  name?: string;
  description?: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * View all projects of a user including:
 * - Projects created by the user (as owner)
 * - Projects where the user is a collaborator
 */
export async function viewAllProjects(): Promise<ProjectWithRoleResponse[]> {
  try {
    const response = await api.get<ProjectWithRoleResponse[]>('/projects');
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch projects';
    throw new Error(errorMessage);
  }
}

/**
 * Create a new project
 * Project starts in 'draft' status
 * Creator is automatically added as 'owner' in project_collaborators
 */
export async function createProject(payload: ProjectCreateRequest): Promise<ProjectResponse> {
  try {
    const response = await api.post<ProjectResponse>('/projects', payload);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to create project';
    throw new Error(errorMessage);
  }
}

/**
 * Set project labeling type (myself or team)
 * After uploading files, user chooses labeling type
 * Status changes to 'ready_to_label'
 */
export async function setLabelingType(
  projectId: number,
  payload: SetLabelingTypeRequest
): Promise<ProjectResponse> {
  try {
    const response = await api.put<ProjectResponse>(`/projects/${projectId}/labeling-type`, payload);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to set labeling type';
    throw new Error(errorMessage);
  }
}

/**
 * Get all collaborators for a project
 */
export async function getProjectCollaborators(projectId: number): Promise<ProjectCollaboratorResponse[]> {
  try {
    const response = await api.get<ProjectCollaboratorResponse[]>(`/projects/${projectId}/collaborators`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch collaborators';
    throw new Error(errorMessage);
  }
}

/**
 * Add a collaborator to a project (for team labeling)
 * Roles: owner, manager, labeler, reviewer
 */
export async function addCollaborator(
  projectId: number,
  payload: AddCollaboratorRequest
): Promise<ProjectCollaboratorResponse> {
  try {
    const response = await api.post<ProjectCollaboratorResponse>(`/projects/${projectId}/collaborators`, payload);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to add collaborator';
    throw new Error(errorMessage);
  }
}

/**
 * Create an invitation to add a collaborator (pending)
 * Sends email with invite token
 */
export async function createInvitation(
  projectId: number,
  payload: AddCollaboratorRequest
): Promise<InvitationResponse> {
  try {
    const response = await api.post<InvitationResponse>(`/projects/${projectId}/invitations`, payload);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to create invitation';
    throw new Error(errorMessage);
  }
}

/**
 * Get invitation details by token (public endpoint, no auth required)
 */
export async function getInvitationByToken(token: string): Promise<InvitationDetailsResponse> {
  try {
    const response = await api.get<InvitationDetailsResponse>('/projects/invitations/by-token', {
      params: { token }
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch invitation';
    throw new Error(errorMessage);
  }
}

/**
 * Accept an invitation using the invite token
 * User must be logged in and email must match the invitation
 */
export async function acceptInvitation(payload: AcceptInviteRequest): Promise<AcceptInviteResponse> {
  try {
    const response = await api.post<AcceptInviteResponse>('/projects/invitations/accept', payload);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to accept invitation';
    throw new Error(errorMessage);
  }
}

/**
 * List pending invitations for a project (non-expired)
 * Requires owner or co-owner permission
 */
export async function listPendingInvitations(projectId: number): Promise<InvitationResponse[]> {
  try {
    const response = await api.get<InvitationResponse[]>(`/projects/${projectId}/invitations`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch invitations';
    throw new Error(errorMessage);
  }
}

/**
 * Get all files in a project with their annotation status
 * Status values: unannotated, annotating, completed, verified
 */
export async function getProjectFiles(projectId: number): Promise<ProjectFileResponse[]> {
  try {
    const response = await api.get<ProjectFileResponse[]>(`/projects/${projectId}/files`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch project files';
    throw new Error(errorMessage);
  }
}

/**
 * Get project annotation statistics and progress
 */
export async function getProjectStats(projectId: number): Promise<ProjectStatsResponse> {
  try {
    const response = await api.get<ProjectStatsResponse>(`/projects/${projectId}/stats`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch project stats';
    throw new Error(errorMessage);
  }
}

/**
 * Upload multiple files to a project
 * 
 * Workflow:
 * 1. Creates/gets project workspace dataset automatically
 * 2. Creates version automatically if needed
 * 3. Uploads files with project_id link
 * 4. Sets annotation_status = 'unannotated' for all files
 * 5. Updates project status to 'uploading'
 * 
 * Note: Files are uploaded to a hidden workspace dataset
 */
export async function uploadFilesToProject(
  projectId: number,
  files: File[],
  fileType: string = 'text'
): Promise<UploadFilesResponse> {
  try {
    const formData = new FormData();
    
    // Append all files
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    // Append file type
    formData.append('file_type', fileType);
    
    const response = await api.post<UploadFilesResponse>(
      `/projects/${projectId}/upload-files`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to upload files';
    throw new Error(errorMessage);
  }
}

/**
 * Generate a dataset from completed project annotations
 * 
 * Workflow:
 * 1. Creates a new dataset from project annotations
 * 2. Links project to dataset via project_datasets table
 * 3. Optionally copies project collaborators as dataset permissions
 * 4. Updates project status to 'completed'
 * 
 * Export types:
 * - full: All annotated files
 * - partial: Only completed files
 * - verified_only: Only verified files
 */
export async function generateDatasetFromProject(
  projectId: number,
  payload: GenerateDatasetRequest
): Promise<GenerateDatasetResponse> {
  try {
    const response = await api.post<GenerateDatasetResponse>(
      `/projects/${projectId}/generate-dataset`,
      payload
    );
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to generate dataset';
    throw new Error(errorMessage);
  }
}

/**
 * Update project information (name and/or description)
 */
export async function updateProject(
  projectId: number,
  payload: ProjectUpdateRequest
): Promise<ProjectResponse> {
  try {
    const response = await api.put<ProjectResponse>(`/projects/${projectId}`, payload);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to update project';
    throw new Error(errorMessage);
  }
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: number): Promise<{ message: string }> {
  try {
    const response = await api.delete<{ message: string }>(`/projects/${projectId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete project';
    throw new Error(errorMessage);
  }
}

