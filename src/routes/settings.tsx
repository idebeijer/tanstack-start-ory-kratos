import { FlowMessages, PasskeyForm } from "@/components/auth"
import { browserOry, handleFlowError, useWebAuthnScript } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createFileRoute, Link } from "@tanstack/react-router"
import { GalleryVerticalEnd, ArrowLeft } from "lucide-react"
import { useEffect, useState } from "react"
import { z } from "zod"
import type { SettingsFlow, UpdateSettingsFlowBody } from "@ory/client"

export const Route = createFileRoute("/settings")({
  validateSearch: (s) => SearchSchema.parse(s),
  component: RouteComponent,
})

const SearchSchema = z.object({
  flow: z.string().optional(),
  return_to: z.string().optional(),
})

function RouteComponent() {
  const { flow: flowId, return_to } = Route.useSearch()
  const [flow, setFlow] = useState<SettingsFlow | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useWebAuthnScript(flow)

  useEffect(() => {
    if (flow) return

    if (flowId) {
      browserOry
        .getSettingsFlow({ id: flowId })
        .then(({ data }) => setFlow(data))
        .catch(handleFlowError("settings", () => setFlow(null), setFlow))
        .finally(() => setLoading(false))
    } else {
      createFlow()
    }
  }, [flowId, flow])

  async function createFlow() {
    try {
      const { data } = await browserOry.createBrowserSettingsFlow({
        returnTo: return_to || "/",
      })
      setFlow(data)
      window.history.replaceState(null, "", `?flow=${data.id}`)
    } catch (err: any) {
      await handleFlowError("settings", () => setFlow(null))(err)
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
    ) as unknown as UpdateSettingsFlowBody

    try {
      const { data } = await browserOry.updateSettingsFlow({
        flow: flow.id,
        updateSettingsFlowBody: values,
      })

      // Update flow to show success messages
      setFlow(data)
    } catch (err: any) {
      await handleFlowError("settings", () => setFlow(null), setFlow)(err)
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

  const profileNodes =
    flow?.ui.nodes.filter((n: any) => n.group === "profile") || []

  const passkeyNodes =
    flow?.ui.nodes.filter(
      (n: any) =>
        (n.group === "passkey" || n.group === "webauthn") &&
        (n.type === "input" || n.type === "button" || n.type === "script")
    ) || []

  const hasPasskey = passkeyNodes.length > 0

  // Get current email from profile nodes
  const emailNode = profileNodes.find(
    (n: any) => n.attributes?.name === "traits.email"
  )
  const currentEmail = (emailNode?.attributes as any)?.value || ""

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
            <h1 className="text-xl font-bold">Account Settings</h1>
            <FieldDescription>
              Manage your profile and security settings
            </FieldDescription>
          </div>

          <FlowMessages messages={flow?.ui.messages} />

          {/* Profile Settings */}
          {profileNodes.length > 0 && flow && (
            <>
              <h2 className="text-lg font-semibold mt-4">Profile</h2>
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
                    defaultValue={currentEmail}
                    className="mb-4"
                    required
                    disabled={submitting}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? "Saving..." : "Save Profile"}
                  </Button>
                </Field>
              </form>
            </>
          )}

          {/* Passkey Management */}
          {hasPasskey && flow && (
            <>
              <FieldSeparator />
              <h2 className="text-lg font-semibold">Passkeys</h2>
              <FieldDescription className="text-center mb-4">
                Manage your passkeys for passwordless login
              </FieldDescription>

              <PasskeyForm flow={flow} hiddenNodes={hiddenNodes} />
            </>
          )}

          <FieldSeparator />

          <Link
            to="/"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:underline"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </Link>
        </FieldGroup>
      </div>
    </div>
  )
}
