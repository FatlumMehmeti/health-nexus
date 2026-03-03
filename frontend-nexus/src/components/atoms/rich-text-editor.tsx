/**
 * RichTextEditor — reusable Tiptap-powered HTML editor atom.
 *
 * Props:
 *   value        — controlled HTML string (stored / initial value)
 *   onChange     — called with the new HTML string on every content change
 *   placeholder  — editor placeholder text (optional)
 *   label        — optional label rendered above the toolbar
 *   error        — optional validation error message shown below
 *   id           — id forwarded to the label's htmlFor
 *   minHeight    — min-height of the editable area (default "10rem")
 *   disabled     — prevents editing
 */
import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------
interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-40",
        active && "bg-accent text-accent-foreground font-semibold",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px self-center bg-border" aria-hidden />;
}

// ---------------------------------------------------------------------------
// SVG icons (inline to avoid extra deps)
// ---------------------------------------------------------------------------
const BoldIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
  </svg>
);

const ItalicIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="4" x2="10" y2="4" />
    <line x1="14" y1="20" x2="5" y2="20" />
    <line x1="15" y1="4" x2="9" y2="20" />
  </svg>
);

const UnderlineIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
    <line x1="4" y1="21" x2="20" y2="21" />
  </svg>
);

const BulletListIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="6" x2="20" y2="6" />
    <line x1="9" y1="12" x2="20" y2="12" />
    <line x1="9" y1="18" x2="20" y2="18" />
    <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const OrderedListIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="10" y1="6" x2="21" y2="6" />
    <line x1="10" y1="12" x2="21" y2="12" />
    <line x1="10" y1="18" x2="21" y2="18" />
    <text x="2" y="8" fontSize="7" fill="currentColor" stroke="none" fontFamily="system-ui">1.</text>
    <text x="2" y="14" fontSize="7" fill="currentColor" stroke="none" fontFamily="system-ui">2.</text>
    <text x="2" y="20" fontSize="7" fill="currentColor" stroke="none" fontFamily="system-ui">3.</text>
  </svg>
);

const BlockquoteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
  </svg>
);

const HeadingIcon = ({ level }: { level: 1 | 2 | 3 }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12h8" />
    <path d="M4 18V6" />
    <path d="M12 18V6" />
    <text x="16" y="18" fontSize="9" fill="currentColor" stroke="none" fontFamily="system-ui">{level}</text>
  </svg>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export interface RichTextEditorProps {
  id?: string;
  label?: string;
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  minHeight?: string;
  className?: string;
  wrapperClassName?: string;
  required?: boolean;
}

export function RichTextEditor({
  id,
  label,
  value = "",
  onChange,
  placeholder = "Start typing…",
  error,
  disabled = false,
  minHeight = "10rem",
  className,
  wrapperClassName,
  required,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // StarterKit includes: bold, italic, strike, code, heading,
        // bulletList, orderedList, listItem, blockquote, horizontalRule,
        // hardBreak, history, paragraph, text, document
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editable: !disabled,
    onUpdate({ editor }) {
      onChange?.(editor.getHTML());
    },
  });

  // Sync external value changes (e.g. reset)
  const prevValue = React.useRef(value);
  React.useEffect(() => {
    if (!editor) return;
    if (value !== prevValue.current && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
    prevValue.current = value;
  }, [editor, value]);

  // Update editable state
  React.useEffect(() => {
    if (editor && editor.isEditable !== !disabled) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  if (!editor) return null;

  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    editor.isActive(name, attrs);

  return (
    <div className={cn("space-y-2", wrapperClassName)}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && (
            <span className="text-destructive -ml-0.5" aria-hidden>
              *
            </span>
          )}
        </Label>
      )}

      {/* Toolbar */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-0.5 rounded-t-md border border-b-0 bg-muted/40 px-2 py-1.5",
          disabled && "opacity-50 pointer-events-none",
        )}
        aria-label="Text formatting toolbar"
      >
        {/* Headings */}
        <ToolbarButton
          title="Heading 2"
          active={isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <HeadingIcon level={2} />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          active={isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <HeadingIcon level={3} />
        </ToolbarButton>

        <Divider />

        {/* Inline marks */}
        <ToolbarButton
          title="Bold"
          active={isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <BoldIcon />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon />
        </ToolbarButton>

        <Divider />

        {/* Lists */}
        <ToolbarButton
          title="Bullet list"
          active={isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <BulletListIcon />
        </ToolbarButton>
        <ToolbarButton
          title="Ordered list"
          active={isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <OrderedListIcon />
        </ToolbarButton>

        <Divider />

        {/* Block */}
        <ToolbarButton
          title="Blockquote"
          active={isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <BlockquoteIcon />
        </ToolbarButton>
      </div>

      {/* Editor area */}
      <div
        className={cn(
          "w-full rounded-b-md border bg-background text-sm shadow-xs",
          "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
          error && "border-destructive focus-within:ring-destructive/30",
          disabled && "cursor-not-allowed bg-muted/30",
          "transition-colors",
          className,
        )}
        style={{ minHeight }}
      >
        <EditorContent
          id={id}
          editor={editor}
          className="rich-text-editor-content p-3 focus:outline-none"
        />
      </div>

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
