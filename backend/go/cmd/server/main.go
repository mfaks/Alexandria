package main

import (
	"alexandria/internal/config"
	"alexandria/internal/database"
	"alexandria/internal/server"

	"log"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Error loading config: %v", err)
	}

	db, err := database.InitDB(cfg.Database)
	if err != nil {
		log.Fatalf("Error initializing database: %v", err)
	}
	defer db.Close()

	srv := server.New(cfg, db)
	log.Printf("Server is running on http://localhost:%s\n", cfg.Port)
	log.Fatal(srv.ListenAndServe())
}
