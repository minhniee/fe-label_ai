import { NextResponse } from "next/server"

// Mock dataset data - in production, this would query your database
const mockDatasetData: Record<string, any[]> = {
  "dataset-1": [
    {
      id: "1",
      customer_name: "John Doe",
      feedback_text: "Great product! Very satisfied with the quality.",
      sentiment: "positive",
      date: "2024-01-10",
    },
    {
      id: "2",
      customer_name: "Jane Smith",
      feedback_text: "Disappointed with the delivery time. Product is okay.",
      sentiment: "neutral",
      date: "2024-01-11",
    },
    {
      id: "3",
      customer_name: "Bob Johnson",
      feedback_text: "Terrible experience. Would not recommend.",
      sentiment: "negative",
      date: "2024-01-12",
    },
    // Add more mock rows...
    ...Array.from({ length: 147 }, (_, i) => ({
      id: `${i + 4}`,
      customer_name: `Customer ${i + 4}`,
      feedback_text: `Sample feedback text ${i + 4}`,
      sentiment: "",
      date: `2024-01-${(i % 28) + 1}`,
    })),
  ],
  "dataset-2": [
    {
      product_id: "P001",
      product_name: "Wireless Mouse",
      description: "Ergonomic wireless mouse with 6 buttons",
      category: "Electronics",
      price: "29.99",
    },
    {
      product_id: "P002",
      product_name: "Office Chair",
      description: "Comfortable office chair with lumbar support",
      category: "Furniture",
      price: "199.99",
    },
    // Add more mock rows...
    ...Array.from({ length: 318 }, (_, i) => ({
      product_id: `P${String(i + 3).padStart(3, "0")}`,
      product_name: `Product ${i + 3}`,
      description: `Description for product ${i + 3}`,
      category: "",
      price: `${(Math.random() * 200 + 10).toFixed(2)}`,
    })),
  ],
  "dataset-3": [
    {
      ticket_id: "T001",
      subject: "Cannot login to account",
      description: "User is unable to login after password reset",
      priority: "high",
      status: "open",
    },
    {
      ticket_id: "T002",
      subject: "Feature request",
      description: "Would like to see dark mode option",
      priority: "low",
      status: "pending",
    },
    // Add more mock rows...
    ...Array.from({ length: 87 }, (_, i) => ({
      ticket_id: `T${String(i + 3).padStart(3, "0")}`,
      subject: `Support ticket ${i + 3}`,
      description: `Description for ticket ${i + 3}`,
      priority: "",
      status: "open",
    })),
  ],
  "dataset-4": [
    {
      email_id: "E001",
      subject: "Congratulations! You won $1,000,000",
      body: "Click here to claim your prize now!",
      sender: "spam@example.com",
      is_spam: "yes",
    },
    {
      email_id: "E002",
      subject: "Meeting reminder for tomorrow",
      body: "Don't forget our team meeting at 10 AM",
      sender: "colleague@company.com",
      is_spam: "no",
    },
    // Add more mock rows...
    ...Array.from({ length: 498 }, (_, i) => ({
      email_id: `E${String(i + 3).padStart(3, "0")}`,
      subject: `Email subject ${i + 3}`,
      body: `Email body content ${i + 3}`,
      sender: `sender${i + 3}@example.com`,
      is_spam: "",
    })),
  ],
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Fallback to dataset-1 if ID doesn't match
    const datasetData = mockDatasetData[id] || mockDatasetData["dataset-1"]

    return NextResponse.json({
      success: true,
      data: datasetData,
    })
  } catch (error) {
    console.error("[v0] Error fetching dataset data:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch dataset data" }, { status: 500 })
  }
}
