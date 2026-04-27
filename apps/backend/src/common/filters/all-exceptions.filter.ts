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

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  requestId?: string;
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
      return {
        statusCode,
        body: { statusCode, message, error, timestamp, path, requestId },
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
