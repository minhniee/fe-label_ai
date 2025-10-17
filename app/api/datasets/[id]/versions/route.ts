import { NextResponse } from "next/server"

// Mock versions data - in production, this would query your database
const mockVersions: Record<string, any[]> = {
  "dataset-1": [
    {
      id: "v1",
      versionNumber: "1.0",
      fileName: "customer_feedback_v1.csv",
      description: "Initial dataset with basic sentiment labels",
      rowCount: 150,
      columnCount: 5,
      columns: ["id", "customer_name", "feedback_text", "sentiment", "date"],
      uploadDate: "2024-01-15T10:30:00Z",
      status: "active",
    },
    {
      id: "v2",
      versionNumber: "1.1",
      fileName: "customer_feedback_v1.1.csv",
      description: "Updated with additional feedback entries and refined labels",
      rowCount: 200,
      columnCount: 5,
      columns: ["id", "customer_name", "feedback_text", "sentiment", "date"],
      uploadDate: "2024-02-01T14:20:00Z",
      status: "active",
    },
    {
      id: "v3",
      versionNumber: "2.0",
      fileName: "customer_feedback_v2.0.csv",
      description: "Major update with new rating column and expanded dataset",
      rowCount: 350,
      columnCount: 6,
      columns: ["id", "customer_name", "feedback_text", "sentiment", "rating", "date"],
      uploadDate: "2024-03-10T09:15:00Z",
      status: "active",
    },
  ],
  "dataset-2": [
    {
      id: "v1",
      versionNumber: "1.0",
      fileName: "product_classification_v1.csv",
      description: "Initial product dataset for category classification",
      rowCount: 320,
      columnCount: 5,
      columns: ["product_id", "product_name", "description", "category", "price"],
      uploadDate: "2024-01-20T11:00:00Z",
      status: "active",
    },
    {
      id: "v2",
      versionNumber: "1.1",
      fileName: "product_classification_v1.1.csv",
      description: "Added brand information and updated categories",
      rowCount: 320,
      columnCount: 6,
      columns: ["product_id", "product_name", "description", "category", "brand", "price"],
      uploadDate: "2024-02-15T16:45:00Z",
      status: "active",
    },
  ],
  "dataset-3": [
    {
      id: "v1",
      versionNumber: "1.0",
      fileName: "support_tickets_v1.csv",
      description: "Support tickets for priority classification",
      rowCount: 89,
      columnCount: 5,
      columns: ["ticket_id", "subject", "description", "priority", "status"],
      uploadDate: "2024-02-01T08:30:00Z",
      status: "active",
    },
  ],
  "dataset-4": [
    {
      id: "v1",
      versionNumber: "1.0",
      fileName: "email_classification_v1.csv",
      description: "Email dataset for spam detection",
      rowCount: 500,
      columnCount: 5,
      columns: ["email_id", "subject", "body", "sender", "is_spam"],
      uploadDate: "2024-02-10T13:20:00Z",
      status: "active",
    },
    {
      id: "v2",
      versionNumber: "2.0",
      fileName: "email_classification_v2.csv",
      description: "Expanded dataset with additional spam indicators",
      rowCount: 750,
      columnCount: 7,
      columns: ["email_id", "subject", "body", "sender", "is_spam", "spam_score", "attachments"],
      uploadDate: "2024-03-05T10:00:00Z",
      status: "active",
    },
  ],
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300))

    const versions = mockVersions[id]

    if (!versions) {
      return NextResponse.json({ success: false, error: "Dataset not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      versions,
    })
  } catch (error) {
    console.error("[v0] Error fetching dataset versions:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch dataset versions" }, { status: 500 })
  }
}
