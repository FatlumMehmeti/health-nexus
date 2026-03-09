import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { aiAssistantService } from '@/services/ai-assistant.service';
import { useMutation } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';
import { Bot, MessageSquare, Send, X } from 'lucide-react';
import { useMemo, useState } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function formatPageLabel(pathname: string): string {
  if (!pathname || pathname === '/') return 'Home';
  return pathname
    .split('/')
    .filter(Boolean)
    .map((part) =>
      part
        .replace(/[-$]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
    )
    .join(' / ');
}

export function AIAssistantWidget() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Ask about Health Nexus workflows like enrollment, tenant setup, booking, plans, or feature flags.',
    },
  ]);

  const pageLabel = useMemo(
    () => formatPageLabel(pathname),
    [pathname]
  );

  const chatMutation = useMutation({
    mutationFn: (content: string) =>
      aiAssistantService.chat({
        message: content,
        page: pageLabel,
      }),
    onSuccess: (data) => {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.answer,
        },
      ]);
    },
    onError: () => {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            "I couldn't reach the assistant right now. Try again in a moment.",
        },
      ]);
    },
  });

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (!trimmed || chatMutation.isPending) return;

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
      },
    ]);
    setMessage('');
    chatMutation.mutate(trimmed);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-start gap-3">
      {isOpen ? (
        <Card className="w-[min(92vw,24rem)] border-border/70 bg-background/95 shadow-2xl backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm">
                  Health Nexus AI
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Context: {pageLabel}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsOpen(false)}
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {messages.map((entry) => (
                <div
                  key={entry.id}
                  className={
                    entry.role === 'user'
                      ? 'ml-8 rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground'
                      : 'mr-8 rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-foreground'
                  }
                >
                  <p className="whitespace-pre-wrap leading-6">
                    {entry.content}
                  </p>
                </div>
              ))}
              {chatMutation.isPending ? (
                <div className="mr-8 rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
                  Thinking...
                </div>
              ) : null}
            </div>

            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Ask about this page"
              />
              <Button
                size="icon"
                onClick={handleSubmit}
                disabled={!message.trim() || chatMutation.isPending}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Button
        size="lg"
        className="h-14 rounded-full px-5 shadow-xl"
        onClick={() => setIsOpen((open) => !open)}
      >
        <MessageSquare className="h-5 w-5" />
        AI Assistant
      </Button>
    </div>
  );
}
