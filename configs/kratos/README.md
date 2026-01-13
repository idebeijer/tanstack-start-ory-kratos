### Registration After Webhook

Generate the base64 encoded webhook payload:

```bash
# Linux:
base64 -w0 registration-after.jsonnet
# macOS (BSD base64) if -w is unsupported (copies to clipboard automatically):
base64 < registration-after.jsonnet | tr -d '\n' | pbcopy
```

Paste it into the Kratos config for webhooks at `configs/kratos/kratos.yml`.
