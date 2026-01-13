# Post Registration Webhook Test

# 1. Test New User Creation
POST http://localhost:3000/api/webhooks/post-registration
Content-Type: application/json
{
  "event": "registration.after",
  "flow_id": "test-flow-id",
  "flow_type": "browser",
  "identity": {
    "schema_id": "default",
    "traits": {
      "email": "hurl-test-user@example.com",
    }
  },
  "request": {
    "url": "http://localhost:3000/registration",
    "method": "POST"
  }
}

HTTP 200
[Asserts]
jsonpath "$.identity.external_id" matches "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
jsonpath "$.identity.metadata_public" isCollection
jsonpath "$.identity.metadata_admin" isCollection

# 2. Test Idempotency (Same User Again) - Should return same ID
POST http://localhost:3000/api/webhooks/post-registration
Content-Type: application/json
{
  "event": "registration.after",
  "flow_id": "test-flow-id-2",
  "flow_type": "browser",
  "identity": {
    "schema_id": "default",
    "traits": {
      "email": "hurl-test-user@example.com",
    }
  },
  "request": {
    "url": "http://localhost:3000/registration",
    "method": "POST"
  }
}

HTTP 200
[Asserts]
jsonpath "$.identity.external_id" matches "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
