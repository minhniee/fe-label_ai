'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function GoogleLoginButton() {
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = () => {
    if (typeof window === 'undefined') return;
    
    // Check for callback_url in query params first (from logout redirect)
    const searchParams = new URLSearchParams(window.location.search);
    const callbackUrl = searchParams.get('callback_url');
    
    let redirectUrl: string;
    if (callbackUrl) {
      // Use callback_url if present (already includes full URL with query params)
      redirectUrl = decodeURIComponent(callbackUrl);
    } else {
      // Otherwise, use current path + query params
      redirectUrl = window.location.pathname + window.location.search;
    }
    
    localStorage.setItem('redirect_after_login', redirectUrl);

    const state = crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
    sessionStorage.setItem('oauth_state', state);

    setLoading(true);

    const url = new URL(`${API_BASE}/auth/login_by_google`);
    window.location.href = url.toString();
  };

  return (
    <Button
      onClick={handleLogin}
      disabled={loading}
      variant="outline"
      className="w-full h-11 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 font-medium transition-all duration-200 hover:shadow-md"
      aria-busy={loading}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
      ) : (
        <img
          src="https://www.svgrepo.com/show/475656/google-color.svg"
          alt="Google logo"
          className="w-5 h-5 mr-2"
        />
      )}
      {loading ? 'Redirecting to Google...' : 'Continue with Google'}
    </Button>
  );
}
