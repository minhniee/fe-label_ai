import Image from "next/image";
import Link from "next/link";
import { Montserrat } from "next/font/google"; 

interface FPTLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  href?: string;
}
export const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700"], 
});

export function FPTLogo({
  size = "md",
  showText = true,
  href = "/dashboard",
}: FPTLogoProps) {
  const dimension = {
    sm: 110,
    md: 130,
    lg: 150,
  }[size];

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <Link
      href={href}
      className="flex items-center gap-3 group cursor-pointer select-none"
    >
      <Image
        src="/favicon.ico"
        alt="FPT University Logo"
        width={dimension}
        height={dimension}
        priority
      />
      {showText && (
        <div>
          <h1
            className={`${montserrat.className} ${textSizeClasses[size]} font-semibold tracking-tight text-[color:#e26d28] group-hover:text-[color:#e26a25] transition-colors`}
          >
            Lable-AI
          </h1>
        </div>
      )}
    </Link>
  );
}
