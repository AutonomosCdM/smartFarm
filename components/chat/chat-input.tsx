"use client"

import * as React from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Type your message...",
  maxLength = 4000,
}: ChatInputProps) {
  const [message, setMessage] = React.useState("")
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage("")
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const characterCount = message.length
  const isOverLimit = characterCount > maxLength
  const showCount = characterCount > maxLength * 0.8

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "min-h-[60px] max-h-[200px] resize-none pr-12",
              isOverLimit && "border-destructive focus-visible:border-destructive"
            )}
            aria-label="Chat message input"
          />
        </div>
        <Button
          onClick={handleSend}
          disabled={disabled || !message.trim() || isOverLimit}
          size="icon"
          className="h-[60px] w-[60px]"
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
      {showCount && (
        <div
          className={cn(
            "text-xs text-right",
            isOverLimit ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {characterCount} / {maxLength}
        </div>
      )}
      <div className="text-xs text-muted-foreground">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  )
}
