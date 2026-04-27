import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Readable } from 'stream';

export interface ApiSuccessEnvelope<T> {
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiSuccessEnvelope<T> | T> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessEnvelope<T> | T> {
    return next.handle().pipe(
      map((data) => {
        // Bypass the JSON envelope for binary / streamed responses so that
        // file downloads (CSV, PDF) and raw bytes pass through untouched.
        if (
          data === undefined ||
          data instanceof Buffer ||
          data instanceof StreamableFile ||
          data instanceof Readable
        ) {
          return data as T;
        }
        return {
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
