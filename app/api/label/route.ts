import { NextRequest, NextResponse } from "next/server"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateText } from "ai"

export async function POST(request: NextRequest) {
  try {
    const { rows, model, apiKey, contextColumn } = await request.json()

    // Map model name
    const modelMap: Record<string, string> = {
      "gemini-flash-2.5": "gemini-2.0-flash-exp",
      "gemini-1.5-pro": "gemini-1.5-pro",
    }

    const selectedModel = modelMap[model] || "gemini-2.0-flash-exp"

    // Initialize Google AI (SDK v5)
    const google = createGoogleGenerativeAI({
      apiKey: apiKey,
    })

    const aiModel = google(selectedModel)

    const batchSize = 10
    const labeledRows: any[] = []

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)
      const contexts = batch.map((row: any, idx: number) => `${i + idx + 1}. ${row[contextColumn]}`).join("\n")

      const prompt = `
You are a binary labeling model.
Determine whether each of the following statements is true or false.

Respond ONLY with a JSON array of strings ("true" or "false") in lowercase.
No explanations, no punctuation, no Markdown.

Example input/output:
Input: "Dogs can fly." → Output: "false"
Input: "Water boils at 100°C." → Output: "true"

Entries:
${contexts}

Return format:
["true", "false", "true"]
`.trim()

      const { text } = await generateText({
        model: aiModel,
        prompt,
      })

      let labels: string[]
      try {
        const jsonMatch = text.match(/\[.*\]/s)
        if (jsonMatch) {
          labels = JSON.parse(jsonMatch[0]).map((v: string) => v.toLowerCase().trim())
        } else {
          labels = text
            .split("\n")
            .map((v) => v.toLowerCase().trim())
            .filter((v) => v === "true" || v === "false")
        }
      } catch (e) {
        console.error("[v0] Failed to parse AI response:", text)
        labels = batch.map(() => "error")
      }

      batch.forEach((row: any, idx: number) => {
        labeledRows.push({
          ...row,
          _ai_suggestion: labels[idx] || "error",
        })
      })
    }

    return NextResponse.json({ success: true, data: labeledRows })
  } catch (error) {
    console.error("[v0] Error in label API:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to label data" },
      { status: 500 },
    )
  }
}
