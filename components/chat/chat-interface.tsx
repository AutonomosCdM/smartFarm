"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Message } from "./message"
import { ChatInput } from "./chat-input"
import { AgentSelector } from "./agent-selector"
import { DataStreamHandler } from "@/components/data-stream-handler"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { DEFAULT_AGENT, type AgentType } from "@/lib/ai"

interface ChatInterfaceProps {
  apiEndpoint?: string
  className?: string
  placeholder?: string
  enableRAG?: boolean
}

export function ChatInterface({
  apiEndpoint = "/api/chat",
  className,
  placeholder = "Ask me anything about your farm...",
  enableRAG = false,
}: ChatInterfaceProps) {
  const [selectedAgent, setSelectedAgent] = React.useState<AgentType>(DEFAULT_AGENT)
  const [streamData, setStreamData] = React.useState<any[]>([])
  const scrollAreaRef = React.useRef<HTMLDivElement>(null)
  const bottomRef = React.useRef<HTMLDivElement>(null)

  const {
    messages,
    status,
    error,
    sendMessage,
  } = useChat({
    api: apiEndpoint,
    body: {
      agent: selectedAgent,
      useRAG: enableRAG,
    },
    onData: (dataPart) => {
      // Collect all data stream parts for artifacts
      setStreamData(prev => [...prev, dataPart])
    },
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleAgentChange = (newAgent: AgentType) => {
    setSelectedAgent(newAgent)
  }

  const onSend = (message: string) => {
    if (!message.trim() || isLoading) return
    sendMessage({ text: message })
  }

  return (
    <>
      {/* Data stream handler for artifacts */}
      {streamData && <DataStreamHandler streamParts={streamData as any} />}

      <Card
        className={cn(
          "flex flex-col h-full w-full max-w-4xl mx-auto border-0 shadow-none",
          className
        )}
      >
        {/* Agent Selector */}
        <div className="border-b p-4 bg-background">
          <AgentSelector
            value={selectedAgent}
            onValueChange={handleAgentChange}
            disabled={isLoading}
          />
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="flex flex-col gap-6">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center gap-4">
                <div className="text-muted-foreground space-y-2">
                  <h3 className="text-2xl font-semibold text-foreground">
                    Welcome to smartFARM v3
                  </h3>
                  <p className="text-sm max-w-md">
                    Your AI-powered agricultural assistant. Ask questions about irrigation, pest control, weather, crop management, and more.
                  </p>
                </div>
              </div>
            )}

            {messages.map((message) => {
              // Extract text content from message parts
              const textContent = message.parts
                .filter((part: any) => part.type === 'text')
                .map((part: any) => part.text)
                .join('')

              return (
                <Message
                  key={message.id}
                  role={message.role}
                  content={textContent}
                  timestamp={new Date()}
                />
              )
            })}

            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div className="bg-muted text-foreground rounded-lg px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center p-4">
                <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-2.5 text-sm border border-destructive/20">
                  Error: {error.message}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4 bg-background">
          <ChatInput
            onSend={onSend}
            disabled={isLoading}
            placeholder={placeholder}
          />
        </div>
      </Card>
    </>
  )
}
