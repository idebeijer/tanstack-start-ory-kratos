import type { LoginFlow, RegistrationFlow } from "@ory/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { GalleryVerticalEnd } from "lucide-react"
import { cn } from "@/lib/utils"
import { Link } from "@tanstack/react-router"

interface HiddenNodesProps {
  nodes: any[]
}

export function HiddenNodes({ nodes }: HiddenNodesProps) {
  return (
    <>
      {nodes.map((n: any) => (
        <input
          key={n.attributes.name}
          name={n.attributes.name}
          value={n.attributes.value}
          type="hidden"
          readOnly
        />
      ))}
    </>
  )
}

interface PasskeyFormProps {
  flow: LoginFlow | RegistrationFlow
  hiddenNodes: any[]
  identifier?: string
  traits?: {
    email: string
  }
}

export function PasskeyForm({
  flow,
  hiddenNodes,
  identifier,
  traits,
}: PasskeyFormProps) {
  const passkeyNodes = flow.ui.nodes.filter(
    (n: any) =>
      (n.group === "passkey" || n.group === "webauthn") &&
      (n.type === "input" || n.type === "button" || n.type === "script")
  )

  if (passkeyNodes.length === 0) return null

  return (
    <form action={flow.ui.action} method={flow.ui.method}>
      <HiddenNodes nodes={hiddenNodes} />

      {/* Include identifier for login */}
      {identifier && (
        <input type="hidden" name="identifier" value={identifier} />
      )}

      {/* Include traits for registration */}
      {traits && (
        <>
          <input type="hidden" name="traits.email" value={traits.email} />
        </>
      )}

      {/* Render passkey nodes */}
      {passkeyNodes.map((n: any) => {
        const a = n.attributes || {}

        if (a.type === "submit" || a.type === "button") {
          const label = n?.meta?.label?.text || a.name || "Use passkey"
          const props: any = {
            type: a.type,
            name: a.name,
            style: { marginTop: 8 },
          }

          if (a.value) props.value = a.value
          if (a.onclick) {
            props.onClick = () => {
              /* eslint-disable no-eval */ eval(a.onclick)
            }
          }

          return (
            <Button key={label} {...props} className="w-full">
              {label}
            </Button>
          )
        }

        if (a.type === "hidden") {
          return (
            <input
              key={`${a.name}-${String(a.value)}`}
              name={a.name}
              type="hidden"
              defaultValue={a.value}
            />
          )
        }

        return null
      })}
    </form>
  )
}

interface CodeSendFormProps {
  flow: LoginFlow | RegistrationFlow
  hiddenNodes: any[]
  identifier?: string
  traits?: {
    email: string
  }
  buttonLabel?: string
}

export function CodeSendForm({
  flow,
  hiddenNodes,
  identifier,
  traits,
  buttonLabel = "Send code",
}: CodeSendFormProps) {
  return (
    <form action={flow.ui.action} method={flow.ui.method}>
      <HiddenNodes nodes={hiddenNodes} />

      {/* Include identifier for login */}
      {identifier && (
        <input type="hidden" name="identifier" value={identifier} />
      )}

      {/* Include traits for registration */}
      {traits && (
        <input type="hidden" name="traits.email" value={traits.email} />
      )}

      <input type="hidden" name="method" value="code" />

      <Button type="submit" className="w-full" variant="outline">
        {buttonLabel}
      </Button>
    </form>
  )
}

interface CodeInputFormProps {
  flow: LoginFlow | RegistrationFlow
  hiddenNodes: any[]
}

export function CodeInputForm({ flow, hiddenNodes }: CodeInputFormProps) {
  return (
    <form action={flow.ui.action} method={flow.ui.method}>
      <HiddenNodes nodes={hiddenNodes} />
      <input type="hidden" name="method" value="code" />

      <div className="space-y-4">
        <div>
          <label htmlFor="code" className="text-sm font-medium block mb-2">
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
          />
        </div>

        <Button type="submit" className="w-full">
          Verify
        </Button>
      </div>
    </form>
  )
}

interface FlowMessagesProps {
  messages?: Array<{ id: string | number; text: string; type?: string }>
}

export function FlowMessages({ messages }: FlowMessagesProps) {
  if (!messages?.length) return null

  return (
    <div className="space-y-2">
      {messages.map((m) => (
        <div
          key={m.id}
          role="alert"
          className={`text-sm p-3 rounded-md text-center ${
            m.type === "error"
              ? "bg-destructive/15 text-destructive border border-destructive/20"
              : "text-muted-foreground"
          }`}
        >
          {m.text}
        </div>
      ))}
    </div>
  )
}

interface ProfileFormProps {
  flow: RegistrationFlow
  hiddenNodes: any[]
  email: string
  className?: string
  onEmailChange: (value: string) => void
}

export function ProfileForm({
  flow,
  hiddenNodes,
  email,
  onEmailChange,
  className,
}: ProfileFormProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <form action={flow.ui.action} method={flow.ui.method}>
        <FieldGroup>
          <HiddenNodes nodes={hiddenNodes} />
          <div className="flex flex-col items-center gap-2 text-center">
            <a
              href="#"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">ACME</span>
            </a>
            <h1 className="text-xl font-bold">Welcome to ACME</h1>
            <FieldDescription>
              Already have an account? <Link to="/login">Sign in</Link>
            </FieldDescription>
          </div>

          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="traits.email"
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="me@example.com"
              required
            />
          </Field>
          <Field>
            <Button type="submit">Continue</Button>
          </Field>
          <FieldSeparator>Or</FieldSeparator>
          <Field className="grid gap-4 sm:grid-cols-2">
            <Button variant="outline" type="button" disabled={true}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path
                  d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                  fill="currentColor"
                />
              </svg>
              Continue with Apple
            </Button>
            <Button variant="outline" type="button" disabled={true}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  fill="currentColor"
                />
              </svg>
              Continue with Google
            </Button>
          </Field>

          <input type="hidden" name="method" value="profile" />
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
