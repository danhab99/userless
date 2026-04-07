package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

type Packet struct {
	Action  string          `json:"action"`
	Payload json.RawMessage `json:"payload"`
}

type hub struct {
	mu      sync.RWMutex
	clients map[*websocket.Conn]struct{}
}

func newHub() *hub {
	return &hub{clients: make(map[*websocket.Conn]struct{})}
}

func (h *hub) add(c *websocket.Conn) {
	h.mu.Lock()
	h.clients[c] = struct{}{}
	h.mu.Unlock()
}

func (h *hub) remove(c *websocket.Conn) {
	h.mu.Lock()
	delete(h.clients, c)
	h.mu.Unlock()
	c.Close()
}

func (h *hub) broadcast(msg []byte, skip *websocket.Conn) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		if c == skip {
			continue
		}
		if err := c.WriteMessage(websocket.TextMessage, msg); err != nil {
			log.Printf("write error: %v", err)
		}
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
	h.add(conn)
	log.Printf("peer connected: %s (total: %d)", r.RemoteAddr, len(h.clients))
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

		switch pkt.Action {
		case "new_peer", "emergency":
			log.Printf("broadcast action=%s from %s", pkt.Action, r.RemoteAddr)
			h.broadcast(msg, conn)
		default:
			log.Printf("unknown action=%q from %s", pkt.Action, r.RemoteAddr)
		}
	}
}

func main() {
	h := newHub()
	http.HandleFunc("/lobby", h.serveWS)

	addr := ":8080"
	log.Printf("lobby listening on %s", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
