"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const image = params.get("image");

    if (token) {
      localStorage.setItem("access_token", token);
    }
    if (image) {
      const decodedImage = decodeURIComponent(image);
      localStorage.setItem("image", decodedImage);
    }

    router.replace("/dashboard"); 
  }, [router]);

  return <div>Redirecting...</div>;
}
