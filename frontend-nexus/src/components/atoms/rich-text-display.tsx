/**
 * RichTextDisplay — renders stored HTML from the RichTextEditor safely.
 *
 * - Applies `.rich-text-content` CSS class (defined in styles.css) for
 *   proper ul/ol bullet styling, headings, blockquotes, etc.
 * - `dangerouslySetInnerHTML` is intentional; content comes from our own editor.
 */
import { cn } from "@/lib/utils";

export interface RichTextDisplayProps {
  html?: string | null;
  fallback?: string;
  className?: string;
}

export function RichTextDisplay({
  html,
  fallback = "",
  className,
}: RichTextDisplayProps) {
  const content = html?.trim();

  // If it's empty or only empty paragraph tags, show the fallback as plain text
  const isEmpty =
    !content || content === "<p></p>" || content === "<p><br></p>";

  if (isEmpty) {
    return fallback ? (
      <p className={cn("text-muted-foreground", className)}>{fallback}</p>
    ) : null;
  }

  return (
    <div
      className={cn("rich-text-content", className)}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
