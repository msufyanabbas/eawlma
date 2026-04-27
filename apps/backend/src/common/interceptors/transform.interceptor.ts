import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiSuccessEnvelope<T> {
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiSuccessEnvelope<T> | T> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessEnvelope<T> | T> {
    return next.handle().pipe(
      map((data) => {
        // Allow controllers to opt out of envelope (e.g. file streams) by returning a Buffer/Stream
        if (data instanceof Buffer) {
          return data;
        }
        return {
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
