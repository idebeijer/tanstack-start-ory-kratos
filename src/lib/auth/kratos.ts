import { Configuration, FrontendApi } from '@ory/client'

const ORY_URL =
  import.meta.env.VITE_ORY_SDK_URL ??
  process.env.ORY_SDK_URL ??
  'http://localhost:4433'

/** Client for the browser (fetches include cookies) */
export const browserOry = new FrontendApi(
  new Configuration({
    basePath: ORY_URL,
    baseOptions: {
      withCredentials: true,
    },
  }),
)

/** Client for server-side calls; forwards the incoming Cookie header */
export const serverOry = (headers: Headers) =>
  new FrontendApi(
    new Configuration({
      basePath: ORY_URL,
      baseOptions: {
        withCredentials: true,
        headers: {
          cookie: headers.get('cookie') ?? '',
        },
      },
    }),
  )
