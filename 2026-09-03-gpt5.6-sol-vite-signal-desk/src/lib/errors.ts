import type { AppError, AppErrorCode, Result } from "./domain"

interface ErrorLike {
  code?: string
  message?: string
  status?: number
}

const conflictCodes = new Set(["23505", "409"])
const notFoundCodes = new Set(["PGRST116", "404"])

function asErrorLike(error: unknown): ErrorLike {
  return typeof error === "object" && error !== null ? (error as ErrorLike) : {}
}

export function mapError(error: unknown, fallback = "Something went wrong"): AppError {
  if (isAppError(error)) return error

  const candidate = asErrorLike(error)
  const code = candidate.code ?? String(candidate.status ?? "")
  const message = candidate.message ?? (error instanceof Error ? error.message : fallback)
  const normalized = message.toLowerCase()

  let appCode: AppErrorCode = "unknown"
  if (candidate.status === 401 || normalized.includes("jwt") || normalized.includes("sign in")) {
    appCode = "authentication"
  } else if (candidate.status === 403 || normalized.includes("row-level security") || normalized.includes("permission")) {
    appCode = "authorization"
  } else if (conflictCodes.has(code) || normalized.includes("unique constraint")) {
    appCode = "conflict"
  } else if (notFoundCodes.has(code) || normalized.includes("not found")) {
    appCode = "not_found"
  } else if (candidate.status === 400 || code === "23514" || normalized.includes("invalid")) {
    appCode = "validation"
  } else if (normalized.includes("fetch") || normalized.includes("network")) {
    appCode = "network"
  }

  return {
    code: appCode,
    message,
    cause: error,
    retryable: appCode === "network" || (candidate.status !== undefined && candidate.status >= 500),
  }
}

export function appError(code: AppErrorCode, message: string, cause?: unknown): AppError {
  return { code, message, cause, retryable: code === "network" }
}

export function isAppError(error: unknown): error is AppError {
  if (typeof error !== "object" || error === null) return false
  const candidate = error as Partial<AppError>
  return typeof candidate.code === "string" && typeof candidate.message === "string" && typeof candidate.retryable === "boolean"
}

export function ok<T>(data: T): Result<T> {
  return { ok: true, data }
}

export function fail<T = never>(error: unknown, fallback?: string): Result<T> {
  return { ok: false, error: mapError(error, fallback) }
}
