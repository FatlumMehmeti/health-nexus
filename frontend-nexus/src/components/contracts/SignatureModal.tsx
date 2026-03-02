import * as React from "react";
import SignatureCanvas from "react-signature-canvas";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onConfirm: (file: File) => Promise<void>;
  isSubmitting?: boolean;
}

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 140;

export function SignatureModal({
  open,
  onOpenChange,
  title,
  description = "Draw your signature in the box below, then click Save.",
  onConfirm,
  isSubmitting = false,
}: SignatureModalProps) {
  const canvasRef = React.useRef<SignatureCanvas | null>(null);

  const handleClear = () => {
    canvasRef.current?.clear();
  };

  const handleSave = async () => {
    const pad = canvasRef.current;
    if (!pad) return;
    if (pad.isEmpty()) {
      toast.error("Please draw your signature first.");
      return;
    }

    const canvas = pad.getCanvas();
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const blob = await fetch(dataUrl).then((r) => r.blob());
    const file = new File([blob], `signature_${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    try {
      await onConfirm(file);
      canvasRef.current?.clear();
      onOpenChange(false);
    } catch {
      /* Error shown by parent; modal stays open */
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      canvasRef.current?.clear();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative mx-auto w-full max-w-[360px] overflow-hidden rounded-lg border-2 border-input bg-white shadow-sm touch-none">
            <SignatureCanvas
              ref={canvasRef}
              canvasProps={{
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                className: "block touch-none select-none",
                style: {
                  display: "block",
                  width: CANVAS_WIDTH,
                  height: CANVAS_HEIGHT,
                },
              }}
              penColor="#1a1a1a"
              backgroundColor="white"
              clearOnResize={false}
              minWidth={1}
              maxWidth={2.5}
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-6 border-b-2 border-dashed border-muted-foreground/50"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute bottom-2 left-3 text-xs font-medium text-muted-foreground"
              aria-hidden
            >
              Sign here
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Draw your signature above using a mouse or touch. Clear to redraw.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={isSubmitting}
          >
            Clear
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            Save signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
