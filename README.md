# Together map

A full-screen live map for small groups. Enter a nickname and the same password on each device, allow location access, and see each other's current positions. No accounts, build step, application backend, or saved location history.

## GitHub Pages

1. Put these files in a GitHub repository with a `main` branch, preserving `.github/workflows/pages.yml`.
2. Under **Settings → Pages → Source**, select **GitHub Actions**.
3. Push to `main` or run **Deploy GitHub Pages** manually. Its deployment result gives the live URL.

All asset paths are relative, so user and project Pages sites both work. The included workflow runs the protocol tests and publishes only the four application files.

## Use

Open the same URL on two devices. Use exactly the same password (case and spaces matter; minimum 8 characters) and separate nicknames. Allow location access. Use **Show everyone**, tap a person's nickname to center the map, or **Stop sharing** to stop GPS watching and leave the room. Nicknames are not unique identities. Anyone with the password can join without host approval.

## Architecture

- Leaflet 1.9.4 and standard OpenStreetMap raster tiles render the map with attribution.
- p2p-core v0.1.0 provides same-browser discovery and public Nostr relay discovery with direct WebRTC (using its pinned, bundled Trystero). Online mode disables local server discovery. Messages use the p2p-core send/onMessage API, with protocol validation, a 2 KiB limit and a five-message-per-second receive limit.
- The room ID is SHA-256 of a versioned app prefix plus the exact password. The password is also passed to p2p-core to isolate every transport and encrypt Trystero signaling. Choose a long, unpredictable password: a digest does not prevent guessing weak passwords.
- Connected browsers share only their own nickname, coordinates, accuracy and fix timestamp over encrypted WebRTC. A new peer receives the current state immediately; a ten-second heartbeat keeps presence fresh.
- Passwords and locations are never stored by this app, included in URLs, or sent to analytics. Received nicknames are rendered as text, not HTML. Incoming messages are size-limited and validated.
- Accuracy circles show GPS uncertainty. Markers fade after 45 seconds without a fresh fix and disappear after two minutes. Disconnected peers are removed immediately when detected. No route history is kept.

## Practical limits

No backend you operate does not mean no external infrastructure: public discovery relays, STUN, CDNs and map tiles are still required. Map providers see tile requests, and peers may learn each other's IP addresses. Recipients can save locations themselves. Location privacy depends on sharing the password only with people you trust.

Some network pairs require TURN to establish WebRTC; this version has no TURN service or embedded credentials. If two devices cannot connect, try another network. An empty room and unavailable discovery relays cannot always be distinguished, so peer counts only include actual connected peers. This is a small-group mesh, not an unlimited public tracking service.

Keep the page visible: mobile browsers may suspend GPS, timers and connections when backgrounded or locked. It is not continuous background tracking. Closing the page stops the session; remote disappearance may take up to two minutes after an abrupt disconnect. No moderator, verified identity, offline delivery or durable storage is provided.

## Local checks

Run `npm test` (Node 22+; no installation required). Serve with `python3 -m http.server 8000` and open `http://localhost:8000`. Location access requires HTTPS or localhost; a plain HTTP LAN address usually cannot request GPS.

Manual acceptance: test two tabs, then two phones on different networks; verify same-password connection, different-password isolation, late joining, movement, denied GPS permission, stop sharing, tab close, stale locations and reconnection. CDN, map, GPS and real network behavior must be checked in a browser; protocol tests alone do not verify them.

References: https://trystero.dev/docs/ and https://trystero.dev/docs/connections/
