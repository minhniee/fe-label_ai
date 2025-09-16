import { GraduationCap } from "lucide-react"

interface FPTLogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
}

export function FPTLogo({ size = "md", showText = true }: FPTLogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
  }

  return (
    <div className="flex items-center gap-3">
      <div className="bg-primary rounded-full p-2">
        <GraduationCap className={`${sizeClasses[size]} text-primary-foreground`} />
      </div>
      {showText && (
        <div>
          <h1 className={`${textSizeClasses[size]} font-bold text-foreground`}>F-ALT</h1>
          <p className="text-xs text-muted-foreground">FPTU Admissions Platform</p>
        </div>
      )}
    </div>
  )
}
