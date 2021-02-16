package hook

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"

	log "github.com/sirupsen/logrus"
)

func New() *Hook {
	return &Hook{}
}

type Hook struct{}

func (hook *Hook) Fire(entry *log.Entry) error {
	le := Entry{entry.Time, entry.Level.String(), entry.Message, entry.Data}
	jsonStr, err := json.Marshal(le)
	if err != nil {
		return err
	}
	req, err := http.NewRequest("POST", "http://localhost:1299/log/post", bytes.NewBuffer(jsonStr))
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	_, err = client.Do(req)
	if err != nil {
		return err
	}
	return nil
}

// Levels define on which log levels this hook would trigger
func (hook *Hook) Levels() []log.Level {
	return log.AllLevels
}

type Entry struct {
	Time    time.Time              `json:"time"`
	Level   string                 `json:"level"`
	Message string                 `json:"message"`
	Data    map[string]interface{} `json:"data"`
}
