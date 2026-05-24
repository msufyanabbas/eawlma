import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';
import type { Request } from 'express';
import { Sentry } from '../../lib/sentry';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  requestId?: string;
  /** Structured detail attached by some exceptions (e.g. AI moderation
   *  rejection lists the specific content reasons). Forwarded to the client.
   *  `reasons` is the raw English text; `reasonKeys` are `moderation.*` i18n
   *  keys the client can translate into the user's language. */
  reasons?: string[];
  reasonKeys?: string[];
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse();

    const { statusCode, body } = this.toResponseBody(exception, request);

    this.logException(exception, statusCode, request);

    // Only ship 5xx + non-HTTP throws to Sentry. 4xx are client-side
    // expected errors (validation, auth) and would otherwise swamp the
    // quota with noise.
    if (statusCode >= 500) {
      Sentry.captureException(exception);
    }

    httpAdapter.reply(response, body, statusCode);
  }

  private toResponseBody(
    exception: unknown,
    request: Request,
  ): { statusCode: number; body: ErrorBody } {
    const path = request?.url ?? '';
    const requestId =
      (request?.headers?.['x-request-id'] as string | undefined) ?? undefined;
    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const res = exception.getResponse();
      let message: string | string[] =
        typeof res === 'string' ? res : ((res as { message?: string | string[] }).message ?? exception.message);
      const error = typeof res === 'object' ? ((res as { error?: string }).error ?? exception.name) : exception.name;
      // Preserve a `reasons` array when the exception carries one (AI content
      // moderation attaches the specific guideline violations here) so the
      // client can show the user exactly what was flagged.
      const reasons =
        typeof res === 'object' && Array.isArray((res as { reasons?: unknown }).reasons)
          ? (res as { reasons: string[] }).reasons
          : undefined;
      const reasonKeys =
        typeof res === 'object' && Array.isArray((res as { reasonKeys?: unknown }).reasonKeys)
          ? (res as { reasonKeys: string[] }).reasonKeys
          : undefined;
      return {
        statusCode,
        body: { statusCode, message, error, timestamp, path, requestId, reasons, reasonKeys },
      };
    }

    if (exception instanceof QueryFailedError) {
      const driverError = (exception as QueryFailedError & { code?: string }).code;
      // Postgres unique violation
      if (driverError === '23505') {
        return {
          statusCode: HttpStatus.CONFLICT,
          body: {
            statusCode: HttpStatus.CONFLICT,
            message: 'A record with these unique values already exists',
            error: 'Conflict',
            timestamp,
            path,
            requestId,
          },
        };
      }
      // Foreign key violation
      if (driverError === '23503') {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          body: {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Operation references a non-existent record',
            error: 'Bad Request',
            timestamp,
            path,
            requestId,
          },
        };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: 'InternalServerError',
        timestamp,
        path,
        requestId,
      },
    };
  }

  private logException(exception: unknown, statusCode: number, request: Request): void {
    const meta = {
      method: request?.method,
      path: request?.url,
      statusCode,
    };
    if (statusCode >= 500) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `${meta.method} ${meta.path} → ${statusCode}`,
        stack,
        AllExceptionsFilter.name,
      );
    } else if (statusCode >= 400) {
      this.logger.warn(`${meta.method} ${meta.path} → ${statusCode}`, AllExceptionsFilter.name);
    }
  }
}
