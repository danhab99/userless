package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/gorilla/websocket"
)

type Packet struct {
	Action  string          `json:"action"`
	Payload json.RawMessage `json:"payload"`
}

type NewPeerPayload struct {
	SessionID string `json:"sessionId"`
}

// RoutedPayload is used by rtc_offer, rtc_answer, and rtc_ice to carry
// targeted from/to addressing so the lobby can deliver to one peer only.
type RoutedPayload struct {
	From string `json:"from"`
	To   string `json:"to"`
}

type hub struct {
	mu      sync.RWMutex
	clients map[string]*websocket.Conn    // fingerprint → conn
	conns   map[*websocket.Conn]string    // conn → fingerprint (reverse lookup for cleanup)
	writeMu map[*websocket.Conn]*sync.Mutex // per-connection write mutex
}

func newHub() *hub {
	return &hub{
		clients: make(map[string]*websocket.Conn),
		conns:   make(map[*websocket.Conn]string),
		writeMu: make(map[*websocket.Conn]*sync.Mutex),
	}
}

// addConn registers a fresh connection before its fingerprint is known.
func (h *hub) addConn(c *websocket.Conn) {
	h.mu.Lock()
	h.writeMu[c] = &sync.Mutex{}
	h.mu.Unlock()
}

// register maps a fingerprint to a connection once the new_peer packet arrives.
func (h *hub) register(fp string, c *websocket.Conn) {
	h.mu.Lock()
	h.clients[fp] = c
	h.conns[c] = fp
	h.mu.Unlock()
}

// remove cleans up all state for a connection.
func (h *hub) remove(c *websocket.Conn) {
	h.mu.Lock()
	fp := h.conns[c]
	delete(h.clients, fp)
	delete(h.conns, c)
	delete(h.writeMu, c)
	h.mu.Unlock()
	c.Close()
}

// writeConn sends a message to a single connection using its per-conn mutex.
func (h *hub) writeConn(c *websocket.Conn, mu *sync.Mutex, msg []byte) {
	mu.Lock()
	defer mu.Unlock()
	if err := c.WriteMessage(websocket.TextMessage, msg); err != nil {
		log.Printf("write error: %v", err)
	}
}

// send delivers a message to the peer identified by fingerprint.
func (h *hub) send(fp string, msg []byte) {
	h.mu.RLock()
	c, ok := h.clients[fp]
	var mu *sync.Mutex
	if ok {
		mu = h.writeMu[c]
	}
	h.mu.RUnlock()

	if !ok {
		log.Printf("send: no peer with fingerprint %s", fp)
		return
	}
	h.writeConn(c, mu, msg)
}

// broadcast delivers a message to every registered peer except skip.
func (h *hub) broadcast(msg []byte, skip *websocket.Conn) {
	type pair struct {
		c  *websocket.Conn
		mu *sync.Mutex
	}

	h.mu.RLock()
	peers := make([]pair, 0, len(h.clients))
	for _, c := range h.clients {
		if c != skip {
			peers = append(peers, pair{c, h.writeMu[c]})
		}
	}
	h.mu.RUnlock()

	log.Printf("broadcasting to %d peers", len(peers))
	for _, p := range peers {
		h.writeConn(p.c, p.mu, msg)
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func (h *hub) serveWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("upgrade error: %v", err)
		return
	}
	h.addConn(conn)
	log.Printf("peer connected: %s", r.RemoteAddr)
	defer func() {
		h.remove(conn)
		log.Printf("peer disconnected: %s", r.RemoteAddr)
	}()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			if !websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				log.Printf("read error: %v", err)
			}
			return
		}

		var pkt Packet
		if err := json.Unmarshal(msg, &pkt); err != nil {
			log.Printf("invalid packet from %s: %v", r.RemoteAddr, err)
			continue
		}
		log.Printf("received packet from %s action=%s", r.RemoteAddr, pkt.Action)

		switch pkt.Action {
		case "new_peer":
			var payload NewPeerPayload
			if err := json.Unmarshal(pkt.Payload, &payload); err != nil || payload.SessionID == "" {
				log.Printf("invalid new_peer payload from %s: %v", r.RemoteAddr, err)
				continue
			}
			h.register(payload.SessionID, conn)
			log.Printf("registered peer sessionId=%s addr=%s", payload.SessionID, r.RemoteAddr)
			h.broadcast(msg, conn)

		case "emergency":
			h.broadcast(msg, conn)

		case "rtc_offer", "rtc_answer", "rtc_ice":
			var payload RoutedPayload
			if err := json.Unmarshal(pkt.Payload, &payload); err != nil || payload.To == "" {
				log.Printf("invalid %s from %s: missing to field", pkt.Action, r.RemoteAddr)
				continue
			}
			log.Printf("routing action=%s from=%s to=%s", pkt.Action, payload.From, payload.To)
			h.send(payload.To, msg)

		default:
			log.Printf("unknown action=%q from %s", pkt.Action, r.RemoteAddr)
		}
	}
}

func main() {
	addr := os.Getenv("LOBBY_ADDR")
	if addr == "" {
		addr = ":4445"
	}

	h := newHub()
	http.HandleFunc("/lobby", h.serveWS)

	log.Printf("lobby listening on %s", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
