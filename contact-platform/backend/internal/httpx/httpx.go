package httpx

import (
	"encoding/json"
	"net/http"
)

type ErrorBody struct {
	Error  string       `json:"error"`
	Fields []FieldError `json:"fields,omitempty"`
}

type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func JSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func Error(w http.ResponseWriter, status int, code string) {
	JSON(w, status, ErrorBody{Error: code})
}

func Validation(w http.ResponseWriter, status int, code string, fields []FieldError) {
	JSON(w, status, ErrorBody{Error: code, Fields: fields})
}

func DecodeJSON(r *http.Request, dst any, maxBytes int64) error {
	r.Body = http.MaxBytesReader(nil, r.Body, maxBytes)
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(dst)
}
