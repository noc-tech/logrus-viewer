// go:generate go-bindata -prefix "dist/logrus-viewer" dist/logrus-viewer/...
package main

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"path/filepath"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/noc-tech/logrus-viewer/hook"
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/log/post", createLog)
	mux.HandleFunc("/log/clear", clearLogs)
	mux.HandleFunc("/log", getLogs)
	mux.HandleFunc("/", assetsHandler)
	if err := http.ListenAndServe(":1299", mux); err != nil {
		log.Fatal(err)
	}
}

func assetsHandler(w http.ResponseWriter, r *http.Request) {
	var file = strings.TrimLeft(filepath.Base(r.URL.Path), "/")
	if file == "" {
		file = "index.html"
	}
	if bs, err := Asset(file); err != nil {
		w.WriteHeader(http.StatusNotFound)
	} else {
		contentType := "text/plain"
		if strings.HasSuffix(file, ".css") {
			contentType = "text/css"
		} else if strings.HasSuffix(file, ".html") {
			contentType = "text/html"
		} else if strings.HasSuffix(file, ".js") {
			contentType = "application/javascript"
		} else if strings.HasSuffix(file, ".png") {
			contentType = "image/png"
		} else if strings.HasSuffix(file, ".jpg") {
			contentType = "image/jpg"
		} else if strings.HasSuffix(file, ".svg") {
			contentType = "image/svg+xml"
		}
		w.Header().Add("Content-Type", contentType)
		var reader = bytes.NewBuffer(bs)
		io.Copy(w, reader)
	}
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
