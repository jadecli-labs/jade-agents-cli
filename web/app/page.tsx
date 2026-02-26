import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-2xl space-y-8">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Jade Agents CLI
        </h1>
        <p className="text-lg text-fd-muted-foreground">
          Bilateral learning partnership AI agent system.
          <br />
          Dual Python + TypeScript codebase with MCP tools, knowledge graph
          memory, and cloud-native infrastructure.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/docs"
            className="rounded-lg bg-fd-primary px-6 py-3 text-fd-primary-foreground font-medium hover:bg-fd-primary/90 transition-colors"
          >
            Documentation
          </Link>
          <Link
            href="/docs/review"
            className="rounded-lg border border-fd-border px-6 py-3 font-medium hover:bg-fd-accent transition-colors"
          >
            Code Review Walkthrough
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-8 sm:grid-cols-4 text-sm">
          <div className="rounded-lg border border-fd-border p-4">
            <div className="text-2xl font-bold">484</div>
            <div className="text-fd-muted-foreground">Tests</div>
          </div>
          <div className="rounded-lg border border-fd-border p-4">
            <div className="text-2xl font-bold">25</div>
            <div className="text-fd-muted-foreground">Issues Fixed</div>
          </div>
          <div className="rounded-lg border border-fd-border p-4">
            <div className="text-2xl font-bold">9+4</div>
            <div className="text-fd-muted-foreground">MCP Tools</div>
          </div>
          <div className="rounded-lg border border-fd-border p-4">
            <div className="text-2xl font-bold">2</div>
            <div className="text-fd-muted-foreground">Languages</div>
          </div>
        </div>
      </div>
    </main>
  );
}
