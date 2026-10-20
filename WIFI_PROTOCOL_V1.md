# Korosh Nova Wi-Fi Protocol V1

The mobile app treats Wi-Fi and Bluetooth as independent transports.

## Health
GET `/api/health`

Expected successful JSON:
`{"ok":true,"device":"korosh-nova","protocol":1}`

## Command
POST `/api/command`

Body:
`{"protocol":1,"command":"light.power","args":{"on":true}}`

Supported commands:
- `light.power`
- `light.brightness`
- `light.speed`
- `light.color`
- `light.mode`
- `light.scene`
- `light.neonPower`
- `light.neonColor`
- `light.neonBrightness`
- `light.neonSpeed`
- `music.play`
- `music.pause`
- `music.resume`
- `music.stop`
- `music.volume`

## Music upload
POST `/api/music/upload?title=...&artist=...`

Body is raw binary audio. Header `X-Korosh-Protocol: 1`.
Successful response must contain `ok:true` and preferably a `trackId`.
The app sends `music.play` after upload when a trackId is returned.

## Transport independence
- BLE unavailable -> Wi-Fi control can continue.
- Wi-Fi unavailable -> BLE lighting control can continue.
- BLE GATT and Bluetooth A2DP are separate Android capabilities.
- Local Android playback can use Bluetooth A2DP without the BLE control channel.

