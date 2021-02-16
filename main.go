package main

import (
	"embed"
	"encoding/json"
	"io/fs"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/noc-tech/logrus-viewer/hook"
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/log/post", createLog)
	mux.HandleFunc("/log/clear", clearLogs)
	mux.HandleFunc("/log", getLogs)
	mux.Handle("/", http.FileServer(getFileSystem()))
	if err := http.ListenAndServe(":1299", mux); err != nil {
		log.Fatal(err)
	}
}

//go:embed dist/logrus-viewer
var embededFiles embed.FS

func getFileSystem() http.FileSystem {
	fsys, err := fs.Sub(embededFiles, "dist/logrus-viewer")
	if err != nil {
		log.Fatal(err)
	}
	return http.FS(fsys)
}

var logs = logDB{}

func createLog(w http.ResponseWriter, r *http.Request) {
	var p hook.Entry
	err := json.NewDecoder(r.Body).Decode(&p)
	if err != nil {
		log.Println(err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	logChan <- &p
	logs.Add(&p)
	w.WriteHeader(200)
	return
}

func clearLogs(w http.ResponseWriter, r *http.Request) {
	logs = logDB{}
	w.WriteHeader(200)
	return
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

var logChan = make(chan *hook.Entry, 10000)

func getLogs(w http.ResponseWriter, r *http.Request) {
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Print("upgrade:", err)
		return
	}
	defer c.Close()
	ls := logs.List()
	jsonStr, _ := json.Marshal(ls)
	err = c.WriteMessage(websocket.TextMessage, jsonStr)
	if err != nil {
		log.Println("writex:", err)
		return
	}
	defer log.Println("ended")
	for {
		select {
		case l := <-logChan:
			jsonStr, _ := json.Marshal(l)
			err = c.WriteMessage(websocket.TextMessage, jsonStr)
			if err != nil {
				log.Println("write2:", err)
				return
			}
		}
	}
}

type logDB struct {
	sync.RWMutex
	Logs []*hook.Entry
}

func (s *logDB) Add(l *hook.Entry) {
	s.Lock()
	defer s.Unlock()
	s.Logs = append(s.Logs, l)
}

func (s *logDB) List() []*hook.Entry {
	s.RLock()
	defer s.RUnlock()
	return s.Logs
}
