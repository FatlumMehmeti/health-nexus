import type { CSSProperties } from "react";
import { resolveMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import { RichTextDisplay } from "@/components/atoms/rich-text-display";

export interface TenantBrandPreviewProps {
  title?: string | null;
  moto?: string | null;
  aboutText?: string | null;
  logo?: string | null;
  image?: string | null;
  backgroundColor?: string | null;
  foregroundColor?: string | null;
  borderColor?: string | null;
  accentColor?: string | null;
  headerFontFamily?: string | null;
  bodyFontFamily?: string | null;
  className?: string;
  heroClassName?: string;
  fallbackTitle?: string;
  fallbackMoto?: string;
  fallbackAbout?: string;
  emptyHeroLabel?: string;
}

function getInitials(value: string): string {
  return value
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TenantBrandPreview({
  title,
  moto,
  aboutText,
  logo,
  image,
  backgroundColor,
  foregroundColor,
  borderColor,
  accentColor,
  headerFontFamily,
  bodyFontFamily,
  className,
  heroClassName,
  fallbackTitle = "Landing section title",
  fallbackMoto = "Moto preview",
  fallbackAbout = "Your about text preview will appear here.",
  emptyHeroLabel = "Hero image preview",
}: TenantBrandPreviewProps) {
  const resolvedTitle = title?.trim() || fallbackTitle;
  const resolvedMoto = moto?.trim() || fallbackMoto;
  const resolvedAbout = aboutText?.trim() || fallbackAbout;
  const logoUrl = resolveMediaUrl(logo);
  const heroUrl = resolveMediaUrl(image);

  const cardStyle: CSSProperties = {
    ...(backgroundColor && backgroundColor !== "transparent"
      ? { backgroundColor }
      : undefined),
    ...(foregroundColor ? { color: foregroundColor } : undefined),
    ...(borderColor ? { borderColor } : undefined),
    ...(bodyFontFamily ? { fontFamily: bodyFontFamily } : undefined),
  };

  const titleStyle: CSSProperties = {
    ...(headerFontFamily ? { fontFamily: headerFontFamily } : undefined),
  };

  const accentStyle: CSSProperties = {
    ...(accentColor ? { color: accentColor } : undefined),
  };

  return (
    <div
      className={cn("flex h-full flex-col overflow-hidden rounded-lg border shadow-sm", className)}
      style={cardStyle}
    >
      <div className={cn("relative h-48 w-full shrink-0 bg-muted/40", heroClassName)}>
        {heroUrl ? (
          <img
            src={heroUrl}
            alt={resolvedTitle}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {emptyHeroLabel}
          </div>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="flex shrink-0 items-start gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={resolvedTitle}
              className="h-10 w-10 rounded-lg border bg-white object-contain p-1"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted text-xs font-semibold">
              {getInitials(resolvedTitle)}
            </div>
          )}
          <div className="min-w-0">
            <p
              className="truncate text-xs font-semibold uppercase tracking-[0.18em]"
              style={accentStyle}
            >
              {resolvedMoto}
            </p>
            <h3 className="mt-1 text-lg font-semibold" style={titleStyle}>
              {resolvedTitle}
            </h3>
          </div>
        </div>
        <div className="mt-3 flex min-h-0 flex-1 flex-col">
          <RichTextDisplay
            html={resolvedAbout}
            fallback={fallbackAbout}
            className="text-sm leading-6 opacity-90 line-clamp-4"
          />
          <button
            type="button"
            className={cn(
              "mt-auto pt-2 text-xs font-semibold hover:underline",
              !accentColor && "text-primary"
            )}
            style={accentStyle}
          >
            Read more
          </button>
        </div>
      </div>
    </div>
  );
}
