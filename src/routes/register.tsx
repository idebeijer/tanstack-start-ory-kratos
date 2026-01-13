import { FlowMessages, PasskeyForm, ProfileForm } from "@/components/auth"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldSeparator } from "@/components/ui/field"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import {
  handleAuthError,
  submitRegistrationPassword,
  useFlowNodes,
  useRegistrationFlow,
  useWebAuthnScript,
} from "@/lib/auth"

export const Route = createFileRoute("/register")({
  validateSearch: (s) => SearchSchema.parse(s),
  component: RouteComponent,
})

const SearchSchema = z.object({
  redirect: z.string().optional(),
})

function RouteComponent() {
  const { redirect } = Route.useSearch()
  const { flow, loading, reinitFlow } = useRegistrationFlow({ redirect })
  const { hiddenDefaults, hasPasskey, hasProfileMethod, csrfToken } =
    useFlowNodes(flow)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Inject WebAuthn script when needed
  useWebAuthnScript(flow)

  // Password submit handler
  async function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!flow || submitting) return

    setSubmitting(true)
    try {
      const result = await submitRegistrationPassword(
        flow,
        {
          email,
          password,
        },
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
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="mb-4">
          <FlowMessages messages={flow?.ui.messages} />
        </div>

        {/* STEP 1: Profile (two-step registration) */}
        {hasProfileMethod && !hasPasskey && flow && (
          <ProfileForm
            flow={flow}
            hiddenNodes={hiddenDefaults}
            email={email}
            onEmailChange={setEmail}
          />
        )}

        {/* STEP 2: Credential methods (now passkey nodes exist) */}
        {hasPasskey && (
          <div className="space-y-4">
            {/* Passkey option */}
            {flow && (
              <div className="space-y-4">
                <FieldGroup>
                  <Field>
                    <PasskeyForm
                      flow={flow}
                      hiddenNodes={hiddenDefaults}
                      traits={{ email }}
                    />
                  </Field>
                  <FieldSeparator>Or</FieldSeparator>
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
