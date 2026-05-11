import { NextRequest, NextResponse } from "next/server"

/**
 * API Key validation module for billing-finance API
 * Provides centralized, standardized authentication across all endpoints
 */

export interface AuthValidationResult {
  isValid: boolean
  keyType: "primary" | "secondary" | "legacy"
  keyIdentifier: string // Last 4 chars of key for logging
  requiresWarning: boolean // True for legacy keys
  warningMessage?: string
  error?: string
}

export interface AuthConfig {
  requireApiKey?: boolean
  allowLegacyKey?: boolean
  logUsage?: boolean
  routeName?: string
}

function getKeyConfigForRoute(routeName: string | undefined): {
  primaryKey?: string
  secondaryKey?: string
  legacyKey: string
} {
  const route = routeName ?? ""

  if (route.startsWith("/api/bills")) {
    return {
      primaryKey: process.env.BILLING_API_KEY_PROD || process.env.BILLING_API_KEY,
      secondaryKey: process.env.BILLING_API_KEY_SECONDARY,
      legacyKey: process.env.BILLING_API_KEY_LEGACY || "sk_live_billing_default_key_change_in_production",
    }
  }

  // Default: invoices keyset
  return {
    primaryKey:
      process.env.INVOICES_API_KEY_PROD ||
      process.env.INVOICES_API_KEY ||
      process.env.INVOICE_API_KEY,
    secondaryKey: process.env.INVOICES_API_KEY_SECONDARY,
    legacyKey: process.env.INVOICES_API_KEY_LEGACY || "sk_live_invoices_default_key_change_in_production",
  }
}

/**
 * Validates API key from request headers (x-api-key or Authorization Bearer)
 * Supports multiple concurrent keys for rotation scenarios
 * Uses constant-time comparison to prevent timing attacks
 */
export function validateApiKey(
  request: NextRequest,
  config: AuthConfig = {}
): AuthValidationResult {
  const {
    requireApiKey = true,
    allowLegacyKey = true,
    logUsage = true,
    routeName = "unknown"
  } = config

  try {
    // Extract API key from headers
    const apiKeyHeader = request.headers.get("x-api-key")
    const bearerToken = request.headers.get("authorization")?.replace("Bearer ", "")
    const apiKey = apiKeyHeader || bearerToken

    if (!apiKey) {
      if (!requireApiKey) {
        return {
          isValid: true,
          keyType: "primary",
          keyIdentifier: "none",
          requiresWarning: false,
        }
      }
      return {
        isValid: false,
        keyType: "primary",
        keyIdentifier: "none",
        requiresWarning: false,
        error: "Missing API key in headers (x-api-key or Authorization: Bearer)"
      }
    }

    // Load environment variables for this route
    const { primaryKey, secondaryKey, legacyKey } = getKeyConfigForRoute(routeName)

    // Validate against primary key (constant-time comparison)
    if (primaryKey && constantTimeCompare(apiKey, primaryKey)) {
      const keyId = getKeyIdentifier(apiKey)
      if (logUsage) {
        logApiKeyUsage({
          route: routeName,
          keyType: "primary",
          keyIdentifier: keyId,
          success: true
        })
      }
      return {
        isValid: true,
        keyType: "primary",
        keyIdentifier: keyId,
        requiresWarning: false
      }
    }

    // Validate against secondary key (for rotation period)
    if (secondaryKey && constantTimeCompare(apiKey, secondaryKey)) {
      const keyId = getKeyIdentifier(apiKey)
      if (logUsage) {
        logApiKeyUsage({
          route: routeName,
          keyType: "secondary",
          keyIdentifier: keyId,
          success: true
        })
      }
      return {
        isValid: true,
        keyType: "secondary",
        keyIdentifier: keyId,
        requiresWarning: false
      }
    }

    // Validate against legacy key (with deprecation warning)
    if (allowLegacyKey && constantTimeCompare(apiKey, legacyKey)) {
      const keyId = getKeyIdentifier(apiKey)
      const warningMsg = "This API key is deprecated. Please migrate to the production key by May 10, 2026."
      
      if (logUsage) {
        logApiKeyUsage({
          route: routeName,
          keyType: "legacy",
          keyIdentifier: keyId,
          success: true,
          deprecated: true
        })
      }

      return {
        isValid: true,
        keyType: "legacy",
        keyIdentifier: keyId,
        requiresWarning: true,
        warningMessage: warningMsg
      }
    }

    // No key matched
    const keyId = getKeyIdentifier(apiKey)
    if (logUsage) {
      logApiKeyUsage({
        route: routeName,
        keyType: "unknown",
        keyIdentifier: keyId,
        success: false,
        reason: "Invalid API key"
      })
    }

    return {
      isValid: false,
      keyType: "primary",
      keyIdentifier: keyId,
      requiresWarning: false,
      error: "Invalid API key"
    }
  } catch (error) {
    console.error("[v0-auth] Error validating API key:", error instanceof Error ? error.message : "Unknown error")
    return {
      isValid: false,
      keyType: "primary",
      keyIdentifier: "error",
      requiresWarning: false,
      error: "Authentication validation failed"
    }
  }
}

/**
 * Returns unauthorized response with minimal information to prevent leaking security details
 */
export function unauthorizedResponse(details?: { message?: string; requestId?: string }) {
  return NextResponse.json(
    {
      status: "error",
      error_code: "UNAUTHORIZED",
      message: "Invalid or missing API key",
      ...(details?.requestId && { request_id: details.requestId })
    },
    { status: 401 }
  )
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * Compares two strings in constant time
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * Extract key identifier for logging (last 4 chars)
 * Never logs the full API key
 */
function getKeyIdentifier(apiKey: string): string {
  if (apiKey.length <= 4) {
    return "****"
  }
  return apiKey.slice(-4)
}

/**
 * Log API key usage for audit trail
 */
interface LogEntry {
  route: string
  keyType: "primary" | "secondary" | "legacy" | "unknown"
  keyIdentifier: string
  success: boolean
  deprecated?: boolean
  reason?: string
}

function logApiKeyUsage(entry: LogEntry): void {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: entry.success ? "info" : "warn",
      action: "api_key_validation",
      ...entry
    }

    // Log to console in development/test
    if (process.env.API_KEY_USAGE_LOG_ENABLED !== "false") {
      console.log("[v0-auth]", JSON.stringify(logEntry))
    }

    // In production, this would be sent to structured logging service
    // (e.g., Sentry, CloudWatch, Datadog, etc.)
  } catch (error) {
    console.error("[v0-auth] Error logging API key usage:", error)
  }
}

/**
 * Returns deprecation warning header to include in response
 */
export function getDeprecationWarningHeader(): Record<string, string> {
  return {
    "X-API-Key-Deprecated": "true",
    "X-API-Key-Deprecation-Date": "2026-05-10",
    "X-API-Key-Migration-Guide": "https://docs.example.com/api-key-migration"
  }
}

/**
 * Middleware-compatible wrapper for API route handlers
 * Usage: if (!validateAndRespond(request)) return unauthorizedResponse()
 */
export function validateAndRespond(request: NextRequest, config?: AuthConfig): boolean {
  const result = validateApiKey(request, config)
  return result.isValid
}
