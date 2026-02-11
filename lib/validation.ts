// Shared input validation utilities.

/**
 * Pattern matching URLs, script tags, event handlers, and data URIs.
 * Used to sanitize free-text user input in API routes.
 */
export const UNSAFE_PATTERN =
  /https?:\/\/|www\.|<script|javascript:|on\w+\s*=|data:text\/html/i;
