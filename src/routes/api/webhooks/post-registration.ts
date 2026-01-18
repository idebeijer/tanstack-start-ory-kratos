import { createFileRoute } from "@tanstack/react-router"

// Payload from Kratos registration.after webhook
interface RegistrationPayload {
  event: string
  flow_id: string
  flow_type: string
  identity: {
    id: string
    schema_id: string
    traits: {
      email: string
    }
  }
  request: {
    url: string
    method: string
  }
}

// Response format expected by Kratos
interface RegistrationResponse {
  identity: {
    external_id: string
    metadata_public: Record<string, unknown>
    metadata_admin: Record<string, unknown>
  }
}

export const Route = createFileRoute("/api/webhooks/post-registration")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload = (await request.json()) as RegistrationPayload

          // TODO: protect this endpoint, should be private and callable by Kratos only

          // Validate the event type
          if (payload.event !== "registration.after") {
            return Response.json(
              { error: "Invalid event type" },
              { status: 400 }
            )
          }

          // Fake check if user already exists
          const user = {
            id: payload.identity.id,
            email: payload.identity.traits.email,
          }

          if (!user) {
            console.log("User not found, should create...")
            // TODO: Create user
          }

          // Return the response format expected by Kratos
          const createdAt = new Date()
          const uuid = crypto.randomUUID() // TODO: Get some real ID when creating the user
          const response: RegistrationResponse = {
            identity: {
              external_id: uuid,
              metadata_public: {},
              metadata_admin: {
                created_at: createdAt,
                updated_at: createdAt,
              },
            },
          }

          return Response.json(response, { status: 200 })
        } catch (error) {
          return Response.json(
            { error: "Internal server error" },
            { status: 500 }
          )
        }
      },
    },
  },
})
