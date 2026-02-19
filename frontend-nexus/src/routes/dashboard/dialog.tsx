import { createFileRoute } from "@tanstack/react-router";
import { useDialogStore } from "@/stores/use-dialog-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/dashboard/dialog")({
  component: DialogExamplePage,
});

function DialogExamplePage() {
  const { open, close } = useDialogStore();

  const handleSimple = () => {
    open({
      title: "Simple dialog",
      content: (
        <p className="text-muted-foreground">
          This dialog was opened from anywhere using{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
            useDialogStore.getState().open()
          </code>
        </p>
      ),
    });
  };

  const handleWithFooter = () => {
    open({
      title: "Confirm action",
      content: (
        <p className="text-muted-foreground">
          Are you sure you want to proceed? This action cannot be undone.
        </p>
      ),
      footer: (
        <>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              alert("Done");
              close();
            }}
          >
            Confirm
          </Button>
        </>
      ),
    });
  };

  const handleOutsideReact = () => {
    useDialogStore.getState().open({
      title: "Called outside React",
      content: (
        <p className="text-muted-foreground">
          Opened via{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
            getState().open()
          </code>{" "}
          — works from event handlers, API callbacks, etc.
        </p>
      ),
      footer: (
        <Button onClick={() => useDialogStore.getState().close()}>Close</Button>
      ),
    });
  };

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Global Dialog</h1>
        <p className="mt-2 text-muted-foreground">
          Open the global dialog from anywhere using Zustand.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>
            Import{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
              useDialogStore
            </code>{" "}
            and call{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
              open()
            </code>{" "}
            with title and content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
            {`open({
  title: 'Confirm action',
  content: <p>Your content here</p>,
  footer: <Button onClick={close}>OK</Button>,
})`}
          </pre>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSimple}>Simple dialog</Button>
        <Button variant="secondary" onClick={handleWithFooter}>
          Dialog with footer
        </Button>
        <Button variant="outline" onClick={handleOutsideReact}>
          Open outside React
        </Button>
      </div>
    </div>
  );
}
