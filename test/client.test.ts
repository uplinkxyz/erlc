import { describe, expect, mock, test } from "bun:test"
import { ERLCClient } from "../src/client"
import { ERLCApiError, ERLCAuthError, ERLCRateLimitError, ERLCServerOfflineError } from "../src/errors"

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  })
}

const baseServer = {
  Name: "API Test",
  OwnerId: 1,
  CoOwnerIds: [],
  CurrentPlayers: 0,
  MaxPlayers: 40,
  JoinKey: "APIServer",
  AccVerifiedReq: "Disabled",
  TeamBalance: false,
}

describe("ERLCClient", () => {
  test("getServer sends the server-key header and parses the response", async () => {
    const fetchMock = mock(async (url: string, init?: RequestInit) => {
      expect(url).toBe("https://api.erlc.gg/v2/server")
      expect((init?.headers as Headers).get("server-key")).toBe("test-key")
      return jsonResponse(baseServer)
    })

    const client = new ERLCClient({ serverKey: "test-key", fetch: fetchMock as unknown as typeof fetch })
    const server = await client.getServer()
    expect(server.Name).toBe("API Test")
  })

  test("getServer sets boolean query flags", async () => {
    const fetchMock = mock(async (url: string) => {
      expect(url).toContain("Players=true")
      expect(url).toContain("KillLogs=true")
      return jsonResponse({ ...baseServer, Players: [], KillLogs: [] })
    })

    const client = new ERLCClient({ serverKey: "test-key", fetch: fetchMock as unknown as typeof fetch })
    await client.getServer({ players: true, killLogs: true })
  })

  test("throws ERLCAuthError on 403", async () => {
    const fetchMock = mock(async () => new Response(null, { status: 403 }))
    const client = new ERLCClient({ serverKey: "bad-key", fetch: fetchMock as unknown as typeof fetch })
    await expect(client.getServer()).rejects.toBeInstanceOf(ERLCAuthError)
  })

  test("ERLCAuthError carries the numeric error code from the body", async () => {
    const fetchMock = mock(async () =>
      jsonResponse({ message: "You provided an invalid or expired server-key.", code: 2002 }, { status: 403 }),
    )
    const client = new ERLCClient({ serverKey: "bad-key", fetch: fetchMock as unknown as typeof fetch })

    try {
      await client.getServer()
      throw new Error("expected rejection")
    } catch (err) {
      expect(err).toBeInstanceOf(ERLCAuthError)
      expect((err as ERLCAuthError).code).toBe(2002)
    }
  })

  test("throws ERLCApiError with the numeric code for unmapped status codes", async () => {
    const fetchMock = mock(async () =>
      jsonResponse({ message: "Service unavailable.", code: 1002 }, { status: 503 }),
    )
    const client = new ERLCClient({ serverKey: "test-key", fetch: fetchMock as unknown as typeof fetch })

    try {
      await client.getServer()
      throw new Error("expected rejection")
    } catch (err) {
      expect(err).toBeInstanceOf(ERLCApiError)
      expect((err as ERLCApiError).code).toBe(1002)
    }
  })

  test("throws ERLCServerOfflineError on 422 with commandId", async () => {
    const fetchMock = mock(async () =>
      jsonResponse({ message: "The private server is currently offline.", commandId: "abc-123" }, { status: 422 }),
    )
    const client = new ERLCClient({ serverKey: "test-key", fetch: fetchMock as unknown as typeof fetch })

    try {
      await client.runCommand(":h hi")
      throw new Error("expected rejection")
    } catch (err) {
      expect(err).toBeInstanceOf(ERLCServerOfflineError)
      expect((err as ERLCServerOfflineError).commandId).toBe("abc-123")
    }
  })

  test("throws ERLCRateLimitError on 429 and parses headers", async () => {
    const fetchMock = mock(
      async () =>
        new Response(null, {
          status: 429,
          headers: {
            "X-RateLimit-Bucket": "global",
            "X-RateLimit-Limit": "35",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": "1704614400",
          },
        }),
    )
    const client = new ERLCClient({ serverKey: "test-key", fetch: fetchMock as unknown as typeof fetch })

    try {
      await client.getServer()
      throw new Error("expected rejection")
    } catch (err) {
      expect(err).toBeInstanceOf(ERLCRateLimitError)
      expect((err as ERLCRateLimitError).bucket).toBe("global")
      expect((err as ERLCRateLimitError).limit).toBe(35)
    }
  })

  test("ERLCRateLimitError carries the body's message and code when present", async () => {
    const fetchMock = mock(
      async () =>
        new Response(JSON.stringify({ message: "You are being rate limited.", code: 4001 }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }),
    )
    const client = new ERLCClient({ serverKey: "test-key", fetch: fetchMock as unknown as typeof fetch })

    try {
      await client.getServer()
      throw new Error("expected rejection")
    } catch (err) {
      expect(err).toBeInstanceOf(ERLCRateLimitError)
      expect((err as ERLCRateLimitError).message).toBe("You are being rate limited.")
      expect((err as ERLCRateLimitError).code).toBe(4001)
    }
  })
})