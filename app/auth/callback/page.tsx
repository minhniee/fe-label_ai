"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    // Chờ client-side mount xong
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return; // tránh chạy trên server

    const handleAuthCallback = async () => {
      try {
        const url = window.location.href;
        console.log("📍 URL hiện tại:", url);

        const params = new URLSearchParams(window.location.search);
        const errorParam = params.get("error");

        // Check for OAuth errors first
        if (errorParam) {
          setError("Có lỗi xảy ra trong quá trình xác thực với Google. Vui lòng thử lại.");
          setStatus('error');
          return;
        }

        // With HTTP-only cookies, we don't need to check for tokens in URL params
        // The backend has already set the cookies, so we can proceed directly
        
        setStatus('success');
        
        // Redirect after a short delay to show success state
        setTimeout(() => {
          const redirectPath = localStorage.getItem('redirect_after_login') || '/dashboard';
          localStorage.removeItem('redirect_after_login');
          router.replace(redirectPath);
        }, 1500);

      } catch (err) {
        console.error('Auth callback error:', err);
        setError("Có lỗi xảy ra trong quá trình đăng nhập.");
        setStatus('error');
      }
    };

    handleAuthCallback();
  }, [hydrated, router]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Đang khởi tạo...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            {status === 'success' ? 'Đăng nhập thành công!' : 
             status === 'error' ? 'Đăng nhập thất bại' : 
             'Đang xử lý đăng nhập...'}
          </CardTitle>
          <CardDescription>
            {status === 'success' ? 'Chào mừng bạn quay trở lại!' :
             status === 'error' ? 'Vui lòng thử lại sau' :
             'Vui lòng chờ trong giây lát...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-gray-600 text-center">
                Đang xác thực với Google...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-600" />
              <p className="text-gray-600 text-center">
                Đang chuyển hướng đến trang chủ...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-600" />
              <Alert className="w-full">
                <AlertDescription>
                  {error || 'Có lỗi xảy ra trong quá trình đăng nhập.'}
                </AlertDescription>
              </Alert>
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button 
                  onClick={() => window.location.reload()} 
                  className="flex-1"
                >
                  Thử lại
                </Button>
                <Button 
                  variant="outline" 
                  asChild
                  className="flex-1"
                >
                  <Link href="/">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Về trang chủ
                  </Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
