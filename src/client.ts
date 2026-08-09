import {
  ERLCApiError,
  ERLCAuthError,
  ERLCBadRequestError,
  ERLCRateLimitError,
  ERLCServerOfflineError,
  ERLCUpstreamError,
} from "./errors"
import type { CommandResult, GetServerOptions, ServerStatus } from "./types"

const DEFAULT_BASE_URL = "https://api.erlc.gg"

export interface ERLCClientOptions {
  serverKey: string
  apiKey?: string
  baseUrl?: string
  fetch?: typeof fetch
}

const QUERY_FLAG_MAP: Record<keyof GetServerOptions, string> = {
  players: "Players",
  staff: "Staff",
  joinLogs: "JoinLogs",
  queue: "Queue",
  killLogs: "KillLogs",
  commandLogs: "CommandLogs",
  modCalls: "ModCalls",
  emergencyCalls: "EmergencyCalls",
  vehicles: "Vehicles",
}

export class ERLCClient {
  private readonly serverKey: string
  private readonly apiKey?: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: ERLCClientOptions) {
    if (!options.serverKey) throw new Error("ERLCClient requires a serverKey.")
    this.serverKey = options.serverKey
    this.apiKey = options.apiKey
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL
    this.fetchImpl = options.fetch ?? fetch
  }

  async getServer(options: GetServerOptions = {}): Promise<ServerStatus> {
    const search = new URLSearchParams()
    for (const [key, flag] of Object.entries(QUERY_FLAG_MAP) as [keyof GetServerOptions, string][]) {
      if (options[key]) search.set(flag, "true")
    }
    const qs = search.toString()
    return this.request<ServerStatus>(`/v2/server${qs ? `?${qs}` : ""}`)
  }

  getPlayers() {
    return this.getServer({ players: true }).then((s) => s.Players ?? [])
  }

  getStaff() {
    return this.getServer({ staff: true }).then((s) => s.Staff)
  }

  getJoinLogs() {
    return this.getServer({ joinLogs: true }).then((s) => s.JoinLogs ?? [])
  }

  getQueue() {
    return this.getServer({ queue: true }).then((s) => s.Queue ?? [])
  }

  getKillLogs() {
    return this.getServer({ killLogs: true }).then((s) => s.KillLogs ?? [])
  }

  getCommandLogs() {
    return this.getServer({ commandLogs: true }).then((s) => s.CommandLogs ?? [])
  }

  getModCalls() {
    return this.getServer({ modCalls: true }).then((s) => s.ModCalls ?? [])
  }

  getEmergencyCalls() {
    return this.getServer({ emergencyCalls: true }).then((s) => s.EmergencyCalls ?? [])
  }

  getVehicles() {
    return this.getServer({ vehicles: true }).then((s) => s.Vehicles ?? [])
  }

  async runCommand(command: string): Promise<CommandResult> {
    return this.request<CommandResult>("/v2/server/command", {
      method: "POST",
      body: JSON.stringify({ command }),
    })
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    headers.set("server-key", this.serverKey)
    headers.set("Accept", "application/json")
    if (this.apiKey) headers.set("Authorization", this.apiKey)
    if (init.body) headers.set("Content-Type", "application/json")

    const res = await this.fetchImpl(`${this.baseUrl}${path}`, { ...init, headers })

    if (res.status === 429) {
      const body = await safeJson(res)
      throw new ERLCRateLimitError({
        status: res.status,
        code: extractCode(body),
        body,
        message: extractMessage(body),
        bucket: res.headers.get("X-RateLimit-Bucket") ?? undefined,
        limit: numberOrUndefined(res.headers.get("X-RateLimit-Limit")),
        remaining: numberOrUndefined(res.headers.get("X-RateLimit-Remaining")),
        resetAt: dateOrUndefined(res.headers.get("X-RateLimit-Reset")),
      })
    }

    if (!res.ok) {
      const body = await safeJson(res)
      const message = extractMessage(body) ?? res.statusText
      if (res.status === 403)
        throw new ERLCAuthError({ status: res.status, code: extractCode(body), body })
      if (res.status === 400)
        throw new ERLCBadRequestError(message, { status: res.status, code: extractCode(body), body })
      if (res.status === 422)
        throw new ERLCServerOfflineError(message, {
          status: res.status,
          code: extractCode(body),
          commandId: extractCommandId(body),
          body,
        })
      if (res.status === 500)
        throw new ERLCUpstreamError(message, {
          status: res.status,
          code: extractCode(body),
          commandId: extractCommandId(body),
          body,
        })
      throw new ERLCApiError(message, { status: res.status, code: extractCode(body), body })
    }

    return (await res.json()) as T
  }
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return undefined
  }
}

function extractMessage(body: unknown): string | undefined {
  if (body && typeof body === "object") {
    if ("message" in body && typeof body.message === "string") return body.message
    if ("error" in body && typeof body.error === "string") return body.error
  }
  return undefined
}

function extractCode(body: unknown): number | undefined {
  if (body && typeof body === "object" && "code" in body && typeof body.code === "number") return body.code
  return undefined
}

function extractCommandId(body: unknown): string | undefined {
  if (body && typeof body === "object" && "commandId" in body && typeof body.commandId === "string")
    return body.commandId
  return undefined
}

function numberOrUndefined(value: string | null): number | undefined {
  if (value === null) return undefined
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}

function dateOrUndefined(value: string | null): Date | undefined {
  const n = numberOrUndefined(value)
  return n === undefined ? undefined : new Date(n * 1000)
}