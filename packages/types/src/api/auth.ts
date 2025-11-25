// Re-export unified auth schemas from auth/common to avoid duplication.
export { 
	LoginRequestSchema,
	RegisterRequestSchema,
	AuthResponseSchema,
	RefreshRequestSchema,
	RefreshResponseSchema,
	OAuthCallbackQuerySchema,
	type LoginRequest,
	type RegisterRequest,
	type AuthResponse,
	type RefreshRequest,
	type RefreshResponse,
	type OAuthCallbackQuery
} from "../auth/common";
