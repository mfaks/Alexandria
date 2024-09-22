package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port           string
	SessionSecret  string
	Database       DatabaseConfig
	GithubConfig   ProviderConfig
	GoogleConfig   ProviderConfig
	AllowedOrigins []string
}

type DatabaseConfig struct {
	User     string
	Password string
	Host     string
	Port     string
	Name     string
}

type ProviderConfig struct {
	ClientID     string
	ClientSecret string
	CallbackURL  string
}

func Load() (*Config, error) {

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	return &Config{
		Port:          port,
		SessionSecret: os.Getenv("SESSION_SECRET"),
		Database: DatabaseConfig{
			User:     os.Getenv("MYSQL_USER"),
			Password: os.Getenv("MYSQL_PASSWORD"),
			Host:     os.Getenv("MYSQL_HOST"),
			Port:     os.Getenv("MYSQL_PORT"),
			Name:     os.Getenv("MYSQL_DATABASE"),
		},
		GithubConfig: ProviderConfig{
			ClientID:     os.Getenv("GITHUB_CLIENT_ID"),
			ClientSecret: os.Getenv("GITHUB_CLIENT_SECRET"),
			CallbackURL:  fmt.Sprintf("http://localhost:%s/auth/github/callback", port),
		},
		GoogleConfig: ProviderConfig{
			ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
			ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
			CallbackURL:  fmt.Sprintf("http://localhost:%s/auth/google/callback", port),
		},
		AllowedOrigins: []string{"http://localhost:80", "http://localhost"},
	}, nil
}
