import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id, versionId } = await params
    
    // Return sample row data based on the dataset ID
    const sampleRows = [
      {
        id: "1",
        text: "The service was excellent and the staff were very helpful.",
        label: "positive",
        date: "2024-01-10",
        source: "Survey"
      },
      {
        id: "2",
        text: "I had a poor experience with the shipping time.",
        label: "negative",
        date: "2024-01-11",
        source: "Review"
      },
      {
        id: "3",
        text: "The product is average, nothing special.",
        label: "neutral",
        date: "2024-01-12",
        source: "Email"
      }
    ];

    // Add more mock rows if needed
    for (let i = 4; i <= 50; i++) {
      sampleRows.push({
        id: String(i),
        text: `Sample feedback text entry number ${i}.`,
        label: i % 2 === 0 ? "positive" : "negative",
        date: "2024-01-15",
        source: "Automated"
      });
    }

    return NextResponse.json({
      success: true,
      data: sampleRows,
      totalCount: sampleRows.length
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
