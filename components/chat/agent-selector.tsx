"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { getAllAgents, type AgentType } from "@/lib/ai"
import { cn } from "@/lib/utils"

interface AgentSelectorProps {
  value?: AgentType
  onValueChange?: (value: AgentType) => void
  disabled?: boolean
  className?: string
}

/**
 * Agent Selector Component
 *
 * Dropdown UI for selecting agricultural specialist agents.
 * Displays agent icons, names, and descriptions.
 */
export function AgentSelector({
  value,
  onValueChange,
  disabled = false,
  className,
}: AgentSelectorProps) {
  const agents = getAllAgents()
  const selectedAgent = agents.find(agent => agent.id === value) || agents[0]

  const handleValueChange = (newValue: string) => {
    if (onValueChange) {
      onValueChange(newValue as AgentType)
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <label
          htmlFor="agent-selector"
          className="text-sm font-medium text-muted-foreground"
        >
          Agent
        </label>
        <Badge variant="outline" className="text-xs font-normal">
          {selectedAgent.name}
        </Badge>
      </div>

      <Select
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          id="agent-selector"
          className="w-full"
          aria-label="Select agricultural agent"
        >
          <SelectValue>
            <div className="flex items-center gap-2">
              <selectedAgent.icon
                className={cn("h-4 w-4", selectedAgent.color)}
              />
              <span>{selectedAgent.name}</span>
            </div>
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {agents.map(agent => {
            const Icon = agent.icon
            return (
              <SelectItem
                key={agent.id}
                value={agent.id}
                className="cursor-pointer"
              >
                <div className="flex flex-col gap-1 py-1">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", agent.color)} />
                    <span className="font-medium">{agent.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {agent.description}
                  </span>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * Compact Agent Badge Component
 *
 * Displays the current agent as a small badge with icon.
 * Useful for showing active agent in chat interface header.
 */
export function AgentBadge({
  agentId,
  className,
}: {
  agentId?: AgentType
  className?: string
}) {
  const agents = getAllAgents()
  const agent = agents.find(a => a.id === agentId) || agents[0]
  const Icon = agent.icon

  return (
    <Badge variant="secondary" className={cn("gap-1.5", className)}>
      <Icon className={cn("h-3 w-3", agent.color)} />
      <span className="text-xs">{agent.name}</span>
    </Badge>
  )
}
