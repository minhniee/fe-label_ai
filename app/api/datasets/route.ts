import { NextRequest, NextResponse } from "next/server"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"

export async function GET(request: NextRequest) {
  try {
    // Return mock data directly for the disabled authentication environment
    const datasets = [
      {
        id: "dataset-1",
        name: "Customer Feedback 2024",
        description: "Annual customer satisfaction survey results",
        rowCount: 150,
        columns: ["id", "customer_name", "feedback_text", "sentiment", "date"],
        createdAt: "2024-01-10T10:00:00Z",
      },
      {
        id: "dataset-2",
        name: "E-commerce Product Catalog",
        description: "List of products and their current pricing",
        rowCount: 320,
        columns: ["product_id", "product_name", "description", "category", "price"],
        createdAt: "2024-02-15T14:30:00Z",
      },
      {
        id: "dataset-3",
        name: "Support Ticket Logs",
        description: "Customer support interactions and resolutions",
        rowCount: 89,
        columns: ["ticket_id", "subject", "description", "priority", "status"],
        createdAt: "2024-03-01T09:15:00Z",
      },
      {
        id: "dataset-4",
        name: "Spam Detection Corpus",
        description: "Large collection of labeled spam and ham emails",
        rowCount: 500,
        columns: ["email_id", "subject", "body", "sender", "is_spam"],
        createdAt: "2024-03-20T16:45:00Z",
      }
    ];
    
    return NextResponse.json({
      success: true,
      datasets
    });
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
