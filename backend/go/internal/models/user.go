package models

type User struct {
	Name      string `json:"name"`
	Email     string `json:"email"`
	Nickname  string `json:"nickname"`
	AvatarURL string `json:"avatarURL"`
	UserID    string `json:"userID"`
	Provider  string `json:"provider"`
}
