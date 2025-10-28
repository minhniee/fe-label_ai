import { NextRequest, NextResponse } from "next/server"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    // Get auth token from request headers
    const authHeader = request.headers.get('authorization')
    
    const response = await fetch(`${API_BASE}/datasets/${id}/versions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { 
          success: false, 
          error: errorData.detail || `HTTP ${response.status}` 
        },
        { status: response.status }
      )
    }

    const backendVersions = await response.json()
    
    // Transform backend version format and fetch file data for each version
    const versions = await Promise.all(
      (Array.isArray(backendVersions) ? backendVersions : []).map(async (version: any) => {
        try {
          // Fetch files for this version
          const filesResponse = await fetch(`${API_BASE}/datasets/versions/${version.version_id}/files`, {
            headers: {
              'Content-Type': 'application/json',
              ...(authHeader && { 'Authorization': authHeader }),
            },
          })
          
          let rowCount = 0
          let columnCount = 0
          let columns: string[] = []
          let fileName = ''
          
          if (filesResponse.ok) {
            const files = await filesResponse.json()
            if (Array.isArray(files) && files.length > 0) {
              const file = files[0] // Get the first file
              fileName = file.file_name || ''
              rowCount = file.line_count || 0
              columnCount = file.column_count || 0
              columns = file.column_names || []
            }
          }
          
          return {
            id: String(version.version_id),
            versionNumber: String(version.version_number),
            fileName: fileName || `v${version.version_number}`,
            description: version.changelog || '',
            rowCount,
            columnCount,
            columns,
            uploadDate: version.created_at || new Date().toISOString(),
            status: 'active',
          }
        } catch (err) {
          // If file fetch fails, return version with minimal data
          return {
            id: String(version.version_id),
            versionNumber: String(version.version_number),
            fileName: `v${version.version_number}`,
            description: version.changelog || '',
            rowCount: 0,
            columnCount: 0,
            columns: [],
            uploadDate: version.created_at || new Date().toISOString(),
            status: 'active',
          }
        }
      })
    )
    
    return NextResponse.json({
      success: true,
      versions
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
