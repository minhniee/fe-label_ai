import { type NextRequest, NextResponse } from "next/server"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateText } from "ai"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { topic, rowCount, columns, instructions, apiKey } = body

    if (!topic || !apiKey) {
      return NextResponse.json({ 
        status: "error", 
        error: "Topic and API key are required" 
      }, { status: 400 })
    }

    console.log("[v0] Generating dataset with params:", { topic, rowCount, columns })

    // Create Google provider with user's API key
    const google = createGoogleGenerativeAI({
      apiKey: apiKey,
    })

    // Build the prompt for data generation
    const prompt = `Generate a CSV dataset with the following specifications:

Topic: ${topic}
Number of rows: ${rowCount || 20}
Columns: ${columns.join(", ")}
${instructions ? `Additional instructions: ${instructions}` : ""}

Requirements:
1. Generate realistic, diverse data that matches the topic
2. First line must be the column headers (${columns.join(", ")})
3. Each subsequent line is one data row
4. Use commas to separate values
5. If a value contains a comma, wrap it in quotes
6. Make the data varied and realistic
7. Do not include any markdown formatting or code blocks
8. Return ONLY the CSV data, nothing else

Generate the CSV now:`

    const { text } = await generateText({
      model: google("gemini-2.0-flash-exp"),
      prompt: prompt,
      maxTokens: 4000,
    })

    console.log("[v0] Generated CSV preview:", text.substring(0, 200))

    // Clean up the response (remove any markdown formatting if present)
    let csv = text.trim()
    csv = csv.replace(/```csv\n?/g, "")
    csv = csv.replace(/```\n?/g, "")
    csv = csv.trim()

    // Parse CSV into array of objects for the new format
    const lines = csv.split("\n")
    const headers = lines[0].split(",").map((h: string) => h.trim())
    const data = lines.slice(1).map((line: string) => {
      const values = line.split(",").map((v: string) => v.trim())
      const row: any = {}
      headers.forEach((header: string, index: number) => {
        row[header] = values[index] || ""
      })
      return row
    })

    return NextResponse.json({
      status: "success",
      data: data,
    })
  } catch (error: any) {
    console.error("[v0] Error generating dataset:", error)
    return NextResponse.json(
      {
        status: "error",
        error: error.message || "Failed to generate dataset",
      },
      { status: 500 },
    )
  }
}
