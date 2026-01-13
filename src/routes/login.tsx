import {
  FlowMessages,
  PasskeyForm,
  CodeSendForm,
  CodeInputForm,
} from "@/components/auth"
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
import { useFlowNodes, useLoginFlow, useWebAuthnScript } from "@/lib/auth"
import { useState } from "react"

export const Route = createFileRoute("/login")({
  validateSearch: (s) => SearchSchema.parse(s),
  component: RouteComponent,
})

const SearchSchema = z.object({
  redirect: z.string().optional(),
  aal: z.string().optional(),
  refresh: z.coerce.boolean().optional(),
})

function RouteComponent() {
  const { redirect, aal, refresh } = Route.useSearch()
  const { flow, loading } = useLoginFlow({ redirect, aal, refresh })
  const { hiddenDefaults, hasPasskey, hasCodeInput } = useFlowNodes(flow)

  const [identifier, setIdentifier] = useState("")

  useWebAuthnScript(flow)

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

          {/* Step 2: Code input (after email sent) */}
          {hasCodeInput && flow && (
            <CodeInputForm flow={flow} hiddenNodes={hiddenDefaults} />
          )}

          {/* Step 1: Email entry (before code sent) */}
          {!hasCodeInput && (
            <>
              {/* Passkey option */}
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

              {/* Email + code form */}
              {flow && (
                <Field>
                  <Label htmlFor="identifier" className="mb-2 block">
                    Email
                  </Label>
                  <Input
                    id="identifier"
                    type="email"
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="me@example.com"
                    className="mb-4"
                  />
                  <CodeSendForm
                    flow={flow}
                    hiddenNodes={hiddenDefaults}
                    identifier={identifier}
                  />
                </Field>
              )}
            </>
          )}
        </FieldGroup>
      </div>
    </div>
  )
}
