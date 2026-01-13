import { FlowMessages, PasskeyForm } from "@/components/auth"
import { z } from "zod"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { GalleryVerticalEnd } from "lucide-react"
import { useEffect, useState } from "react"
import {
  browserOry,
  handleFlowError,
  handleContinueWith,
  useWebAuthnScript,
} from "@/lib/auth"
import type { LoginFlow, UpdateLoginFlowBody } from "@ory/client"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/login")({
  validateSearch: (s) => SearchSchema.parse(s),
  component: RouteComponent,
})

const SearchSchema = z.object({
  flow: z.string().optional(),
  return_to: z.string().optional(),
  aal: z.string().optional(),
  refresh: z.coerce.boolean().optional(),
})

function RouteComponent() {
  const { flow: flowId, return_to, aal, refresh } = Route.useSearch()
  const navigate = useNavigate()
  const [flow, setFlow] = useState<LoginFlow | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [identifier, setIdentifier] = useState("")

  useWebAuthnScript(flow)

  useEffect(() => {
    if (flow) return

    // Check if already authenticated
    browserOry
      .toSession()
      .then(() => {
        // Already logged in
        navigate({ to: "/" })
      })
      .catch(() => {
        // Not authenticated, proceed with flow
        if (flowId) {
          browserOry
            .getLoginFlow({ id: flowId })
            .then(({ data }) => setFlow(data))
            .catch(handleFlowError("login", () => setFlow(null), setFlow))
            .finally(() => setLoading(false))
        } else {
          createFlow()
        }
      })
  }, [flowId, flow])

  async function createFlow() {
    try {
      const { data } = await browserOry.createBrowserLoginFlow({
        returnTo: return_to || "/",
        aal: aal as any,
        refresh,
      })
      setFlow(data)
      window.history.replaceState(null, "", `?flow=${data.id}`)
    } catch (err: any) {
      await handleFlowError("login", () => setFlow(null))(err)
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
    ) as unknown as UpdateLoginFlowBody

    try {
      const { data } = await browserOry.updateLoginFlow({
        flow: flow.id,
        updateLoginFlowBody: values,
      })

      // Check for continue_with actions
      if (await handleContinueWith(data.continue_with)) {
        return
      }

      // Success - redirect to return_to or home
      window.location.href = flow.return_to || "/"
    } catch (err: any) {
      await handleFlowError("login", () => setFlow(null), setFlow)(err)
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

  const hasPasskey = flow?.ui.nodes.some(
    (n: any) =>
      (n.group === "passkey" || n.group === "webauthn") &&
      (n.type === "input" || n.type === "button")
  )

  const hasCodeInput = flow?.ui.nodes.some(
    (n: any) => n.group === "code" && n.attributes?.name === "code"
  )

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
              {flow?.refresh
                ? "Confirm Action"
                : flow?.requested_aal === "aal2"
                  ? "Two-Factor Authentication"
                  : "Sign In"}
            </h1>
            <FieldDescription>
              Don&apos;t have an account? <Link to="/register">Sign up</Link>
            </FieldDescription>
          </div>

          <FlowMessages messages={flow?.ui.messages} />

          {/* Code input step */}
          {hasCodeInput && flow && (
            <form
              action={flow.ui.action}
              method={flow.ui.method}
              onSubmit={handleSubmit}
            >
              {hiddenNodes.map((n: any) => (
                <input
                  key={n.attributes.name}
                  type="hidden"
                  name={n.attributes.name}
                  value={n.attributes.value}
                />
              ))}
              <input type="hidden" name="method" value="code" />

              <div className="space-y-4">
                <div>
                  <Label htmlFor="code" className="mb-2 block">
                    Enter the 6-digit code from your email
                  </Label>
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

          {/* Initial login step */}
          {!hasCodeInput && (
            <>
              {/* Passkey option */}
              {hasPasskey && flow && (
                <Field>
                  <PasskeyForm
                    flow={flow}
                    hiddenNodes={hiddenNodes}
                    identifier={identifier}
                  />
                </Field>
              )}

              <FieldSeparator>Or</FieldSeparator>

              {/* Code login form */}
              {flow && (
                <form
                  action={flow.ui.action}
                  method={flow.ui.method}
                  onSubmit={handleSubmit}
                >
                  {hiddenNodes.map((n: any) => (
                    <input
                      key={n.attributes.name}
                      type="hidden"
                      name={n.attributes.name}
                      value={n.attributes.value}
                    />
                  ))}
                  <input type="hidden" name="method" value="code" />

                  <Field>
                    <Label htmlFor="identifier" className="mb-2 block">
                      Email
                    </Label>
                    <Input
                      id="identifier"
                      name="identifier"
                      type="email"
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="me@example.com"
                      className="mb-4"
                      required
                      disabled={submitting}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      variant="outline"
                      disabled={submitting}
                    >
                      {submitting ? "Sending..." : "Send code"}
                    </Button>
                  </Field>
                </form>
              )}
            </>
          )}
        </FieldGroup>
      </div>
    </div>
  )
}
