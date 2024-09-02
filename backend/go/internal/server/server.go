package server

import (
	"alexandria/internal/config"
	"alexandria/internal/handlers"
	"database/sql"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/gorilla/sessions"
	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	"github.com/markbates/goth/providers/github"
	"github.com/markbates/goth/providers/google"
	"github.com/rs/cors"
)

func New(cfg *config.Config, db *sql.DB) *http.Server {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	store := sessions.NewCookieStore([]byte(cfg.SessionSecret))
	gothic.Store = store

	goth.UseProviders(
		github.New(cfg.GithubConfig.ClientID, cfg.GithubConfig.ClientSecret, cfg.GithubConfig.CallbackURL),
		google.New(cfg.GoogleConfig.ClientID, cfg.GoogleConfig.ClientSecret, cfg.GoogleConfig.CallbackURL),
	)

	gothic.GetProviderName = func(req *http.Request) (string, error) {
		provider := chi.URLParam(req, "provider")
		if provider == "" {
			return provider, fmt.Errorf("no provider specified")
		}
		return provider, nil
	}

	r.Get("/auth/{provider}/callback", handlers.AuthCallback(db))
	r.Get("/auth/{provider}", handlers.AuthProvider)
	r.Get("/logout", handlers.Logout)
	r.Get("/", handlers.GetProviders)
	r.Get("/user/info", handlers.GetUserInfo(db))

	c := cors.New(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "Content-Length", "Accept-Encoding", "Authorization"},
		AllowCredentials: true,
	})

	handler := c.Handler(r)

	return &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: handler,
	}
}
