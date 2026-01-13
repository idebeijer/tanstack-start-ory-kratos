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
import { Button } from "@/components/ui/button"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { GalleryVerticalEnd } from "lucide-react"
import { useEffect, useState } from "react"
import {
  browserOry,
  handleFlowError,
  handleContinueWith,
  useWebAuthnScript,
} from "@/lib/auth"
import type { RegistrationFlow, UpdateRegistrationFlowBody } from "@ory/client"

export const Route = createFileRoute("/register")({
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
  const [flow, setFlow] = useState<RegistrationFlow | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [email, setEmail] = useState("")

  useWebAuthnScript(flow)

  useEffect(() => {
    if (flow) return

    // Check if already authenticated
    browserOry
      .toSession()
      .then(() => {
        navigate({ to: "/" })
      })
      .catch(() => {
        if (flowId) {
          browserOry
            .getRegistrationFlow({ id: flowId })
            .then(({ data }) => setFlow(data))
            .catch(
              handleFlowError("registration", () => setFlow(null), setFlow)
            )
            .finally(() => setLoading(false))
        } else {
          createFlow()
        }
      })
  }, [flowId, flow])

  async function createFlow() {
    try {
      const { data } = await browserOry.createBrowserRegistrationFlow({
        returnTo: return_to || "/",
      })
      setFlow(data)
      window.history.replaceState(null, "", `?flow=${data.id}`)
    } catch (err: any) {
      await handleFlowError("registration", () => setFlow(null))(err)
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
    ) as unknown as UpdateRegistrationFlowBody

    try {
      const { data } = await browserOry.updateRegistrationFlow({
        flow: flow.id,
        updateRegistrationFlowBody: values,
      })

      console.log("Registration successful:", data)

      // Check for continue_with actions (e.g., verification)
      if (await handleContinueWith(data.continue_with)) {
        return
      }

      // Success - redirect to return_to or home
      window.location.href = flow.return_to || "/"
    } catch (err: any) {
      await handleFlowError("registration", () => setFlow(null), setFlow)(err)
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

  const hasProfileMethod = flow?.ui.nodes.some(
    (n: any) => n.group === "profile" && n.attributes?.name === "method"
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
            <h1 className="text-xl font-bold">Create Account</h1>
            <FieldDescription>
              Already have an account? <Link to="/login">Sign in</Link>
            </FieldDescription>
          </div>

          <FlowMessages messages={flow?.ui.messages} />

          {/* Code input step (after email sent) */}
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

          {/* Step 1: Profile (email entry) */}
          {!hasCodeInput && hasProfileMethod && !hasPasskey && flow && (
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
              <input type="hidden" name="method" value="profile" />

              <Field>
                <Label htmlFor="email" className="mb-2 block">
                  Email
                </Label>
                <Input
                  id="email"
                  name="traits.email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="me@example.com"
                  className="mb-4"
                  required
                  disabled={submitting}
                />
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Continuing..." : "Continue"}
                </Button>
              </Field>

              <FieldDescription className="text-center mt-4">
                By clicking continue, you agree to our Terms of Service and
                Privacy Policy.
              </FieldDescription>
            </form>
          )}

          {/* Step 2: Credential methods (passkey or code) */}
          {!hasCodeInput && hasPasskey && flow && (
            <>
              <Field>
                <PasskeyForm
                  flow={flow}
                  hiddenNodes={hiddenNodes}
                  traits={{ email }}
                />
              </Field>

              <FieldSeparator>Or</FieldSeparator>

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
                <input type="hidden" name="traits.email" value={email} />

                <Button
                  type="submit"
                  className="w-full"
                  variant="outline"
                  disabled={submitting}
                >
                  {submitting ? "Sending..." : "Send code"}
                </Button>
              </form>
            </>
          )}
        </FieldGroup>
      </div>
    </div>
  )
}
