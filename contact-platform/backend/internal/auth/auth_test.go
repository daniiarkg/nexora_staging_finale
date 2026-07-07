package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestSessionCookiesAreSecure(t *testing.T) {
	recorder := httptest.NewRecorder()
	SetCookie(recorder, "token", time.Hour)

	cookies := recorder.Result().Cookies()
	if len(cookies) != 1 {
		t.Fatalf("expected one cookie, got %d", len(cookies))
	}
	if !cookies[0].Secure {
		t.Fatal("expected session cookie to be Secure")
	}
	if !cookies[0].HttpOnly {
		t.Fatal("expected session cookie to be HttpOnly")
	}
	if cookies[0].SameSite != http.SameSiteLaxMode {
		t.Fatalf("expected SameSite=Lax, got %v", cookies[0].SameSite)
	}
}

func TestClearCookieIsSecure(t *testing.T) {
	recorder := httptest.NewRecorder()
	ClearCookie(recorder)

	cookies := recorder.Result().Cookies()
	if len(cookies) != 1 {
		t.Fatalf("expected one cookie, got %d", len(cookies))
	}
	if !cookies[0].Secure {
		t.Fatal("expected clear cookie to be Secure")
	}
	if cookies[0].MaxAge != -1 {
		t.Fatalf("expected MaxAge=-1, got %d", cookies[0].MaxAge)
	}
}
