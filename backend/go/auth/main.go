package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/go-chi/cors"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
	"golang.org/x/oauth2/google"
)

var (
	githubOauthConfig = &oauth2.Config{
		ClientID:     os.Getenv("GITHUB_CLIENT_ID"),
		ClientSecret: os.Getenv("GITHUB_CLIENT_SECRET"),
		RedirectURL:  "http://localhost:4200/callback",
		Scopes:       []string{"user:email"},
		Endpoint:     github.Endpoint,
	}

	googleOauthConfig = &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  "http://localhost:4200/callback",
		Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email"},
		Endpoint:     google.Endpoint,
	}
)

func main() {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:4200"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/auth/{provider}", handleAuth)
	r.Post("/callback/{provider}", handleCallback)

	fmt.Println("Server is running on http://localhost:8080")
	http.ListenAndServe(":8080", r)
}

func handleAuth(w http.ResponseWriter, r *http.Request) {
	provider := chi.URLParam(r, "provider")
	var config *oauth2.Config

	switch provider {
	case "github":
		config = githubOauthConfig
	case "google":
		config = googleOauthConfig
	default:
		http.Error(w, "Invalid provider", http.StatusBadRequest)
		return
	}

	url := config.AuthCodeURL("state")
	json.NewEncoder(w).Encode(map[string]string{"url": url})
}

func handleCallback(w http.ResponseWriter, r *http.Request) {
	provider := chi.URLParam(r, "provider")
	var config *oauth2.Config
	var userInfoURL string

	switch provider {
	case "github":
		config = githubOauthConfig
		userInfoURL = "https://api.github.com/user"
	case "google":
		config = googleOauthConfig
		userInfoURL = "https://www.googleapis.com/oauth2/v2/userinfo"
	default:
		http.Error(w, "Invalid provider", http.StatusBadRequest)
		return
	}

	var tokenRequest struct {
		Code string `json:"code"`
	}

	if err := json.NewDecoder(r.Body).Decode(&tokenRequest); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	token, err := config.Exchange(r.Context(), tokenRequest.Code)
	if err != nil {
		http.Error(w, "Failed to exchange token", http.StatusInternalServerError)
		return
	}

	client := config.Client(r.Context(), token)
	response, err := client.Get(userInfoURL)
	if err != nil {
		http.Error(w, "Failed to get user info", http.StatusInternalServerError)
		return
	}
	defer response.Body.Close()

	var userInfo map[string]interface{}
	if err := json.NewDecoder(response.Body).Decode(&userInfo); err != nil {
		http.Error(w, "Failed to decode user info", http.StatusInternalServerError)
		return
	}
	defer response.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(userInfo)
}
