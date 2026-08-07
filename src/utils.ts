export interface ParsedPlayer {
  name: string
  id: number
}

// parses a player string in the format "Name:ID" into a ParsedPlayer object
export function parsePlayer(value: string): ParsedPlayer {
  const separatorIndex = value.lastIndexOf(":")
  if (separatorIndex === -1) throw new Error(`Cannot parse player string: "${value}"`)
  return {
    name: value.slice(0, separatorIndex),
    id: Number(value.slice(separatorIndex + 1)),
  }
}