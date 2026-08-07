export interface Location {
  LocationX: number
  LocationZ: number
  PostalCode: string
  StreetName: string
  BuildingNumber: string
}

export interface Player {
  Team: string
  Player: string
  Callsign: string | null
  Location: Location
  Permission: string
  WantedStars: number
}

export interface StaffList {
  Admins: Record<string, string>
  Mods: Record<string, string>
  Helpers: Record<string, string>
}

export interface JoinLogEntry {
  Join: boolean
  Timestamp: number
  Player: string
}

export interface KillLogEntry {
  Killed: string
  Timestamp: number
  Killer: string
}

export interface CommandLogEntry {
  Player: string
  Timestamp: number
  Command: string
}

export interface ModCallEntry {
  Caller: string
  Moderator: string | null
  Timestamp: number
}

export interface EmergencyCallEntry {
  Team: string
  Caller: number
  Players: number[]
  Position: [number, number]
  StartedAt: number
  CallNumber: number
  Description: string
  PositionDescriptor: string
}

export interface Vehicle {
  Name: string
  Owner: string
  Plate: string
  Texture: string | null
  ColorHex: string
  ColorName: string
}

export interface ServerStatus {
  Name: string
  OwnerId: number
  CoOwnerIds: number[]
  CurrentPlayers: number
  MaxPlayers: number
  JoinKey: string
  AccVerifiedReq: string
  TeamBalance: boolean
  Players?: Player[]
  Staff?: StaffList
  JoinLogs?: JoinLogEntry[]
  Queue?: number[]
  KillLogs?: KillLogEntry[]
  CommandLogs?: CommandLogEntry[]
  ModCalls?: ModCallEntry[]
  EmergencyCalls?: EmergencyCallEntry[]
  Vehicles?: Vehicle[]
}

export interface GetServerOptions {
  players?: boolean
  staff?: boolean
  joinLogs?: boolean
  queue?: boolean
  killLogs?: boolean
  commandLogs?: boolean
  modCalls?: boolean
  emergencyCalls?: boolean
  vehicles?: boolean
}

export interface CommandResult {
  message: string
}