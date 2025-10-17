import { NextResponse } from "next/server"

// Mock dataset list - in production, this would query your database
const mockDatasets = [
  {
    id: "dataset-1",
    name: "Customer Feedback Dataset",
    description: "Customer reviews and feedback for sentiment analysis",
    rowCount: 150,
    columns: ["id", "customer_name", "feedback_text", "sentiment", "date"],
    createdAt: "2024-01-15",
  },
  {
    id: "dataset-2",
    name: "Product Classification",
    description: "Product descriptions for category classification",
    rowCount: 320,
    columns: ["product_id", "product_name", "description", "category", "price"],
    createdAt: "2024-01-20",
  },
  {
    id: "dataset-3",
    name: "Support Tickets",
    description: "Customer support tickets for priority classification",
    rowCount: 89,
    columns: ["ticket_id", "subject", "description", "priority", "status"],
    createdAt: "2024-02-01",
  },
  {
    id: "dataset-4",
    name: "Email Classification",
    description: "Email messages for spam/not spam classification",
    rowCount: 500,
    columns: ["email_id", "subject", "body", "sender", "is_spam"],
    createdAt: "2024-02-10",
  },
]

export async function GET() {
  try {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300))

    return NextResponse.json({
      success: true,
      datasets: mockDatasets,
    })
  } catch (error) {
    console.error("[v0] Error fetching datasets:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch datasets" }, { status: 500 })
  }
}
