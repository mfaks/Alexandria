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
	return &Config{
		SessionSecret: os.Getenv("SESSION_SECRET"),
		Database: DatabaseConfig{
			User:     os.Getenv("AZURE_MYSQL_USER"),
			Password: os.Getenv("AZURE_MYSQL_PASSWORD"),
			Host:     os.Getenv("AZURE_MYSQL_HOST"),
			Port:     os.Getenv("AZURE_MYSQL_PORT"),
			Name:     os.Getenv("AZURE_MYSQL_DATABASE"),
		},
		GithubConfig: ProviderConfig{
			ClientID:     os.Getenv("GITHUB_CLIENT_ID"),
			ClientSecret: os.Getenv("GITHUB_CLIENT_SECRET"),
			CallbackURL:  fmt.Sprintf("http://localhost:8080/auth/github/callback"),
		},
		GoogleConfig: ProviderConfig{
			ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
			ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
			CallbackURL:  fmt.Sprintf("http://localhost:8080/auth/google/callback"),
		},
		AllowedOrigins: []string{"http://localhost:80", "http://localhost"},
	}, nil
}
