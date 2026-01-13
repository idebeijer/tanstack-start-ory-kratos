function (ctx) {
  event: "registration.after",
  flow_id: ctx.flow.id,
  flow_type: ctx.flow.type,
  identity: {
    schema_id: ctx.identity.schema_id,
    traits: ctx.identity.traits,
  },
  request: {
    url: ctx.request_url,
    method: ctx.request_method,
  },
}