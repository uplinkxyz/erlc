import { describe, expect, mock, test } from "bun:test"
import { ERLCClient } from "../src/client"
import { ERLCAuthError, ERLCRateLimitError, ERLCServerOfflineError } from "../src/errors"

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
})