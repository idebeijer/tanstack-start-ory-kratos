/**
 * Error handling utilities following Ory's patterns
 * Handles common flow errors, session issues, and redirects
 */

import type { AxiosError } from "axios"

type FlowType =
  | "login"
  | "registration"
  | "settings"
  | "recovery"
  | "verification"

interface FlowErrorHandler {
  (err: AxiosError): Promise<void>
}

/**
 * Create an error handler for flow operations
 * Follows Ory's error handling patterns
 */
export function handleFlowError(
  flowType: FlowType,
  resetFlow: () => void,
  setFlow?: (data: any) => void
): FlowErrorHandler {
  return async (err: AxiosError<any>) => {
    const errorId = err.response?.data?.error?.id
    const status = err.response?.status

    switch (errorId) {
      case "session_inactive":
        // User needs to login
        window.location.href =
          "/login?return_to=" + encodeURIComponent(window.location.href)
        return

      case "session_aal2_required":
        // 2FA required
        if (err.response?.data?.redirect_browser_to) {
          window.location.href = err.response.data.redirect_browser_to
          return
        }
        window.location.href =
          "/login?aal=aal2&return_to=" +
          encodeURIComponent(window.location.href)
        return

      case "session_already_available":
        // Already logged in
        window.location.href = "/"
        return

      case "session_refresh_required":
        // Need to re-authenticate
        if (err.response?.data?.redirect_browser_to) {
          window.location.href = err.response.data.redirect_browser_to
        }
        return

      case "self_service_flow_return_to_forbidden":
        // Invalid return_to
        console.error("The return_to address is not allowed.")
        resetFlow()
        window.location.href = "/" + flowType
        return

      case "self_service_flow_expired":
        // Flow expired
        console.error("Flow expired, please try again.")
        resetFlow()
        window.location.href = "/" + flowType
        return

      case "security_csrf_violation":
        // CSRF error - refresh flow
        console.error("Security violation, please try again.")
        resetFlow()
        window.location.href = "/" + flowType
        return

      case "security_identity_mismatch":
        // Identity mismatch
        resetFlow()
        window.location.href = "/" + flowType
        return

      case "browser_location_change_required":
        // Kratos needs browser redirect
        if (err.response?.data?.redirect_browser_to) {
          window.location.href = err.response.data.redirect_browser_to
        }
        return
    }

    // Handle by status code
    switch (status) {
      case 400:
        // Form validation error - update flow to show errors
        if (setFlow && err.response?.data) {
          setFlow(err.response.data)
        }
        return

      case 403:
        // CSRF or forbidden - reload flow
        resetFlow()
        window.location.href = "/" + flowType
        return

      case 410:
        // Flow expired - create new flow
        resetFlow()
        window.location.href = "/" + flowType
        return

      case 422:
        // Browser redirect required
        if (err.response?.data?.redirect_browser_to) {
          window.location.href = err.response.data.redirect_browser_to
        }
        return
    }

    // Unknown error - log and rethrow
    console.error(`Unhandled ${flowType} flow error:`, err)
    throw err
  }
}

/**
 * Handle continue_with actions from flow responses
 * Returns true if handled a redirect, false otherwise
 */
export async function handleContinueWith(
  continueWith?: Array<{ action: string; flow?: { id: string } }>
): Promise<boolean> {
  if (!continueWith) return false

  for (const item of continueWith) {
    switch (item.action) {
      case "show_verification_ui":
        if (item.flow?.id) {
          window.location.href = "/verification?flow=" + item.flow.id
          return true
        }
        break
      case "show_settings_ui":
        if (item.flow?.id) {
          window.location.href = "/settings?flow=" + item.flow.id
          return true
        }
        break
      case "show_recovery_ui":
        if (item.flow?.id) {
          window.location.href = "/recovery?flow=" + item.flow.id
          return true
        }
        break
    }
  }

  return false
}
