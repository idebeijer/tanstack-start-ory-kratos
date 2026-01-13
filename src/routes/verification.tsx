import { FlowMessages, HiddenNodes } from "@/components/auth"
import { browserOry } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { GalleryVerticalEnd } from "lucide-react"
import { useEffect, useState } from "react"
import { z } from "zod"
import type { VerificationFlow, UpdateVerificationFlowBody } from "@ory/client"

export const Route = createFileRoute("/verification")({
  validateSearch: (s) => SearchSchema.parse(s),
  component: RouteComponent,
})

const SearchSchema = z.object({
  flow: z.string().optional(),
  return_to: z.string().optional(),
})

function RouteComponent() {
  const { flow: flowId, return_to } = Route.useSearch()
  const navigate = useNavigate()
  const [flow, setFlow] = useState<VerificationFlow | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // If we already have a flow, don't reload
    if (flow) return

    if (flowId) {
      // Get existing flow
      browserOry
        .getVerificationFlow({ id: flowId })
        .then(({ data }) => {
          setFlow(data)
        })
        .catch((err) => {
          console.error("Failed to get verification flow", err)
          const status = err?.response?.status
          if (status === 410 || status === 403) {
            // Flow expired or CSRF issue - create new flow
            navigate({ to: "/verification" })
            return
          }
          createFlow()
        })
        .finally(() => setLoading(false))
    } else {
      createFlow()
    }
  }, [flowId, flow])

  async function createFlow() {
    try {
      const { data } = await browserOry.createBrowserVerificationFlow({
        returnTo: return_to || "/",
      })
      setFlow(data)
      // Update URL with flow ID
      window.history.replaceState(null, "", `?flow=${data.id}`)
    } catch (err: any) {
      console.error("Failed to create verification flow", err)
      if (err?.response?.status === 400) {
        // Already signed in
        navigate({ to: "/" })
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    e.stopPropagation()

    if (!flow || submitting) return

    setSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const values = Object.fromEntries(
      formData
    ) as unknown as UpdateVerificationFlowBody

    try {
      const { data } = await browserOry.updateVerificationFlow({
        flow: flow.id,
        updateVerificationFlowBody: values,
      })
      // Update flow with result
      setFlow(data)
    } catch (err: any) {
      console.error("Verification flow error", err)

      const status = err?.response?.status

      if (status === 400) {
        // Form validation error - show the errors
        setFlow(err.response?.data)
      } else if (status === 410) {
        // Flow expired - get new flow ID and reload
        const newFlowId = err.response?.data?.use_flow_id
        if (newFlowId) {
          window.history.replaceState(null, "", `?flow=${newFlowId}`)
          const { data } = await browserOry.getVerificationFlow({
            id: newFlowId,
          })
          setFlow(data)
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    )
  }

  const hiddenNodes =
    flow?.ui.nodes.filter(
      (n: any) => n.group === "default" && n.attributes?.type === "hidden"
    ) || []

  // Check if we're in the code entry step
  const hasCodeInput = !!flow?.ui.nodes.find(
    (n: any) => n.group === "code" && n.attributes?.name === "code"
  )

  // Check if verification is complete
  const isVerified = flow?.state === "passed_challenge"

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <Link
              to="/"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">ACME</span>
            </Link>
            <h1 className="text-xl font-bold">
              {isVerified ? "Email Verified!" : "Verify Your Email"}
            </h1>
            {!isVerified && (
              <FieldDescription>
                We sent a verification code to your email
              </FieldDescription>
            )}
          </div>

          <FlowMessages messages={flow?.ui.messages} />

          {/* Verification complete */}
          {isVerified && (
            <div className="text-center space-y-4">
              <p className="text-green-600 font-medium">
                ✓ Your email has been verified successfully!
              </p>
              <Button asChild className="w-full">
                <Link to="/">Continue to App</Link>
              </Button>
            </div>
          )}

          {/* Code input step */}
          {!isVerified && hasCodeInput && flow && (
            <form
              action={flow.ui.action}
              method={flow.ui.method}
              onSubmit={handleSubmit}
            >
              <HiddenNodes nodes={hiddenNodes} />
              <input type="hidden" name="method" value="code" />

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="code"
                    className="text-sm font-medium block mb-2"
                  >
                    Enter the 6-digit code from your email
                  </label>
                  <Input
                    id="code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    className="text-center text-2xl tracking-widest"
                    autoComplete="one-time-code"
                    required
                    disabled={submitting}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Verifying..." : "Verify"}
                </Button>
              </div>
            </form>
          )}

          {/* Email entry step */}
          {!isVerified && !hasCodeInput && flow && (
            <form
              action={flow.ui.action}
              method={flow.ui.method}
              onSubmit={handleSubmit}
            >
              <HiddenNodes nodes={hiddenNodes} />
              <input type="hidden" name="method" value="code" />

              <Field>
                <label
                  htmlFor="email"
                  className="text-sm font-medium block mb-2"
                >
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="me@example.com"
                  className="mb-4"
                  required
                  disabled={submitting}
                />
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Sending..." : "Send verification code"}
                </Button>
              </Field>
            </form>
          )}

          <div className="text-center">
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:underline"
            >
              Go back
            </Link>
          </div>
        </FieldGroup>
      </div>
    </div>
  )
}
