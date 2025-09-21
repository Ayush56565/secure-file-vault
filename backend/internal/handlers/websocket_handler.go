package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type WebSocketManager struct {
	clients    map[*websocket.Conn]bool
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
	broadcast  chan []byte
	mutex      sync.RWMutex
}

type WebSocketMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		
		// Allow specific origins for production
		allowedOrigins := []string{
			"https://secure-file-vault-frontend.onrender.com",
			"http://localhost:3000",
			"http://localhost:5173",
			"http://127.0.0.1:3000",
			"http://127.0.0.1:5173",
		}
		
		// Check if origin is allowed
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin {
				return true
			}
		}
		
		// Allow requests without origin header (direct connections)
		return origin == ""
	},
}

func NewWebSocketManager() *WebSocketManager {
	return &WebSocketManager{
		clients:    make(map[*websocket.Conn]bool),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
		broadcast:  make(chan []byte),
	}
}

func (ws *WebSocketManager) Run() {
	for {
		select {
		case conn := <-ws.register:
			ws.mutex.Lock()
			ws.clients[conn] = true
			ws.mutex.Unlock()
			log.Printf("WebSocket client connected. Total clients: %d", len(ws.clients))

		case conn := <-ws.unregister:
			ws.mutex.Lock()
			if _, ok := ws.clients[conn]; ok {
				delete(ws.clients, conn)
				conn.Close()
			}
			ws.mutex.Unlock()
			log.Printf("WebSocket client disconnected. Total clients: %d", len(ws.clients))

		case message := <-ws.broadcast:
			ws.mutex.RLock()
			for conn := range ws.clients {
				err := conn.WriteMessage(websocket.TextMessage, message)
				if err != nil {
					log.Printf("WebSocket write error: %v", err)
					conn.Close()
					delete(ws.clients, conn)
				}
			}
			ws.mutex.RUnlock()
		}
	}
}

func (ws *WebSocketManager) Broadcast(message WebSocketMessage) {
	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling WebSocket message: %v", err)
		return
	}
	ws.broadcast <- data
}

func (ws *WebSocketManager) HandleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	ws.register <- conn

	// Handle client disconnect
	defer func() {
		ws.unregister <- conn
	}()

	// Keep connection alive
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
	}
}

// Global WebSocket manager instance
var WSManager *WebSocketManager

func init() {
	WSManager = NewWebSocketManager()
	go WSManager.Run()
}
