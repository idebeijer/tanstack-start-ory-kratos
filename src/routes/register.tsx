import {
  FlowMessages,
  PasskeyForm,
  ProfileForm,
  CodeSendForm,
  CodeInputForm,
} from "@/components/auth"
import { z } from "zod"
import { Field, FieldGroup, FieldSeparator } from "@/components/ui/field"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import {
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
  const { flow, loading } = useRegistrationFlow({ redirect })
  const { hiddenDefaults, hasPasskey, hasProfileMethod, hasCodeInput } =
    useFlowNodes(flow)

  const [email, setEmail] = useState("")

  useWebAuthnScript(flow)

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

        {/* Step 3: Code input (after email sent) */}
        {hasCodeInput && flow && (
          <CodeInputForm flow={flow} hiddenNodes={hiddenDefaults} />
        )}

        {/* Step 1: Profile (email entry) */}
        {!hasCodeInput && hasProfileMethod && !hasPasskey && flow && (
          <ProfileForm
            flow={flow}
            hiddenNodes={hiddenDefaults}
            email={email}
            onEmailChange={setEmail}
          />
        )}

        {/* Step 2: Credential methods (passkey or code) */}
        {!hasCodeInput && hasPasskey && flow && (
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
                <CodeSendForm
                  flow={flow}
                  hiddenNodes={hiddenDefaults}
                  traits={{ email }}
                />
              </Field>
            </FieldGroup>
          </div>
        )}
      </div>
    </div>
  )
}
