package models

import (
	"time"
)

type User struct {
	ID             int       `json:"id" db:"id"`
	Username       string    `json:"username" db:"username"`
	Email          string    `json:"email" db:"email"`
	PasswordHash   string    `json:"-" db:"password_hash"`
	IsAdmin        bool      `json:"is_admin" db:"is_admin"`
	StorageQuotaMB int       `json:"storage_quota_mb" db:"storage_quota_mb"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

type UserCreateRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type UserLoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type UserResponse struct {
	ID             int       `json:"id"`
	Username       string    `json:"username"`
	Email          string    `json:"email"`
	IsAdmin        bool      `json:"is_admin"`
	StorageQuotaMB int       `json:"storage_quota_mb"`
	CreatedAt      time.Time `json:"created_at"`
}
