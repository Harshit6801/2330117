/**
 * Logging Middleware - Reusable Logging Package
 * A reusable logger that captures the entire lifecycle of application events.
 * Supports: error, warn, info, debug log levels.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type LogLevel = "error" | "warn" | "info" | "debug";

export interface LogPayload {
  stack: string;
  level: LogLevel;
  package: string;
  message: string;
  timestamp?: string;
}

export interface LoggerConfig {
  serverUrl: string;
  defaultStack?: string;
  defaultPackage?: string;
  enableConsole?: boolean; // mirror logs to console (handy in dev)
}

// ─── Internal state ───────────────────────────────────────────────────────────

let config: LoggerConfig = {
  serverUrl: "http://localhost:3000/log", // override via initLogger()
  enableConsole: true,
};

// ─── Initialiser (call once at app startup) ───────────────────────────────────

/**
 * Configure the logging middleware before first use.
 *
 * @example
 *   initLogger({
 *     serverUrl: "https://test-server.example.com/log",
 *     defaultStack: "backend",
 *     defaultPackage: "my-app",
 *   });
 */
export function initLogger(userConfig: Partial<LoggerConfig>): void {
  config = { ...config, ...userConfig };
  Log(
    config.defaultStack ?? "logger",
    "info",
    config.defaultPackage ?? "logging-middleware",
    `Logger initialised — target: ${config.serverUrl}`
  );
}

// ─── Core Log function ────────────────────────────────────────────────────────

/**
 * Send a log entry to the Test Server.
 *
 * @param stack   - Architectural layer that produced the log
 *                  e.g. "auth", "database", "api", "frontend"
 * @param level   - Severity: "error" | "warn" | "info" | "debug"
 * @param pkg     - Package / module name originating the log
 * @param message - Descriptive, context-rich message about what happened
 *
 * @example
 *   Log("auth", "info", "auth-service", "User login successful — userId: 42");
 *   Log("database", "error", "db-client", "Query failed — table: users, err: timeout after 5000ms");
 */
export async function Log(
  stack: string,
  level: LogLevel,
  pkg: string,
  message: string
): Promise<void> {
  const payload: LogPayload = {
    stack,
    level,
    package: pkg,
    message,
    timestamp: new Date().toISOString(),
  };

  // Mirror to console in development
  if (config.enableConsole) {
    const prefix = `[${payload.timestamp}] [${level.toUpperCase()}] [${stack}/${pkg}]`;
    switch (level) {
      case "error":
        console.error(prefix, message);
        break;
      case "warn":
        console.warn(prefix, message);
        break;
      case "debug":
        console.debug(prefix, message);
        break;
      default:
        console.info(prefix, message);
    }
  }

  // Fire-and-forget POST to the Test Server
  try {
    const response = await fetch(config.serverUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `[logging-middleware] Server rejected log entry — status: ${response.status}`
      );
    }
  } catch (err) {
    // Never let logging break the host application
    console.error(
      "[logging-middleware] Failed to send log to server — err:",
      (err as Error).message
    );
  }
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

/** Shorthand for Log(..., "error", ...) */
export const logError = (stack: string, pkg: string, message: string) =>
  Log(stack, "error", pkg, message);

/** Shorthand for Log(..., "warn", ...) */
export const logWarn = (stack: string, pkg: string, message: string) =>
  Log(stack, "warn", pkg, message);

/** Shorthand for Log(..., "info", ...) */
export const logInfo = (stack: string, pkg: string, message: string) =>
  Log(stack, "info", pkg, message);

/** Shorthand for Log(..., "debug", ...) */
export const logDebug = (stack: string, pkg: string, message: string) =>
  Log(stack, "debug", pkg, message);

// ─── Usage examples (remove in production) ───────────────────────────────────

/*
import { initLogger, Log, logError, logInfo } from "./logger";

initLogger({
  serverUrl: "https://test-server.example.com/log",
  defaultStack: "backend",
  defaultPackage: "demo-app",
  enableConsole: true,
});

// Lifecycle: app startup
Log("app", "info", "server", "HTTP server started — port: 8080, env: production");

// Successful operation
Log("database", "info", "db-client", "Connection pool created — size: 10, host: db.internal");

// Warning
Log("auth", "warn", "jwt-service", "Token expiry approaching — userId: 99, expiresIn: 300s");

// Error with context
logError("api", "user-controller", "GET /users/:id failed — userId: 404, reason: not found");

// Debug detail
Log("cache", "debug", "redis-client", "Cache miss — key: session:abc123, fetching from DB");
*/
