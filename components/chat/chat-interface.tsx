"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Message } from "./message"
import { ChatInput } from "./chat-input"
import { AgentSelector } from "./agent-selector"
import { DataStreamHandler } from "@/components/data-stream-handler"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { DEFAULT_AGENT, type AgentType } from "@/lib/ai"
import { readDataStream } from "ai"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

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
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)
  const [streamData, setStreamData] = React.useState<any[]>([])

  const scrollAreaRef = React.useRef<HTMLDivElement>(null)
  const bottomRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleAgentChange = (newAgent: AgentType) => {
    setSelectedAgent(newAgent)
  }

  const onSend = async (message: string) => {
    if (!message.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setError(null)
    setStreamData([]) // Reset stream data

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          agent: selectedAgent,
          useRAG: enableRAG,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: '',
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])

      // Process the stream using AI SDK's readDataStream
      const reader = response.body.getReader()
      const dataStream = readDataStream({
        reader,
        onError: (error) => {
          console.error('Stream error:', error)
          setError(error instanceof Error ? error : new Error('Stream error'))
        },
      })

      let textContent = ''
      const streamParts: any[] = []

      for await (const chunk of dataStream) {
        if (chunk.type === 'text') {
          textContent += chunk.value
          setMessages(prev => {
            const updated = [...prev]
            const lastIndex = updated.length - 1
            if (updated[lastIndex].role === 'assistant') {
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: textContent,
              }
            }
            return updated
          })
        } else {
          // Collect data stream parts for artifacts
          streamParts.push(chunk)
          setStreamData(streamParts)
        }
      }

    } catch (err) {
      console.error("Failed to send message:", err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setMessages(prev => prev.filter(m => m.content !== ''))
    } finally {
      setIsLoading(false)
    }
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

            {messages.map((message) => (
              <Message
                key={message.id}
                role={message.role}
                content={message.content}
                timestamp={new Date()}
              />
            ))}

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
