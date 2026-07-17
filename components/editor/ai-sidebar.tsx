"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  Bot,
  X,
  Send,
  FileText,
  Download,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useEventListener,
  useUpdateMyPresence,
  useBroadcastEvent,
  useSelf,
  useStorage,
} from "@liveblocks/react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { cn } from "@/lib/utils";

const TERMINAL_STATUSES = [
  "COMPLETED",
  "FAILED",
  "CANCELED",
  "CRASHED",
  "TIMED_OUT",
  "INTERRUPTED",
  "SYSTEM_ERROR",
  "INVALID_PAYLOAD",
  "EXPIRED",
  "ABORTED",
] as const;

interface SpecItem {
  id: string;
  filePath: string;
  createdAt: string;
}

interface LocalMessage {
  id: string;
  sender: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getFilename(filePath: string): string {
  const clean = filePath.split("?")[0];
  return clean.split("/").at(-1) ?? "spec.md";
}

function formatSpecDate(date: string): string {
  return new Date(date).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface RunTrackerProps {
  runId: string;
  publicToken: string;
  onTerminal: (status: string, output: unknown) => void;
}

function RunTracker({ runId, publicToken, onTerminal }: RunTrackerProps) {
  const { run } = useRealtimeRun(runId, { accessToken: publicToken });
  const firedRef = useRef(false);

  useEffect(() => {
    if (!run || firedRef.current) return;
    if (!(TERMINAL_STATUSES as readonly string[]).includes(run.status)) return;
    firedRef.current = true;
    onTerminal(run.status, run.output);
  }, [run?.status, run?.id, onTerminal]);

  return null;
}

interface AiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  projectId: string;
}

const STARTER_CHIPS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
];

function formatTime(createdAt: number): string {
  return new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AiSidebar({
  isOpen,
  onClose,
  roomId,
  projectId,
}: AiSidebarProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>("");
  const [chatInput, setChatInput] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);
  const architectScrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Separate message states for AI Architect vs Room Chat
  const [architectMessages, setArchitectMessages] = useState<LocalMessage[]>(
    [],
  );
  const [chatMessages, setChatMessages] = useState<LocalMessage[]>([]);

  // Spec state
  const [specs, setSpecs] = useState<SpecItem[]>([]);
  const [specsLoading, setSpecsLoading] = useState(false);
  const [selectedSpec, setSelectedSpec] = useState<SpecItem | null>(null);
  const [specContent, setSpecContent] = useState<string | null>(null);
  const [specContentLoading, setSpecContentLoading] = useState(false);
  const [specModalOpen, setSpecModalOpen] = useState(false);
  const [isSpecGenerating, setIsSpecGenerating] = useState(false);
  const [specRunId, setSpecRunId] = useState<string | null>(null);
  const [specPublicToken, setSpecPublicToken] = useState<string | null>(null);

  // Canvas storage for spec generation context
  const nodesArray = useStorage((root) => {
    const m = root.flow?.nodes;
    return m ? Object.values(m) : [];
  });
  const edgesArray = useStorage((root) => {
    const m = root.flow?.edges;
    return m ? Object.values(m) : [];
  });

  const self = useSelf();
  const updateMyPresence = useUpdateMyPresence();
  const broadcastEvent = useBroadcastEvent();

  const addArchitectMessage = useCallback((msg: LocalMessage) => {
    setArchitectMessages((prev) => [...prev, msg]);
  }, []);

  const addChatMessage = useCallback((msg: LocalMessage) => {
    setChatMessages((prev) => [...prev, msg]);
  }, []);

  const fetchSpecs = useCallback(() => {
    setSpecsLoading(true);
    fetch(`/api/projects/${projectId}/specs`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) =>
        setSpecs(Array.isArray(data) ? (data as SpecItem[]) : []),
      )
      .catch(() => setSpecs([]))
      .finally(() => setSpecsLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (!isOpen) return;
    fetchSpecs();
  }, [isOpen, fetchSpecs]);

  const handleSpecRunTerminal = useCallback(
    (status: string) => {
      setIsSpecGenerating(false);
      setSpecRunId(null);
      setSpecPublicToken(null);
      if (status === "COMPLETED") fetchSpecs();
    },
    [fetchSpecs],
  );

  const handleRunTerminal = useCallback(
    (status: string, output: unknown) => {
      const isSuccess = status === "COMPLETED";
      const typedOutput = output as { summary?: string } | undefined;
      const content = isSuccess
        ? (typedOutput?.summary ?? "Design applied to canvas.")
        : "ArchFlow AI encountered an error. Please try again.";

      const msg: LocalMessage = {
        id: genId(),
        sender: "ArchFlow AI",
        role: "assistant",
        content,
        createdAt: Date.now(),
      };

      addArchitectMessage(msg);
      broadcastEvent({ type: "architect-message", ...msg });

      setIsLoading(false);
      setStatusText("");
      setRunId(null);
      setPublicToken(null);
      updateMyPresence({ thinking: false });
    },
    [addArchitectMessage, broadcastEvent, updateMyPresence],
  );

  // Route incoming broadcast events to the correct state
  useEventListener(({ event }) => {
    if (event.type === "ai-status") {
      setStatusText(event.message);
      return;
    }
    if (event.type === "architect-message") {
      const { type: _type, ...msg } = event;
      setArchitectMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg as LocalMessage];
      });
      return;
    }
    if (event.type === "chat-message") {
      const { type: _type, ...msg } = event;
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg as LocalMessage];
      });
    }
  });

  // Auto-scroll architect tab to bottom on new messages
  useEffect(() => {
    const el = architectScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [architectMessages.length]);

  // Auto-scroll chat tab to bottom on new messages
  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages.length]);

  const handleGenerateSpec = useCallback(async () => {
    if (isSpecGenerating) return;
    setIsSpecGenerating(true);

    const nodes = nodesArray ?? [];
    const edges = edgesArray ?? [];
    const chatHistory = architectMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      const res = await fetch("/api/ai/spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, chatHistory, nodes, edges }),
      });
      if (!res.ok) throw new Error("Spec generation failed");
      const { runId: newSpecRunId } = (await res.json()) as { runId: string };

      const tokenRes = await fetch("/api/ai/spec/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: newSpecRunId }),
      });
      if (!tokenRes.ok) throw new Error("Token request failed");
      const { token } = (await tokenRes.json()) as { token: string };

      setSpecRunId(newSpecRunId);
      setSpecPublicToken(token);
    } catch {
      setIsSpecGenerating(false);
    }
  }, [isSpecGenerating, roomId, nodesArray, edgesArray, architectMessages]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      const ta = e.target;
      ta.style.height = "72px";
      ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    },
    [],
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setIsLoading(true);
    updateMyPresence({ thinking: true });

    if (textareaRef.current) {
      textareaRef.current.style.height = "72px";
    }

    const userMsg: LocalMessage = {
      id: genId(),
      sender: self?.info?.name ?? "Unknown",
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    addArchitectMessage(userMsg);
    broadcastEvent({ type: "architect-message", ...userMsg });

    broadcastEvent({
      type: "ai-status",
      message: "ArchFlow AI is analyzing your request…",
      status: "start",
    });
    setStatusText("ArchFlow AI is analyzing your request…");

    try {
      const designRes = await fetch("/api/ai/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, roomId, projectId }),
      });

      if (!designRes.ok) throw new Error("Design request failed");

      const { runId: newRunId } = (await designRes.json()) as { runId: string };

      const tokenRes = await fetch("/api/ai/design/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: newRunId }),
      });

      if (!tokenRes.ok) throw new Error("Token request failed");

      const { token } = (await tokenRes.json()) as { token: string };

      setRunId(newRunId);
      setPublicToken(token);
    } catch {
      const errMsg: LocalMessage = {
        id: genId(),
        sender: "ArchFlow AI",
        role: "assistant",
        content: "Failed to reach ArchFlow AI. Please try again.",
        createdAt: Date.now(),
      };
      addArchitectMessage(errMsg);
      broadcastEvent({ type: "architect-message", ...errMsg });

      setIsLoading(false);
      setStatusText("");
      updateMyPresence({ thinking: false });
    }
  }, [
    input,
    isLoading,
    roomId,
    projectId,
    updateMyPresence,
    broadcastEvent,
    addArchitectMessage,
    self,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleChip = useCallback((chip: string) => {
    setInput(chip);
    if (textareaRef.current) {
      textareaRef.current.style.height = "72px";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
      textareaRef.current.focus();
    }
  }, []);

  const handleChatInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setChatInput(e.target.value);
      const ta = e.target;
      ta.style.height = "72px";
      ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    },
    [],
  );

  const handleChatSend = useCallback(async () => {
    const text = chatInput.trim();
    if (!text) return;

    setChatError(null);

    const msg: LocalMessage = {
      id: genId(),
      sender: self?.info?.name ?? "Unknown",
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    addChatMessage(msg);
    broadcastEvent({ type: "chat-message", ...msg });

    setChatInput("");
    if (chatTextareaRef.current) {
      chatTextareaRef.current.style.height = "72px";
    }
  }, [chatInput, broadcastEvent, addChatMessage, self]);

  const handleChatKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleChatSend();
      }
    },
    [handleChatSend],
  );

  const handleSpecClick = useCallback(
    async (spec: SpecItem) => {
      setSelectedSpec(spec);
      setSpecContent(null);
      setSpecContentLoading(true);
      setSpecModalOpen(true);

      try {
        const res = await fetch(`/api/projects/${projectId}/specs/${spec.id}`);
        if (!res.ok) throw new Error("Failed to fetch spec");
        const text = await res.text();
        setSpecContent(text);
      } catch {
        setSpecContent(null);
      } finally {
        setSpecContentLoading(false);
      }
    },
    [projectId],
  );

  const handleSpecDownload = useCallback(
    (specId: string) => {
      const a = document.createElement("a");
      a.href = `/api/projects/${projectId}/specs/${specId}/download`;
      a.download = `spec-${specId}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    [projectId],
  );

  const handleModalClose = useCallback(() => {
    setSpecModalOpen(false);
    setSelectedSpec(null);
    setSpecContent(null);
  }, []);

  return (
    <>
      {runId && publicToken && (
        <RunTracker
          runId={runId}
          publicToken={publicToken}
          onTerminal={handleRunTerminal}
        />
      )}
      {specRunId && specPublicToken && (
        <RunTracker
          runId={specRunId}
          publicToken={specPublicToken}
          onTerminal={handleSpecRunTerminal}
        />
      )}

      {/* Spec preview modal */}
      <Dialog
        open={specModalOpen}
        onOpenChange={(open) => {
          if (!open) handleModalClose();
        }}
      >
        <DialogContent
          showCloseButton
          className="max-w-2xl border-border-default bg-bg-surface"
        >
          <DialogHeader>
            <DialogTitle className="pr-6 text-sm font-medium text-text-primary">
              {selectedSpec
                ? getFilename(selectedSpec.filePath)
                : "Spec Preview"}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] min-w-0 rounded-xl border border-border-subtle bg-bg-elevated">
            <div className="p-4">
              {specContentLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
                </div>
              ) : specContent ? (
                <div
                  className={cn(
                    "text-sm text-text-secondary leading-relaxed break-words",
                    "[&_h1]:text-base [&_h1]:font-bold [&_h1]:text-text-primary [&_h1]:mb-3 [&_h1]:mt-0",
                    "[&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-text-primary [&_h2]:mb-2 [&_h2]:mt-4",
                    "[&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-text-secondary [&_h3]:mb-1.5 [&_h3]:mt-3",
                    "[&_p]:mb-2 [&_p]:leading-relaxed",
                    "[&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2",
                    "[&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2",
                    "[&_li]:mb-1",
                    "[&_code]:font-mono [&_code]:text-xs [&_code]:bg-bg-subtle [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-accent-ai-text",
                    "[&_pre]:bg-bg-subtle [&_pre]:p-3 [&_pre]:rounded-xl [&_pre]:mb-2 [&_pre]:overflow-x-auto",
                    "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
                    "[&_strong]:font-semibold [&_strong]:text-text-primary",
                    "[&_blockquote]:border-l-2 [&_blockquote]:border-border-subtle [&_blockquote]:pl-3 [&_blockquote]:text-text-muted [&_blockquote]:italic",
                  )}
                >
                  <ReactMarkdown>{specContent}</ReactMarkdown>
                </div>
              ) : (
                <p className="py-8 text-center text-xs text-text-muted">
                  Failed to load spec content.
                </p>
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-end border-t border-border-default pt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                selectedSpec && handleSpecDownload(selectedSpec.id)
              }
              className="h-7 gap-1.5 rounded-lg border-border-subtle px-3 text-xs text-text-secondary hover:border-border-default hover:text-text-primary"
            >
              <Download className="h-3 w-3" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <aside
        className={cn(
          "fixed inset-y-3 right-3 top-15 z-40 hidden w-84 flex-col rounded-3xl border border-border-subtle bg-bg-surface/95 backdrop-blur-xl transition-transform duration-200 md:flex",
          isOpen ? "translate-x-0" : "translate-x-[calc(100%+1rem)]",
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border-default px-5 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-ai/15">
            <Bot className="h-4 w-4 text-accent-ai-text" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary">
              AI Workspace
            </p>
            <p className="text-xs text-text-muted">
              Collaborate with ArchFlow AI
            </p>
          </div>
          {isLoading && (
            <div className="flex items-center gap-1 rounded-full bg-accent-ai/15 px-2 py-0.5 text-[10px] text-accent-ai-text">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              <span>Working</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <Tabs
          defaultValue="architect"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <TabsList className="mx-4 mt-3 h-auto shrink-0 rounded-xl bg-bg-subtle p-1">
            <TabsTrigger
              value="architect"
              className="rounded-lg px-3 py-1.5 text-xs font-medium data-active:bg-accent-ai data-active:text-white data-active:shadow-none"
            >
              AI Architect
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="rounded-lg px-3 py-1.5 text-xs font-medium data-active:bg-accent-ai data-active:text-white data-active:shadow-none"
            >
              Chat
            </TabsTrigger>
            <TabsTrigger
              value="specs"
              className="rounded-lg px-3 py-1.5 text-xs font-medium data-active:bg-accent-ai data-active:text-white data-active:shadow-none"
            >
              Specs
            </TabsTrigger>
          </TabsList>

          {/* AI Architect Tab */}
          <TabsContent
            value="architect"
            className="min-h-0 flex-1 overflow-hidden"
          >
            <div className="flex h-full flex-col">
              {/* Scrollable message area */}
              <div ref={architectScrollRef} className="flex-1 overflow-y-auto">
                <div className="px-4 pt-3 pb-2">
                  {architectMessages.length === 0 ? (
                    <div className="flex flex-col items-center gap-5 py-8 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-ai/15">
                        <Bot className="h-6 w-6 text-accent-ai-text" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          ArchFlow AI Architect
                        </p>
                        <p className="mt-1 text-xs leading-5 text-text-muted">
                          Describe your system and I&apos;ll design the
                          architecture on the canvas.
                        </p>
                      </div>
                      <div className="flex w-full flex-col gap-2">
                        {STARTER_CHIPS.map((chip) => (
                          <button
                            key={chip}
                            onClick={() => handleChip(chip)}
                            className="w-full rounded-full bg-bg-subtle px-4 py-2 text-left text-xs text-accent-ai-text transition-colors hover:bg-border-default"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 pb-2">
                      {architectMessages.map((msg) =>
                        msg.role === "assistant" ? (
                          <div
                            key={msg.id}
                            className="flex justify-start gap-2"
                          >
                            <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent-ai/15">
                              <Bot className="h-3 w-3 text-accent-ai-text" />
                            </div>
                            <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-border-subtle bg-bg-elevated px-4 py-2.5 text-sm text-accent-ai-text">
                              {msg.content}
                            </div>
                          </div>
                        ) : (
                          <div key={msg.id} className="flex justify-end">
                            <div
                              className="max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm font-medium text-white"
                              style={{ backgroundColor: "#7C6FF7" }}
                            >
                              {msg.content}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Status strip */}
              {isLoading && statusText && (
                <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl border border-accent-ai/20 bg-accent-ai/10 px-3 py-2 text-xs text-accent-ai-text">
                  <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                  <span className="truncate">{statusText}</span>
                </div>
              )}

              {/* Input area */}
              <div className="shrink-0 border-t border-border-default p-3">
                <div className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-bg-elevated p-3">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe your system…"
                    disabled={isLoading}
                    style={{ height: "72px", maxHeight: "160px" }}
                    className="resize-none overflow-y-auto border-0 bg-transparent p-0 text-sm text-text-primary shadow-none placeholder:text-text-faint focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-faint">
                      Shift+Enter for newline
                    </span>
                    <Button
                      size="sm"
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="h-7 gap-1.5 rounded-lg px-3 text-xs text-white hover:opacity-90 disabled:opacity-40"
                      style={
                        !isLoading && input.trim()
                          ? { backgroundColor: "#7C6FF7" }
                          : undefined
                      }
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      {isLoading ? "Thinking…" : "Send"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="min-h-0 flex-1 overflow-hidden">
            <div className="flex h-full flex-col">
              {/* Scrollable message area */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto">
                <div className="px-4 pt-3 pb-2">
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-8 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-bg-subtle">
                        <MessageSquare className="h-5 w-5 text-text-muted" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          Room Chat
                        </p>
                        <p className="mt-1 text-xs leading-5 text-text-muted">
                          No messages yet. Start the conversation!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 pb-2">
                      {chatMessages.map((msg) => {
                        const isMe =
                          msg.role === "user" &&
                          msg.sender === self?.info?.name;
                        const isAI = msg.role === "assistant";
                        return (
                          <div
                            key={msg.id}
                            className={cn(
                              "flex flex-col gap-0.5",
                              isMe ? "items-end" : "items-start",
                            )}
                          >
                            <div
                              className={cn(
                                "flex items-center gap-1.5 text-[10px] text-text-faint",
                                isMe && "flex-row-reverse",
                              )}
                            >
                              <span className="font-medium text-text-muted">
                                {isAI ? "ArchFlow AI" : msg.sender}
                              </span>
                              <span>{formatTime(msg.createdAt)}</span>
                            </div>
                            <div
                              className={cn(
                                "max-w-[85%] rounded-2xl px-3 py-2 text-xs text-text-primary",
                                isMe
                                  ? "rounded-br-sm font-medium text-white"
                                  : isAI
                                    ? "rounded-bl-sm border border-border-subtle bg-bg-elevated text-accent-ai-text"
                                    : "rounded-bl-sm border border-border-subtle bg-bg-elevated",
                              )}
                              style={
                                isMe
                                  ? { backgroundColor: "#7C6FF7" }
                                  : undefined
                              }
                            >
                              {msg.content}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {chatError && (
                <div className="mx-3 mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {chatError}
                </div>
              )}

              {/* Input area */}
              <div className="shrink-0 border-t border-border-default p-3">
                <div className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-bg-elevated p-3">
                  <Textarea
                    ref={chatTextareaRef}
                    value={chatInput}
                    onChange={handleChatInputChange}
                    onKeyDown={handleChatKeyDown}
                    placeholder="Send a message…"
                    style={{ height: "72px", maxHeight: "160px" }}
                    className="resize-none overflow-y-auto border-0 bg-transparent p-0 text-sm text-text-primary shadow-none placeholder:text-text-faint focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-faint">
                      Shift+Enter for newline
                    </span>
                    <Button
                      size="sm"
                      onClick={handleChatSend}
                      disabled={!chatInput.trim()}
                      className="h-7 gap-1.5 rounded-lg bg-accent-ai px-3 text-xs text-white hover:bg-accent-ai/80 disabled:opacity-40"
                    >
                      <Send className="h-3 w-3" />
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Specs Tab */}
          <TabsContent value="specs" className="min-h-0 flex-1 overflow-hidden">
            <div className="flex h-full flex-col gap-3 p-4">
              <Button
                onClick={handleGenerateSpec}
                disabled={isSpecGenerating}
                className="w-full rounded-xl bg-accent-ai text-white hover:bg-accent-ai/80 disabled:opacity-60"
              >
                {isSpecGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Generating…
                  </>
                ) : (
                  "Generate Spec"
                )}
              </Button>

              {specsLoading ? (
                <div className="flex flex-1 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
                </div>
              ) : specs.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                  <FileText className="h-8 w-8 text-text-faint" />
                  <p className="text-xs text-text-muted">
                    No specs yet. Generate one above.
                  </p>
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  <div className="flex flex-col gap-2 pr-1">
                    {specs.map((spec) => (
                      <div
                        key={spec.id}
                        className="group flex cursor-pointer items-center gap-2 rounded-xl border border-border-subtle bg-bg-elevated px-3 py-2.5 transition-colors hover:border-border-default"
                        onClick={() => handleSpecClick(spec)}
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-bg-subtle">
                          <FileText className="h-3.5 w-3.5 text-text-muted" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-text-primary">
                            {getFilename(spec.filePath)}
                          </p>
                          <p className="text-[10px] text-text-faint">
                            {formatSpecDate(spec.createdAt)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSpecDownload(spec.id);
                          }}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-text-faint opacity-0 transition-opacity hover:bg-bg-subtle hover:text-text-primary group-hover:opacity-100"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </aside>
    </>
  );
}
