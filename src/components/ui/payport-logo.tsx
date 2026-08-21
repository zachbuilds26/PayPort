import Image from "next/image";
import Link from "next/link";

type PayPortLogoProps = {
  href?: string;
  compact?: boolean;
};

export function PayPortLogo({ href = "/", compact = false }: PayPortLogoProps) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1.5" aria-label="PayPort">
      <span
        className={
          compact
            ? "relative size-10 shrink-0"
            : "relative size-11 shrink-0"
        }
        aria-hidden="true"
      >
        <Image
          src="/payport-logo-mark.png"
          alt=""
          fill
          sizes={compact ? "40px" : "44px"}
          unoptimized
          className="object-contain"
          priority
        />
      </span>
      {!compact && (
        <span className="font-display text-[15px] font-semibold tracking-[-0.03em] text-ink">
          PayPort
        </span>
      )}
    </Link>
  );
}
