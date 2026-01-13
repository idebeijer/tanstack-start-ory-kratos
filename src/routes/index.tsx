import { Button } from "@/components/ui/button"
import { browserOry, logout } from "@/lib/auth"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import type { Session } from "@ory/client"
import { useState, useEffect } from "react"

export const Route = createFileRoute("/")({
  component: Home,
})

function Home() {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    browserOry
      .toSession()
      .then(({ data }) => {
        setSession(data)

        // Check if email is verified (for passkey registrations)
        const verifiableAddresses = data.identity?.verifiable_addresses || []
        const emailAddress = verifiableAddresses.find(
          (addr) => addr.via === "email"
        )

        // If email exists and is not verified, redirect to verification
        if (emailAddress && !emailAddress.verified) {
          navigate({ to: "/verification" })
        }
      })
      .catch(() => {
        setSession(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [navigate])

  async function handleLogout() {
    setLoggingOut(true)
    await logout()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  // Not authenticated
  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome</h1>
          <p className="text-muted-foreground mt-2">
            Please sign in to continue
          </p>
        </div>
        <div className="flex gap-4">
          <Button asChild>
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/register">Register</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Authenticated
  const email = session.identity?.traits?.email as string | undefined

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Welcome!</h1>
        {email && (
          <p className="text-muted-foreground mt-2">
            Logged in as <span className="font-medium">{email}</span>
          </p>
        )}
      </div>

      <div className="flex gap-4">
        <Button asChild variant="outline">
          <Link to="/settings">Settings</Link>
        </Button>
        <Button onClick={handleLogout} disabled={loggingOut} variant="outline">
          {loggingOut ? "Logging out..." : "Logout"}
        </Button>
      </div>
    </div>
  )
}
