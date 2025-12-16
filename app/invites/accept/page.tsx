'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getInvitationByToken, acceptInvitation, viewAllProjects } from '@/app/api/project';
import { getMe } from '@/app/api/auth';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { projectToSlug, setSelectedProject, type Project } from '@/types/project';

// Get values at runtime, not build time
function getApiBase(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_BASE) {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE.trim();
    if (apiBase) {
      return apiBase;
    }
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // Fallback default for server-side rendering
  return "http://localhost:8000";
}

function getSiteUrl(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SITE_URL) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL.trim();
    if (siteUrl) {
      return siteUrl;
    }
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // Fallback default for server-side rendering
  return "http://localhost:3000";
}

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAcceptInvitation = async (inviteToken: string) => {
    setIsAccepting(true);
    try {
      const result = await acceptInvitation({ invite_token: inviteToken });
      
      // Fetch project details to create slug and redirect
      try {
        const projects = await viewAllProjects();
        const invitedProject = projects.find(p => p.project_id === result.project_id);
        
        if (invitedProject) {
          // Convert to frontend Project format
          const project: Project = {
            id: invitedProject.project_id.toString(),
            name: invitedProject.name,
            description: invitedProject.description,
            labeling_type: invitedProject.labeling_type,
            status: invitedProject.status,
            created_by: invitedProject.created_by,
            created_at: invitedProject.created_at,
            updated_at: invitedProject.updated_at,
          };
          
          // Save project to localStorage for navigation
          setSelectedProject(project);
          
          // Refresh server components to reflect new team member
          router.refresh();
          
          // Create slug and redirect to project annotate page
          const slug = projectToSlug(project);
          router.push(`/${slug}/annotate`);
        } else {
          // If project not found, redirect to projects page
          router.refresh();
          router.push('/projects');
        }
      } catch (fetchError) {
        console.error("Failed to fetch project details:", fetchError);
        // Fallback: redirect to projects page
        router.refresh();
        router.push('/projects');
      }
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to accept invitation';
      setError(errorMessage);
      setIsAccepting(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link. No token provided.');
      setLoading(false);
      return;
    }

    const checkAuthAndLoadInvitation = async () => {
      try {
        // Load invitation details first
        const invitationData = await getInvitationByToken(token);
        setInvitation(invitationData);

        // Check if user is authenticated
        const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        if (accessToken) {
          try {
            await getMe();
            setIsAuthenticated(true);
            // If authenticated, accept invitation immediately
            await handleAcceptInvitation(invitationData.invite_token);
          } catch (e) {
            // Token invalid, user not authenticated
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load invitation');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndLoadInvitation();
  }, [token]);

  const handleGoogleLogin = () => {
    if (!token) return;
    
    // Save the invite token and current URL for after login
    localStorage.setItem('pending_invite_token', token);
    localStorage.setItem('redirect_after_login', `/invites/accept?token=${token}`);

    const state = crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
    sessionStorage.setItem('oauth_state', state);

    const url = new URL(`${getApiBase()}/auth/login_by_google`);
    window.location.href = url.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-6 break-words">{error}</p>
          <div className="space-y-2">
            <Button onClick={() => router.push('/login')} className="w-full">
              Go to Login
            </Button>
            {token && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  window.location.reload();
                }} 
                className="w-full"
              >
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isAccepting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
          <p className="text-gray-600">Accepting invitation...</p>
        </div>
      </div>
    );
  }

  // Show sign-in page for unauthenticated users
  if (!isAuthenticated && invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50" style={{
        backgroundImage: 'linear-gradient(to right, #dbeafe, #e9d5ff, #fce7f3)',
      }}>
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          {/* Logo - Replace with FPT logo */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-purple-600 mb-2">Label-AI</h1>
          </div>

          {/* Invitation message */}
          <div className="mb-6 text-center">
            <p className="text-gray-600 text-sm mb-4">
              Sign In or Sign Up with <strong>{invitation.email}</strong> to accept your invite.
            </p>
            <p className="text-gray-700 text-base mb-2">
              <strong>{invitation.inviter_name}</strong> invited you to join the <strong>{invitation.project_name}</strong> workspace on Label-AI.
            </p>
            <p className="text-gray-600 text-sm">
              Experience the fastest way to build and deploy computer vision models.
            </p>
          </div>

          {/* Google Login Button */}
          <Button
            onClick={handleGoogleLogin}
            className="w-full h-11 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-medium transition-all duration-200 hover:shadow-md mb-4"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google logo"
              className="w-5 h-5 mr-2"
            />
            Continue with Google
          </Button>

          {/* Terms and Privacy */}
          <p className="text-xs text-gray-500 text-center mt-6">
            By continuing, you are indicating that you accept our{' '}
            <a href="#" className="text-purple-600 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-purple-600 hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    );
  }

  // This should not be reached, but just in case
  return null;
}

