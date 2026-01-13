# TanStack Start + Ory Kratos Template

A boilerplate for implementing **Ory Kratos authentication** in a [TanStack Start](https://tanstack.com/start) application.

This template demonstrates self-hosted Kratos integration, but should work with [Ory Network](https://www.ory.sh/network/) with minor configuration tweaks.

## Features

- **Passkey authentication** – WebAuthn-based passwordless login
- **Email code authentication** – 6-digit code sent to email
- **Email verification** – Required for passkey registrations
- **Settings page** – Profile and passkey management
- **Registration & Login flows** – Using Kratos browser flows with updateFlow APIs
- **Post-registration webhook** – Example of syncing users to your own backend

## Project Structure

```
src/
├── lib/auth/
│   ├── kratos.ts       # Ory client setup (browser + server)
│   ├── hooks.ts        # React hooks for login/registration flows
│   ├── actions.ts      # Form submission handlers
│   └── errors.ts       # Ory-style error handling
├── routes/
│   ├── login.tsx       # Login page (passkey + code)
│   ├── register.tsx    # Registration page (two-step: email → passkey/code)
│   ├── settings.tsx    # Account settings page
│   ├── verification.tsx # Email verification page
│   ├── error.tsx       # Kratos error display page
│   └── api/webhooks/
│       └── post-registration.ts  # Webhook endpoint for Kratos
└── components/auth/    # Reusable auth UI components
```

## Quick Start

### 1. Start the infrastructure

```bash
make up
```

This starts:

- **PostgreSQL** – Kratos database
- **Kratos** – Identity server (ports 4433/4434)
- **Mailslurper** – Local email testing (http://localhost:4436)
- **webhook-proxy** – Nginx proxy for Docker→host webhook calls

### 2. Run the app

```bash
bun install
bun dev
```

Visit http://localhost:3000

## Configuration

### Kratos

Configuration files are in `configs/kratos/`:

- `kratos.yml` – Main Kratos config
- `identity.schema.json` – User identity schema

### Authentication Methods

The template supports:

| Method  | Login | Registration | Notes                                                              |
| ------- | ----- | ------------ | ------------------------------------------------------------------ |
| Passkey | ✅    | ✅           | Requires email verification after registration                     |
| Code    | ✅    | ✅           | 6-digit code, no verification needed (code proves email ownership) |

### Webhook Proxy

Kratos runs inside Docker and needs to call webhooks on your local dev server. The `webhook-proxy` nginx container proxies requests from Docker to `host.docker.internal:3000`.

## Post-Registration Webhook

The template includes an example webhook at `/api/webhooks/post-registration` that Kratos calls after successful registration.

This is where you'd typically:

- Create the user in your own database
- Assign roles/permissions
- Send welcome emails

The webhook receives the identity payload and returns an `external_id` that Kratos stores on the identity.

See `configs/kratos/registration-after.jsonnet` for the webhook payload template.

## Self-Service Flows

| Flow         | URL             | Description                                     |
| ------------ | --------------- | ----------------------------------------------- |
| Login        | `/login`        | Email + code or passkey                         |
| Register     | `/register`     | Two-step: email → choose passkey or code        |
| Settings     | `/settings`     | Profile and passkey management                  |
| Verification | `/verification` | Email verification (auto-triggered for passkey) |
| Error        | `/error`        | Kratos error display                            |

## Development Notes

### Vite Host Validation

The dev server is configured with `allowedHosts: true` in `vite.config.ts` to accept webhook requests from Docker containers.

### Error Handling

The `src/lib/auth/errors.ts` module provides Ory-style error handling:

- `handleFlowError()` – Handles common flow errors (expired, CSRF, etc.)
- `handleContinueWith()` – Processes `continue_with` actions (e.g., verification redirect)

## Scripts

```bash
make up       # Start Docker containers
make down     # Stop and remove containers + volumes
bun dev       # Run dev server
bun build     # Production build
bun test      # Run tests
```

## Tech Stack

- [TanStack Start](https://tanstack.com/start) – Full-stack React framework
- [Ory Kratos](https://www.ory.sh/kratos/) – Identity & user management
- [@ory/client](https://www.npmjs.com/package/@ory/client) – Ory SDK
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
