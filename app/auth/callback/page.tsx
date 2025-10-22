"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");
    const picture = params.get("picture");

    if (!accessToken) {
      setError("Thiếu mã xác thực từ server.");
      return;
    }

    localStorage.setItem("token", accessToken);
    if (picture) localStorage.setItem("picture", decodeURIComponent(picture));

    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex justify-center items-center h-screen">
      {error ? <p>{error}</p> : <p>Đang đăng nhập, vui lòng chờ...</p>}
    </div>
  );
}
