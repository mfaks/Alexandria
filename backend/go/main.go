package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/gorilla/sessions"
	"github.com/joho/godotenv"
	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	"github.com/markbates/goth/providers/github"
	"github.com/markbates/goth/providers/google"
	"github.com/rs/cors"
)

type User struct {
	Name      string `json:"name"`
	Email     string `json:"email"`
	NickName  string `json:"nickName"`
	AvatarURL string `json:"avatarURL"`
	UserID    string `json:"userID"`
	Provider  string `json:"provider"`
}

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	sessionSecret := os.Getenv("SESSION_SECRET")
	if sessionSecret == "" {
		log.Fatal("SESSION_SECRET must be set")
	}
	store := sessions.NewCookieStore([]byte(sessionSecret))
	gothic.Store = store

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	goth.UseProviders(
		github.New(os.Getenv("GITHUB_CLIENT_ID"), os.Getenv("GITHUB_CLIENT_SECRET"), "http://localhost:"+port+"/auth/github/callback"),
		google.New(os.Getenv("GOOGLE_CLIENT_ID"), os.Getenv("GOOGLE_CLIENT_SECRET"), "http://localhost:"+port+"/auth/google/callback"),
	)

	gothic.GetProviderName = func(req *http.Request) (string, error) {
		provider := chi.URLParam(req, "provider")
		if provider == "" {
			return provider, fmt.Errorf("no provider specified")
		}
		return provider, nil
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/auth/{provider}/callback", func(w http.ResponseWriter, r *http.Request) {
		user, err := gothic.CompleteUserAuth(w, r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		jsonData, err := json.Marshal(user)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		http.SetCookie(w, &http.Cookie{
			Name:     "user_data",
			Value:    string(jsonData),
			Path:     "/",
			MaxAge:   3600,
			HttpOnly: true,
			Secure:   true,
			SameSite: http.SameSiteStrictMode,
		})

		http.Redirect(w, r, "http://localhost:4200/my-uploads", http.StatusTemporaryRedirect)
	})

	r.Get("/auth/{provider}", func(w http.ResponseWriter, r *http.Request) {
		gothic.BeginAuthHandler(w, r)
	})

	r.Get("/logout/{provider}", func(w http.ResponseWriter, r *http.Request) {
		gothic.Logout(w, r)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Logged out successfully"})
	})

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string][]string{
			"providers": {"github", "google"},
		})
	})

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:4200"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "Content-Length", "Accept-Encoding", "Authorization"},
		AllowCredentials: true,
	})

	handler := c.Handler(r)

	log.Printf("Server is running on http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}
