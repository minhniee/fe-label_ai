"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState("Đang đăng nhập, vui lòng chờ...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("access_token");

    if (!code) {
      setError("Thiếu mã xác thực từ server.");
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_BASE}/auth/callback?access_token=${code}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.access_token) {
          localStorage.setItem("access_token", data.access_token);
          router.push("/dashboard");
        } else {
          setError("Xác thực thất bại.");
        }
      })
      .catch(() => setError("Lỗi kết nối đến server."));
  }, [router]);

  // Không render text khác giữa server và client
  return (
    <div>
      {error ? <p>{error}</p> : <p>{loadingText}</p>}
    </div>
  );
}
