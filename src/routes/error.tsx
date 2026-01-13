import { browserOry } from "@/lib/auth/kratos"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { z } from "zod"
import type { FlowError } from "@ory/client"

export const Route = createFileRoute("/error")({
  validateSearch: (s) => SearchSchema.parse(s),
  component: RouteComponent,
})

const SearchSchema = z.object({
  id: z.string().optional(),
})

function RouteComponent() {
  const { id } = Route.useSearch()
  const navigate = useNavigate()
  const [error, setError] = useState<FlowError | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    browserOry
      .getFlowError({ id })
      .then((response) => {
        setError(response.data)
      })
      .catch((err) => {
        const status = err?.response?.status
        // 404: Error not found, 403: CSRF issue, 410: Error expired
        if (status === 404 || status === 403 || status === 410) {
          navigate({ to: "/" })
          return
        }
        console.error("Failed to fetch error:", err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [id, navigate])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading error details...</p>
      </div>
    )
  }

  if (!id || !error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-2xl font-bold">Error</h1>
        <p className="text-muted-foreground">
          {!id ? "No error ID provided." : "Error details not available."}
        </p>
        <Link to="/" className="text-primary underline">
          Go back home
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold text-destructive">An Error Occurred</h1>

      <div className="w-full max-w-lg rounded-lg border bg-card p-6">
        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Error ID
            </dt>
            <dd className="font-mono text-sm">{error?.id}</dd>
          </div>

          {error?.error && (
            <>
              {(error.error as Record<string, unknown>).status && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Status
                  </dt>
                  <dd>
                    {String((error.error as Record<string, unknown>).status)}
                  </dd>
                </div>
              )}
              {(error.error as Record<string, unknown>).message && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Message
                  </dt>
                  <dd>
                    {String((error.error as Record<string, unknown>).message)}
                  </dd>
                </div>
              )}
              {(error.error as Record<string, unknown>).reason && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Reason
                  </dt>
                  <dd>
                    {String((error.error as Record<string, unknown>).reason)}
                  </dd>
                </div>
              )}
            </>
          )}

          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Raw Error
            </dt>
            <dd>
              <pre className="mt-2 overflow-auto rounded bg-muted p-4 text-xs">
                {JSON.stringify(error, null, 2)}
              </pre>
            </dd>
          </div>
        </dl>
      </div>

      <Link to="/" className="text-primary underline">
        Go back home
      </Link>
    </div>
  )
}
