import { NextRequest, NextResponse } from "next/server"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Return mock versions
    const versions = [
      {
        id: "v1",
        versionNumber: "1",
        fileName: "initial_data.csv",
        description: "Original dataset upload",
        rowCount: 100,
        columnCount: 5,
        columns: ["id", "text", "label", "date", "source"],
        uploadDate: "2024-01-01T12:00:00Z",
        status: 'active',
      },
      {
        id: "v2",
        versionNumber: "2",
        fileName: "cleaned_data.csv",
        description: "Removed duplicates and fixed formatting",
        rowCount: 98,
        columnCount: 5,
        columns: ["id", "text", "label", "date", "source"],
        uploadDate: "2024-02-01T10:30:00Z",
        status: 'active',
      }
    ];
    
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
