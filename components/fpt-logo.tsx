import Image from "next/image";
import Link from "next/link";

interface FPTLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  href?: string;
  /** If false, logo is not clickable and does not navigate */
  clickable?: boolean;
}

export function FPTLogo({
  size = "md",
  href = "/projects",
  clickable = true,
}: FPTLogoProps) {
  const dimension = {
    sm: 100,
    md: 120,
    lg: 140,
  }[size];

  const content = (
    <div
      className={
        "flex items-center gap-3 select-none " +
        (clickable ? "group cursor-pointer" : "cursor-default")
      }
    >
      <Image
        src="/favicon.ico"
        alt="FPT University Logo"
        width={dimension}
        height={dimension}
        priority
      />
    </div>
  );

  if (!clickable) {
    return content;
  }

  return (
    <Link href={href}>
      {content}
    </Link>
  );
}
