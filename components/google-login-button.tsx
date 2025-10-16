'use client';

import { useState } from 'react';

const API_BASE = "http://localhost:8000";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

export default function GoogleLoginButton() {
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    const back = window.location.pathname + window.location.search;
    localStorage.setItem('redirect_after_login', back);

    const state = crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
    sessionStorage.setItem('oauth_state', state);

    setLoading(true);

    const url = new URL(`${API_BASE}/auth/login_by_google`);
    url.searchParams.set('state', state);
    url.searchParams.set('redirect_uri', `${SITE_URL}/auth/google-callback`);
    url.searchParams.set('next', '/dashboard'); 

    window.location.href = url.toString();
  };

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="flex items-center justify-center gap-2 w-full bg-white border border-gray-300 rounded-lg px-4 py-2 shadow-sm hover:bg-gray-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
      aria-busy={loading}
    >
      <img
        src="https://www.svgrepo.com/show/475656/google-color.svg"
        alt="Google logo"
        className="w-5 h-5"
      />
      <span className="text-gray-700 font-medium">
        {loading ? 'Redirecting…' : 'Login with Google'}
      </span>
    </button>
  );
}
