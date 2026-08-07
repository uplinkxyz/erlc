# @uplinkxyz/erlc

TypeScript client for the [ER:LC Private server API](https://apidocs.erlc.gg).

## Install

```bash
bun add @uplinkxyz/erlc
```

## Usage 

```bash
import { ERLCClient } from '@uplinkxyz/erlc'

const client = new ERLCClient({ serverKey: process.env.ERLC_SERVER_KEY! })

const server = await client.getServer({ players: true, killLogs: true })
console.log(server.CurrentPlayers, server.Players)

await client.runCommand(':h Hello from Uplink!')
```

## Public applications

If you've registered a [Public Application](https://apidocs.erlc.gg/creating-public-applications) pass its token as `apiKey`:

```bash
const client = new ERLCClient({
    serverKey: userSuppliedServerKey,
    apiKey: process.env.ERLC_APP_TOKEN!,
})
```

## API

- `getServer(options?)` - full server status, options are `players`, `staff`, `joinLogs`, `queue`, `killLogs`, `commandLogs`, `modCalls`, `emergencyCalls`, & `vehicles`
- `getPlayers()`, `getStaff()`, `getJoinLogs()`, `getQueue()`, `getKillLogs()`, `getCommandLogs()`, `getModCalls()`, `getEmergencyCalls()` & `getVehicles()`
- `runCommand(command: string)` - run an in-game command as virtual server management.
- `parsePlayer("Name:12345")` - parses ER:LC's `"Name:Id"` string format used throughout the API.

## Errors

All errors extend `ERLCApiError` (`status`, `code?`, `commandId?`, & `body`):
- `ERLCAuthError` - unauthorized
- `ERLCBadRequestError` - 400
- `ERLCServerOfflineError` - 422, server empty 
- `ERLCUpstreamError` - 500, couldn't reach roblox 
- `ERLCRateLimitError` - 429

## Current Maintainers
@LxghtBlvee