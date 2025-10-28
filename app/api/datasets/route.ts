import { NextRequest, NextResponse } from "next/server"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"

export async function GET(request: NextRequest) {
  try {
    // Get auth token from request headers
    const authHeader = request.headers.get('authorization')
    
    const response = await fetch(`${API_BASE}/datasets`, {
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

    const backendData = await response.json()
    
    // Transform backend dataset format to component expected format
    // For each dataset, try to get rowCount and columns from the latest version's file
    const datasets = await Promise.all(
      (Array.isArray(backendData) ? backendData : []).map(async (ds: any) => {
        let rowCount = 0
        let columns: string[] = []
        
        try {
          // Get versions for this dataset to find the latest one
          const versionsResponse = await fetch(`${API_BASE}/datasets/${ds.dataset_id}/versions`, {
            headers: {
              'Content-Type': 'application/json',
              ...(authHeader && { 'Authorization': authHeader }),
            },
          })
          
          if (versionsResponse.ok) {
            const versions = await versionsResponse.json()
            if (Array.isArray(versions) && versions.length > 0) {
              // Get the latest version (first one, as they're ordered desc)
              const latestVersion = versions[0]
              
              // Get files for the latest version
              const filesResponse = await fetch(`${API_BASE}/datasets/versions/${latestVersion.version_id}/files`, {
                headers: {
                  'Content-Type': 'application/json',
                  ...(authHeader && { 'Authorization': authHeader }),
                },
              })
              
              if (filesResponse.ok) {
                const files = await filesResponse.json()
                if (Array.isArray(files) && files.length > 0) {
                  const file = files[0]
                  rowCount = file.line_count || 0
                  columns = file.column_names || []
                }
              }
            }
          }
        } catch (err) {
          // If fetching version/file data fails, use defaults
          // This is non-critical, so we continue
        }
        
        return {
          id: String(ds.dataset_id),
          name: ds.name || '',
          description: ds.description || '',
          rowCount,
          columns,
          createdAt: ds.created_at || new Date().toISOString(),
        }
      })
    )
    
    return NextResponse.json({
      success: true,
      datasets
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
