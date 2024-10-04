package database

import (
	"alexandria/internal/config"
	"alexandria/internal/models"
	"database/sql"
	"fmt"

	_ "github.com/go-sql-driver/mysql"
)

func InitDB(cfg config.DatabaseConfig) (*sql.DB, error) {
	connectionString := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?allowNativePasswords=true&tls=true", cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.Name)

	db, err := sql.Open("mysql", connectionString)
	if err != nil {
		return nil, fmt.Errorf("error opening database: %w", err)
	}

	err = db.Ping()
	if err != nil {
		return nil, fmt.Errorf("error connecting to database: %w", err)
	}

	fmt.Println("Successfully created connection to database.")

	createTableQuery := `
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        nickname VARCHAR(255),
        avatar_url VARCHAR(255),
        user_id VARCHAR(255) NOT NULL UNIQUE,
        provider VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=INNODB;`

	_, err = db.Exec(createTableQuery)
	if err != nil {
		return nil, fmt.Errorf("error creating 'users' table: %w", err)
	}

	fmt.Println("Finished creating table (if not existed).")

	return db, nil
}

func StoreUserInfo(db *sql.DB, user *models.User) error {
	sqlStatement, err := db.Prepare(`
        INSERT INTO users (name, email, nickname, avatar_url, user_id, provider)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        email = VALUES(email),
        nickname = VALUES(nickname),
        avatar_url = VALUES(avatar_url),
        provider = VALUES(provider)
    `)
	if err != nil {
		return fmt.Errorf("error preparing statement: %w", err)
	}
	defer sqlStatement.Close()

	res, err := sqlStatement.Exec(user.Name, user.Email, user.Nickname, user.AvatarURL, user.UserID, user.Provider)
	if err != nil {
		return fmt.Errorf("error executing statement: %w", err)
	}

	rowCount, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("error getting affected rows: %w", err)
	}

	fmt.Printf("Affected %d row(s) of data.\n", rowCount)
	return nil
}

func GetUserByID(db *sql.DB, userID string) (*models.User, error) {
	user := &models.User{}
	err := db.QueryRow("SELECT name, email, nickname, avatar_url, user_id, provider FROM users WHERE user_id = ?", userID).
		Scan(&user.Name, &user.Email, &user.Nickname, &user.AvatarURL, &user.UserID, &user.Provider)
	if err != nil {
		return nil, fmt.Errorf("error fetching user: %w", err)
	}
	return user, nil
}
