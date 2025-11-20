import Image from "next/image";
import Link from "next/link";

interface FPTLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  href?: string;
}

export function FPTLogo({
  size = "md",
  href = "/projects",
}: FPTLogoProps) {
  const dimension = {
    sm: 100,
    md: 120,
    lg: 140,
  }[size];

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
    </Link>
  );
}
