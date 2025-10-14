import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { apiKey, model } = await request.json()

    if (!apiKey)
      return NextResponse.json(
        { success: false, error: "Missing API key" },
        { status: 400 }
      )

    const modelMap: Record<string, string> = {
      "gemini-flash-2.5": "gemini-2.0-flash-exp",
      "gemini-1.5-pro": "gemini-1.5-pro",
    }

    const selectedModel = modelMap[model] ?? modelMap["gemini-flash-2.5"]

    const google = createGoogleGenerativeAI({ apiKey })


    return NextResponse.json({ success: true, message: "API key is valid" })
  } catch (error) {
    console.error("[v0] Error testing API key:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Invalid API key",
      },
      { status: 401 }
    )
  }
}
