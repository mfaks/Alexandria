package handlers

import (
	"alexandria/internal/database"
	"alexandria/internal/models"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"github.com/markbates/goth/gothic"
)

func AuthCallback(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, err := gothic.CompleteUserAuth(w, r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		newUser := &models.User{
			Name:      user.Name,
			Email:     user.Email,
			Nickname:  user.NickName,
			AvatarURL: user.AvatarURL,
			UserID:    user.UserID,
			Provider:  user.Provider,
		}

		err = database.StoreUserInfo(db, newUser)
		if err != nil {
			log.Printf("Error storing user info: %v", err)
			http.Error(w, "Error storing user info", http.StatusInternalServerError)
			return
		}

		jsonData, err := json.Marshal(newUser)
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
	}
}

func AuthProvider(w http.ResponseWriter, r *http.Request) {
	gothic.BeginAuthHandler(w, r)
}

func Logout(w http.ResponseWriter, r *http.Request) {
	gothic.Logout(w, r)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Logged out successfully"})
}

func GetProviders(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string][]string{
		"providers": {"github", "google"},
	})
}
