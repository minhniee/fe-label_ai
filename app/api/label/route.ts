import { type NextRequest, NextResponse } from "next/server"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateText } from "ai"

export async function POST(request: NextRequest) {
  try {
    const { rows, model, apiKey, contextColumn, referenceContext } = await request.json()

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: "No rows provided for labeling" }, { status: 400 })
    }

    if (!contextColumn) {
      return NextResponse.json({ success: false, error: "Context column is required" }, { status: 400 })
    }

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "API key is required. Please provide your Gemini API key." },
        { status: 400 },
      )
    }

    // Map model name
    const modelMap: Record<string, string> = {
      "gemini-flash-2.5": "gemini-2.0-flash-exp",
      "gemini-1.5-pro": "gemini-1.5-pro",
    }

    const selectedModel = modelMap[model] || "gemini-2.0-flash-exp"

    let google
    let aiModel
    try {
      google = createGoogleGenerativeAI({
        apiKey: apiKey,
      })
      aiModel = google(selectedModel)
    } catch (error) {
      console.error("[v0] Error initializing AI model:", error)
      return NextResponse.json(
        { success: false, error: "Failed to initialize AI model. Please check your API key." },
        { status: 500 },
      )
    }

    const batchSize = 10
    const labeledRows: any[] = []

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)
      const contexts = batch.map((row: any, idx: number) => `${i + idx + 1}. ${row[contextColumn]}`).join("\n")

      const prompt = `
You are a binary labeling model with explanation capabilities.
${referenceContext ? `\n=== REFERENCE CONTEXT ===\n${referenceContext}\n\nUse the above reference information to inform your labeling decisions.\n` : ""}
Determine whether each of the following statements is true or false, and provide a brief explanation for your decision you can access internet to give truth reasource.

Respond ONLY with a JSON array of objects with "label" (string: "true" or "false") and "reasoning" (string: brief explanation).
No extra text, no Markdown formatting.

Example format:
[
  {"label": "false", "reasoning": "Dogs are mammals and cannot fly naturally"},
  {"label": "true", "reasoning": "Water boils at 100°C at standard atmospheric pressure"}
]

Entries:
${contexts}
`.trim()

      try {
        const { text } = await generateText({
          model: aiModel,
          prompt,
        })

        console.log("[v0] AI Response:", text)

        let results: Array<{ label: string; reasoning: string }>
        try {
          const jsonMatch = text.match(/\[.*\]/s)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            results = parsed.map((item: any) => ({
              label: String(item.label || "")
                .toLowerCase()
                .trim(),
              reasoning: String(item.reasoning || "No explanation provided").trim(),
            }))
          } else {
            throw new Error("No JSON array found in AI response")
          }
        } catch (parseError) {
          console.error("[v0] Failed to parse AI response:", text)
          return NextResponse.json(
            {
              success: false,
              error: `Failed to parse AI response for batch ${Math.floor(i / batchSize) + 1}. The AI did not return valid JSON. Please try again.`,
            },
            { status: 500 },
          )
        }

        if (results.length !== batch.length) {
          return NextResponse.json(
            {
              success: false,
              error: `AI returned ${results.length} results but expected ${batch.length}. Please try again.`,
            },
            { status: 500 },
          )
        }

        batch.forEach((row: any, idx: number) => {
          labeledRows.push({
            ...row,
            _ai_suggestion: results[idx].label,
            _ai_reasoning: results[idx].reasoning,
          })
        })
      } catch (error) {
        console.error(`[v0] Error processing batch ${Math.floor(i / batchSize) + 1}:`, error)
        return NextResponse.json(
          {
            success: false,
            error: `API request failed for batch ${Math.floor(i / batchSize) + 1}: ${error instanceof Error ? error.message : "Unknown error"}. Please check your API key and try again.`,
          },
          { status: 500 },
        )
      }
    }

    console.log("[v0] Successfully labeled all rows")
    return NextResponse.json({ success: true, data: labeledRows })
  } catch (error) {
    console.error("[v0] Error in label API:", error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to label data. Please check your API key and try again.",
      },
      { status: 500 },
    )
  }
}
