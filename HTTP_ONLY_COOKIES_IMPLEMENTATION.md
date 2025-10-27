# HTTP-Only Cookies Implementation

## Overview
This document describes the implementation of HTTP-only cookies for session management in the Tagmify application, replacing localStorage-based token storage for improved security.

## Security Benefits

### Before (localStorage)
- ❌ Tokens accessible via JavaScript (`localStorage.getItem("access_token")`)
- ❌ Vulnerable to XSS attacks
- ❌ Tokens persist across browser sessions
- ❌ Manual token management required

### After (HTTP-only cookies)
- ✅ Tokens not accessible via JavaScript
- ✅ Protected against XSS attacks
- ✅ Automatic cookie management by browser
- ✅ Server-controlled expiration
- ✅ Secure flag for HTTPS
- ✅ SameSite protection against CSRF

## Implementation Details

### Backend Changes

#### 1. Authentication Router (`Tagmify_Backend/routers/auth_router.py`)

**Login Endpoint:**
```python
@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest, response: Response, db: Session = Depends(get_db)):
    # ... authentication logic ...
    
    # Set HTTP-only cookies
    response.set_cookie(
        key="access_token",
        value=result["access_token"],
        httponly=True,
        secure=True,  # Set to True in production with HTTPS
        samesite="lax",
        max_age=3600  # 1 hour
    )
    
    if result.get("refresh_token"):
        response.set_cookie(
            key="refresh_token",
            value=result["refresh_token"],
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=7 * 24 * 3600  # 7 days
        )
```

**Google OAuth Callback:**
```python
@router.get("/callback", name="google_callback")
async def google_callback(request: Request, response: Response, db: Session = Depends(get_db)):
    # ... OAuth processing ...
    
    # Set HTTP-only cookies instead of URL parameters
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=3600
    )
    
    # Redirect without tokens in URL
    redirect_url = f"{FE_URL}/auth/callback"
    return RedirectResponse(url=redirect_url)
```

**Logout Endpoint:**
```python
@router.post("/logout")
async def logout(response: Response):
    # Clear HTTP-only cookies
    response.delete_cookie(key="access_token", httponly=True, samesite="lax")
    response.delete_cookie(key="refresh_token", httponly=True, samesite="lax")
    
    return {"message": "Logged out successfully"}
```

#### 2. Permissions Checker (`Tagmify_Backend/auth/permissions.py`)

**Updated to read from cookies:**
```python
@staticmethod
def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    # Try to get token from HTTP-only cookie first
    access_token = request.cookies.get("access_token")
    
    # Fallback to Authorization header if no cookie
    if not access_token and credentials:
        access_token = credentials.credentials
    
    if not access_token:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # ... validate token ...
```

### Frontend Changes

#### 1. API Client (`fe-label_ai/app/api/auth.ts`)

**Configured for cookies:**
```typescript
// Configure axios to include cookies in requests
axios.defaults.withCredentials = true

export async function loginUser(username_or_email: string, password: string) {
  const response = await axios.post<TokenResponse>(`${API_BASE}/auth/login`, 
    { username_or_email, password }, 
    {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true, // Include cookies
    }
  )
  return response.data
}

export async function getMe() {
  const response = await axios.get<MeResponse>(`${API_BASE}/auth/me`, {
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true, // Include cookies
  })
  return response.data
}
```

#### 2. Generic API Client (`fe-label_ai/app/api/client.ts`)

**Updated Axios configuration:**
```typescript
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Enable cookies for all requests
})

// Request interceptor - no longer needed for auth tokens
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Cookies are automatically included with withCredentials: true
    return config
  }
)
```

#### 3. Auth Callback (`fe-label_ai/app/auth/callback/page.tsx`)

**Simplified callback handling:**
```typescript
const handleAuthCallback = async () => {
  const params = new URLSearchParams(window.location.search);
  const errorParam = params.get("error");

  if (errorParam) {
    setError("Có lỗi xảy ra trong quá trình xác thực với Google.");
    setStatus('error');
    return;
  }

  // With HTTP-only cookies, tokens are already set by backend
  // No need to extract tokens from URL or localStorage
  setStatus('success');
  
  setTimeout(() => {
    const redirectPath = localStorage.getItem('redirect_after_login') || '/dashboard';
    router.replace(redirectPath);
  }, 1500);
};
```

#### 4. Schema Page (`fe-label_ai/app/(navigation)/schema/page.tsx`)

**Updated API calls:**
```typescript
const fetchSchemas = async () => {
  const response = await fetch(url, {
    credentials: 'include', // Include cookies
    headers: { "Content-Type": "application/json" }
  })
  // ... handle response ...
}
```

## Cookie Configuration

### Security Settings
- **httponly**: `true` - Prevents JavaScript access
- **secure**: `true` - Only sent over HTTPS (set to `false` for development)
- **samesite**: `"lax"` - CSRF protection
- **max_age**: Token expiration time

### Token Lifetimes
- **Access Token**: 1 hour (3600 seconds)
- **Refresh Token**: 7 days (604800 seconds)

## Migration Notes

### Backward Compatibility
- Authorization header still supported as fallback
- Existing localStorage tokens will work until they expire
- Gradual migration possible

### Development vs Production
- **Development**: `secure=False` for HTTP
- **Production**: `secure=True` for HTTPS

## Testing

### Manual Testing
1. Login via Google OAuth
2. Check browser DevTools → Application → Cookies
3. Verify `access_token` and `refresh_token` are HTTP-only
4. Test API calls work without Authorization header
5. Test logout clears cookies

### Automated Testing
- Update existing auth tests to use cookies
- Test cookie expiration
- Test CSRF protection

## Security Considerations

### Additional Recommendations
1. **HTTPS Only**: Always use HTTPS in production
2. **Cookie Prefixes**: Consider `__Secure-` prefix for additional security
3. **Token Rotation**: Implement refresh token rotation
4. **Rate Limiting**: Add rate limiting to auth endpoints
5. **Audit Logging**: Log authentication events

### Monitoring
- Monitor failed authentication attempts
- Track cookie expiration patterns
- Alert on suspicious login patterns

## Troubleshooting

### Common Issues
1. **CORS**: Ensure `withCredentials: true` is set
2. **Domain Mismatch**: Check cookie domain settings
3. **HTTPS**: Verify secure flag matches environment
4. **SameSite**: Test cross-site request behavior

### Debug Steps
1. Check browser DevTools → Network → Request Headers
2. Verify cookies are being sent
3. Check server logs for authentication errors
4. Test with curl: `curl -v --cookie-jar cookies.txt --cookie cookies.txt`

## Conclusion

The HTTP-only cookie implementation provides significant security improvements over localStorage-based token storage while maintaining a smooth user experience. The implementation is backward-compatible and can be deployed gradually.
