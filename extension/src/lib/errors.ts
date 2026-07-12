import { CanvasConnectionError } from './canvas.js';
import { CanvasHostPermissionError } from './permissions.js';

export function getConnectionErrorMessage(error: unknown, fallback: string): string {
  return error instanceof CanvasConnectionError || error instanceof CanvasHostPermissionError
    ? error.message
    : fallback;
}
