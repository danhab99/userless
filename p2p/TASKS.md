
## TODO 

- [ ] Unify peer identity across spec, lobby, and browser app (`fingerprint` vs `sessionId`)
- [ ] Unify paging model across spec and RPC implementation (`cursor`/`limit` vs `skip`/`take`)
- [ ] Remove TypeScript build errors in the p2p app and restore a green `npm run build`
- [ ] Add IndexedDB schema creation and migrations for `threads`, `publickey`, `file`, bookmarks, and audit log stores
- [ ] Implement missing local RPC handlers for `getFile` and `getPublicKeys`
- [ ] Add startup flow that connects to the lobby and calls peer announcement automatically
- [ ] Mount `UserlessProvider` at app startup and expose live state to the UI
- [ ] Remove debug-only code paths such as stray `debugger` statements in the p2p client
- [ ] Add connection and transfer telemetry so the status bar can show live peers, upload, and download bandwidth
- [ ] Add database counters for threads, files, and keys for the status bar
- [ ] Build the main thread view pane so selecting a sidebar item renders the thread body
- [ ] Implement reply thread loading and display beneath the selected thread
- [ ] Add bookmark storage and bookmark actions for threads
- [ ] Add reply composition flow for the main thread view
- [ ] Implement public keys page with discovered and owned key lists
- [ ] Add public key detail view showing all threads signed by that key
- [ ] Implement files page backed by downloaded file metadata
- [ ] Store backlink metadata from downloaded files to source threads
- [ ] Add append-only audit log storage and UI view
- [ ] Add emergency event handling to the audit log and visible UI state
- [ ] Add TURN server configuration support for NAT-unfriendly peer connections
- [ ] Add two-browser local integration test flow for lobby connect, signaling, RPC, file fetch, and key fetch


## In progress

- [ ] Lobby websocket server routes `new_peer`, `rtc_offer`, `rtc_answer`, `rtc_ice`, and `emergency`
- [ ] Browser WebRTC layer creates peer connections and dual RPC data channels
- [ ] Local cache wrapper can scan peers for threads and fetch referenced files and keys
- [ ] Main page shell exists with sidebar, body area, and bottom status bar component

## Done

- [ ] Drafted p2p protocol document for lobby signaling, JSON-RPC methods, and file chunking
- [ ] Added Go lobby service with `/lobby` websocket endpoint and successful local build

## Rejected

- [ ]
