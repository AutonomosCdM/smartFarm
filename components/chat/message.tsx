"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { Button } from "@/components/ui/button"
import { Copy, Check, Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { ArtifactRenderer } from "@/components/artifacts/artifact-renderer"
import { parseArtifacts, hasArtifacts } from "@/lib/ai/artifact-parser"

interface MessageProps {
  role: "user" | "assistant"
  content: string
  timestamp?: Date
  className?: string
}

export function Message({ role, content, timestamp, className }: MessageProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formattedTime = timestamp
    ? new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(timestamp)
    : null

  const isUser = role === "user"

  // Parse artifacts from assistant messages
  const parsed = !isUser && hasArtifacts(content)
    ? parseArtifacts(content)
    : { text: content, artifacts: [] }

  return (
    <div
      className={cn(
        "flex gap-3 group message-enter",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          "flex flex-col gap-2 max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-lg px-4 py-2.5 text-sm",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">{content}</div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:bg-background [&_pre]:border [&_pre]:rounded-md [&_pre]:p-3 [&_code]:text-sm [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ol]:my-2">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {parsed.text}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Render artifacts */}
        {!isUser && parsed.artifacts.length > 0 && (
          <div className="flex flex-col gap-3 mt-3 w-full max-w-full">
            {parsed.artifacts.map((artifact) => (
              <ArtifactRenderer key={artifact.id} artifact={artifact} />
            ))}
          </div>
        )}

        {/* Metadata */}
        <div
          className={cn(
            "flex items-center gap-2 px-1",
            isUser ? "flex-row-reverse" : "flex-row"
          )}
        >
          {formattedTime && (
            <span className="text-xs text-muted-foreground">
              {formattedTime}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleCopy}
            aria-label="Copy message"
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
