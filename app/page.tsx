import { ChatInterface } from "@/components/chat/chat-interface"

export default function Home() {
  return (
    <div className="flex h-screen w-full">
      {/* Sidebar placeholder for future agent selector */}
      <aside className="hidden lg:flex w-64 border-r bg-muted/10">
        <div className="flex flex-col w-full p-4">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-lg font-semibold">smartFARM v3</h2>
          </div>
          <div className="flex-1">
            {/* Agent selector will go here */}
            <div className="text-sm text-muted-foreground">
              Agent selector coming soon...
            </div>
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col h-screen p-4 lg:p-6">
        <ChatInterface />
      </main>
    </div>
  )
}
