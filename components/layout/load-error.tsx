import { Button } from "@/components/ui/button"

interface LoadErrorProps {
  message: string
  onRetry(): void
}

export function LoadError({ message, onRetry }: LoadErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center"
    >
      <p className="text-sm text-destructive">{message}</p>
      <Button variant="outline" onClick={onRetry} className="h-11 px-5">
        Try again
      </Button>
    </div>
  )
}
