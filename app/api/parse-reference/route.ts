import { type NextRequest, NextResponse } from "next/server"
import pdf from "pdf-parse"
import mammoth from "mammoth"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    const buffer = Buffer.from(await file.arrayBuffer())

    let content = ""

    if (fileName.endsWith(".pdf")) {
      // Parse PDF
      const data = await pdf(buffer)
      content = data.text
    } else if (fileName.endsWith(".docx")) {
      // Parse DOCX
      const result = await mammoth.extractRawText({ buffer })
      content = result.value
    } else if (fileName.endsWith(".txt")) {
      // Parse TXT
      content = buffer.toString("utf-8")
    } else {
      return NextResponse.json({ success: false, error: "Unsupported file type" }, { status: 400 })
    }

    // Clean up the content
    content = content.trim().replace(/\s+/g, " ")

    if (!content) {
      return NextResponse.json({ success: false, error: "No text content found in file" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      content,
      fileName: file.name,
    })
  } catch (error) {
    console.error("[v0] Error parsing reference file:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to parse file" },
      { status: 500 },
    )
  }
}
