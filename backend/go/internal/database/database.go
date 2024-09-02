package database

import (
	"alexandria/internal/config"
	"alexandria/internal/models"
	"database/sql"
	"fmt"

	_ "github.com/go-sql-driver/mysql"
)

func InitDB(cfg config.DatabaseConfig) (*sql.DB, error) {
	dataSourceName := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s", cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.Name)
	db, err := sql.Open("mysql", dataSourceName)
	if err != nil {
		return nil, fmt.Errorf("error opening database: %w", err)
	}

	err = db.Ping()
	if err != nil {
		return nil, fmt.Errorf("error connecting to database: %w", err)
	}

	return db, nil
}

func StoreUserInfo(db *sql.DB, user *models.User) error {
	_, err := db.Exec(`
		INSERT INTO users (name, email, nickname, avatar_url, user_id, provider)
		VALUES (?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
		name = VALUES(name),
		email = VALUES(email),
		nickname = VALUES(nickname),
		avatar_url = VALUES(avatar_url),
		provider = VALUES(provider)
	`, user.Name, user.Email, user.Nickname, user.AvatarURL, user.UserID, user.Provider)

	return err
}
