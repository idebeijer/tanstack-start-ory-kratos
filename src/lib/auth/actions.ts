import type { LoginFlow, RegistrationFlow } from "@ory/client"
import { browserOry } from "./kratos"

export interface LoginCredentials {
  identifier: string
  password: string
}

export interface RegistrationTraits {
  email: string
}

export interface RegistrationCredentials extends RegistrationTraits {
  password: string
}

export interface AuthError {
  message: string
  status?: number
  needsRedirect?: string
  shouldReinitFlow?: boolean
}

export async function submitLoginPassword(
  flow: LoginFlow,
  credentials: LoginCredentials,
  csrfToken?: string,
  redirect?: string
): Promise<{ success: boolean; error?: AuthError }> {
  try {
    await browserOry.updateLoginFlow({
      flow: flow.id,
      updateLoginFlowBody: {
        method: "password",
        identifier: credentials.identifier,
        password: credentials.password,
        csrf_token: csrfToken,
      } as any,
    })

    // Success - redirect
    window.location.href = redirect || "/"
    return { success: true }
  } catch (err: any) {
    console.error("updateLoginFlow (password) error", err)

    // Handle specific error cases
    const data = err?.response?.data
    const status = err?.response?.status

    if (status === 422 && data?.redirect_browser_to) {
      return {
        success: false,
        error: {
          message: "Redirect required",
          status,
          needsRedirect: data.redirect_browser_to,
        },
      }
    }

    if (status === 410 || status === 404) {
      return {
        success: false,
        error: {
          message: "Flow expired",
          status,
          shouldReinitFlow: true,
        },
      }
    }

    return {
      success: false,
      error: {
        message: data?.ui?.messages?.[0]?.text || "Login failed",
        status,
      },
    }
  }
}

export async function submitRegistrationPassword(
  flow: RegistrationFlow,
  credentials: RegistrationCredentials,
  csrfToken?: string,
  redirect?: string
): Promise<{ success: boolean; error?: AuthError }> {
  try {
    await browserOry.updateRegistrationFlow({
      flow: flow.id,
      updateRegistrationFlowBody: {
        method: "password",
        traits: {
          email: credentials.email,
        },
        password: credentials.password,
        csrf_token: csrfToken,
      } as any,
    })

    // Success - redirect
    window.location.href = redirect || "/"
    return { success: true }
  } catch (err: any) {
    console.error("updateRegistrationFlow (password) error", err)

    const data = err?.response?.data
    const status = err?.response?.status

    if (status === 422 && data?.redirect_browser_to) {
      return {
        success: false,
        error: {
          message: "Redirect required",
          status,
          needsRedirect: data.redirect_browser_to,
        },
      }
    }

    if (status === 410 || status === 404) {
      return {
        success: false,
        error: {
          message: "Flow expired",
          status,
          shouldReinitFlow: true,
        },
      }
    }

    return {
      success: false,
      error: {
        message: data?.ui?.messages?.[0]?.text || "Registration failed",
        status,
      },
    }
  }
}

export async function handleAuthError(
  error: AuthError,
  reinitFlow: () => Promise<void>
): Promise<void> {
  if (error.needsRedirect) {
    window.location.href = error.needsRedirect
    return
  }

  if (error.shouldReinitFlow) {
    await reinitFlow()
    return
  }

  console.error("Auth error:", error.message)
}

export async function logout(): Promise<void> {
  try {
    const { data } = await browserOry.createBrowserLogoutFlow()
    window.location.href = data.logout_url
  } catch (err) {
    console.error("Failed to create logout flow", err)
    // If logout fails, redirect to home anyway
    window.location.href = "/"
  }
}
