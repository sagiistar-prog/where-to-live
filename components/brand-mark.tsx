import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  href?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  wordClassName?: string;
  iconClassName?: string;
  showAi?: boolean;
};

const sizeClass = {
  sm: {
    wrap: "gap-2",
    icon: "h-9 w-9 rounded-md",
    word: "text-base",
    ai: "text-[0.62rem]",
  },
  md: {
    wrap: "gap-3",
    icon: "h-10 w-10 rounded-lg",
    word: "text-xl",
    ai: "text-[0.68rem]",
  },
  lg: {
    wrap: "gap-3",
    icon: "h-12 w-12 rounded-lg",
    word: "text-2xl",
    ai: "text-xs",
  },
};

export function BrandMark({
  href,
  size = "md",
  className,
  wordClassName,
  iconClassName,
  showAi = true,
}: BrandMarkProps) {
  const content = (
    <>
      <span
        className={cn(
          "brand-icon shrink-0 border border-border bg-card shadow-[0_12px_32px_oklch(var(--foreground)/0.08)]",
          sizeClass[size].icon,
          iconClassName,
        )}
        aria-hidden="true"
      />
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span
          className={cn("brand-wordmark", sizeClass[size].word, wordClassName)}
          aria-label="住哪儿"
        >
          <span className="brand-letter brand-letter-1" aria-hidden="true">
            住
          </span>
          <span className="brand-letter brand-letter-2" aria-hidden="true">
            哪
          </span>
          <span className="brand-letter brand-letter-3" aria-hidden="true">
            儿
          </span>
        </span>
        {showAi ? (
          <span
            className={cn(
              "rounded-full border border-current/20 px-1.5 py-0.5 font-semibold leading-none text-primary/90",
              sizeClass[size].ai,
            )}
          >
            AI
          </span>
        ) : null}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn("flex min-w-0 items-center", sizeClass[size].wrap, className)}>
        {content}
      </Link>
    );
  }

  return (
    <span className={cn("flex min-w-0 items-center", sizeClass[size].wrap, className)}>
      {content}
    </span>
  );
}
