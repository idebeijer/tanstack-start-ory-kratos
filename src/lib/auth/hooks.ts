import { useEffect, useState, useMemo } from "react"
import type { LoginFlow, RegistrationFlow, UiNode } from "@ory/client"
import { browserOry } from "./kratos"

export interface AuthFlowOptions {
  redirect?: string
  aal?: string
  refresh?: boolean
}

export function useLoginFlow({ redirect, aal, refresh }: AuthFlowOptions = {}) {
  const [flow, setFlow] = useState<LoginFlow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const initFlow = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await browserOry.createBrowserLoginFlow({
        aal: aal as any,
        refresh,
        returnTo: redirect || "/",
      })
      setFlow(data)
    } catch (err) {
      console.error("createBrowserLoginFlow error", err)
      setError("Failed to initialize login flow")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Check if already authenticated before creating flow
    browserOry
      .toSession()
      .then(() => {
        // Already logged in, redirect to home
        window.location.href = "/"
      })
      .catch(() => {
        // Not authenticated, proceed with flow
        const url = new URL(window.location.href)
        const flowId = url.searchParams.get("flow")

        if (flowId) {
          browserOry
            .getLoginFlow({ id: flowId })
            .then(({ data }) => {
              setFlow(data)
              setLoading(false)
            })
            .catch(() => initFlow())
        } else {
          initFlow()
        }
      })
  }, [redirect, aal, refresh])

  return { flow, loading, error, reinitFlow: initFlow }
}

export function useRegistrationFlow({
  redirect,
}: Pick<AuthFlowOptions, "redirect"> = {}) {
  const [flow, setFlow] = useState<RegistrationFlow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const initFlow = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await browserOry.createBrowserRegistrationFlow({
        returnTo: redirect || "/",
      })
      setFlow(data)
    } catch (err) {
      console.error("createBrowserRegistrationFlow error", err)
      setError("Failed to initialize registration flow")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Check if already authenticated before creating flow
    browserOry
      .toSession()
      .then(() => {
        // Already logged in, redirect to home
        window.location.href = "/"
      })
      .catch(() => {
        // Not authenticated, proceed with flow
        const url = new URL(window.location.href)
        const flowId = url.searchParams.get("flow")

        if (flowId) {
          browserOry
            .getRegistrationFlow({ id: flowId })
            .then(({ data }) => {
              setFlow(data)
              setLoading(false)
            })
            .catch(() => initFlow())
        } else {
          initFlow()
        }
      })
  }, [redirect])

  return { flow, loading, error, reinitFlow: initFlow }
}

export function useWebAuthnScript(flow: LoginFlow | RegistrationFlow | null) {
  useEffect(() => {
    if (!flow) return

    const added: HTMLScriptElement[] = []

    for (const n of flow.ui.nodes as any[]) {
      if (
        n.type === "script" &&
        (n.group === "passkey" || n.group === "webauthn")
      ) {
        const a = n.attributes
        if (!a?.src) continue
        if (document.getElementById(a.id || "ory_webauthn_script")) continue

        const s = document.createElement("script")
        s.src = a.src
        s.async = !!a.async
        if (a.type) s.type = a.type
        if (a.crossorigin) s.crossOrigin = a.crossorigin
        if (a.referrerpolicy) s.referrerPolicy = a.referrerpolicy
        if (a.integrity) s.integrity = a.integrity
        if (a.id) s.id = a.id

        document.body.appendChild(s)
        added.push(s)
      }
    }

    return () => {
      added.forEach((s) => s.remove())
    }
  }, [flow?.id])
}

export function useFlowNodes(flow: LoginFlow | RegistrationFlow | null) {
  return useMemo(() => {
    if (!flow)
      return {
        hiddenDefaults: [],
        passkeyNodes: [],
        hasPasskey: false,
        hasProfileMethod: false,
        csrfToken: undefined,
      }

    const hiddenDefaults = flow.ui.nodes.filter(
      (n: any) => n.group === "default" && n.attributes?.type === "hidden"
    )

    const passkeyNodes = flow.ui.nodes.filter(
      (n: any) =>
        (n.group === "passkey" || n.group === "webauthn") &&
        (n.type === "input" || n.type === "button" || n.type === "script")
    )

    const hasPasskey = passkeyNodes.length > 0

    const hasProfileMethod = !!flow.ui.nodes.find(
      (n: any) => n.group === "profile" && n.attributes?.name === "method"
    )

    const csrfNode = flow.ui.nodes.find(
      (n: UiNode) => (n as any).attributes?.name === "csrf_token"
    ) as any
    const csrfToken = csrfNode?.attributes?.value as string | undefined

    return {
      hiddenDefaults,
      passkeyNodes,
      hasPasskey,
      hasProfileMethod,
      csrfToken,
    }
  }, [flow?.id])
}
