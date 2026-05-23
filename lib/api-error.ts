import { NextResponse } from "next/server";

/**
 * Wraps an async API handler function with try-catch error handling.
 * Returns JSON error responses instead of raw 500 HTML on database failures.
 * Logs the actual error with console.error for debugging.
 */
export function withErrorHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
  context: string
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error(`${context} error:`, error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      const isConnectionError =
        message.toLowerCase().includes("connect") ||
        message.toLowerCase().includes("sequence") ||
        message.toLowerCase().includes("timed out");

      return NextResponse.json(
        {
          error: isConnectionError
            ? "Database connection issue. Please try again in a moment."
            : message,
        },
        { status: isConnectionError ? 503 : 500 }
      );
    }
  };
}
