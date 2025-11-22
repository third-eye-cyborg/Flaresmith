import pino from 'pino';
import { withRedaction } from './loggerRedaction';

/**
 * Basic structured logger wrapper.
 * Provides info/error with secret redaction. Extend as needed.
 */
const baseLogger = pino();

export const logger = {
  info(payload: Record<string, unknown>) {
    baseLogger.info(withRedaction(payload));
  },
  error(payload: Record<string, unknown>) {
    baseLogger.error(withRedaction(payload));
  },
};
