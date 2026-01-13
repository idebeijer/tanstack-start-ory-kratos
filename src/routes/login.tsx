import { FlowMessages, HiddenNodes, PasskeyForm } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { z } from "zod"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createFileRoute, Link } from "@tanstack/react-router"
import { GalleryVerticalEnd } from "lucide-react"
import {
  handleAuthError,
  submitLoginPassword,
  useFlowNodes,
  useLoginFlow,
  useWebAuthnScript,
} from "@/lib/auth"
import { useState } from "react"

export const Route = createFileRoute("/login")({
  validateSearch: (s) => SearchSchema.parse(s),
  component: RouteComponent,
})

const SearchSchema = z.object({
  redirect: z.string().optional(),
  aal: z.string().optional(), // optional: request higher AAL
  refresh: z.coerce.boolean().optional(), // optional: force re-auth
})

function RouteComponent() {
  const { redirect, aal, refresh } = Route.useSearch()
  const { flow, loading, reinitFlow } = useLoginFlow({ redirect, aal, refresh })
  const { hiddenDefaults, hasPasskey, csrfToken } = useFlowNodes(flow)

  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Inject WebAuthn script when needed
  useWebAuthnScript(flow)

  // Password form submission handler
  async function onSubmitPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!flow || submitting) return

    setSubmitting(true)
    try {
      const result = await submitLoginPassword(
        flow,
        { identifier, password },
        csrfToken,
        redirect
      )

      if (!result.success && result.error) {
        await handleAuthError(result.error, reinitFlow)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
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
            <h1 className="text-xl font-bold">Welcome to ACME</h1>
            <FieldDescription>
              Don&apos;t have an account? <Link to="/register">Sign up</Link>
            </FieldDescription>
          </div>

          <FlowMessages messages={flow?.ui.messages} />

          {/* Passkey option - separate form */}
          {hasPasskey && flow && (
            <Field>
              <PasskeyForm
                flow={flow}
                hiddenNodes={hiddenDefaults}
                identifier={identifier}
              />
            </Field>
          )}

          <FieldSeparator>Or</FieldSeparator>

          {/* Password/magic link form */}
          <form onSubmit={onSubmitPassword}>
            <HiddenNodes nodes={hiddenDefaults} />
            <FieldGroup>
              <Field>
                <Label htmlFor="identifier">Email</Label>
                <Input
                  id="identifier"
                  name="identifier"
                  type="email"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  // disabled={submitting}
                  disabled={true}
                  placeholder="me@example.com"
                />
              </Field>

              <Field>
                <Button
                  type="submit"
                  // disabled={submitting}
                  disabled={true}
                  className="w-full"
                  variant={"outline"}
                >
                  {submitting ? "Sending..." : "Send magic link"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </FieldGroup>
      </div>
    </div>
  )
}
