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

		session, _ := gothic.Store.Get(r, "gothic_session")
		session.Values["user_id"] = user.UserID
		err = session.Save(r, w)
		if err != nil {
			log.Printf("Error saving session: %v", err)
			http.Error(w, "Error saving session", http.StatusInternalServerError)
			return
		}

		http.Redirect(w, r, "https://alexandriadev.us/my-uploads", http.StatusTemporaryRedirect)
	}
}

func AuthProvider(w http.ResponseWriter, r *http.Request) {
	gothic.BeginAuthHandler(w, r)
}

func Logout(w http.ResponseWriter, r *http.Request) {
	gothic.Logout(w, r)
	session, _ := gothic.Store.Get(r, "gothic_session")
	session.Options.MaxAge = -1
	session.Save(r, w)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Logged out successfully"})
}

func GetProviders(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string][]string{
		"providers": {"github", "google"},
	})
}

func GetUserInfo(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		session, _ := gothic.Store.Get(r, "gothic_session")
		userID, ok := session.Values["user_id"].(string)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		user, err := database.GetUserByID(db, userID)
		if err != nil {
			log.Printf("Error fetching user info: %v", err)
			http.Error(w, "Error fetching user info", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(user)
	}
}
