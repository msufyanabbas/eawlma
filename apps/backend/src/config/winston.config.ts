import { ConfigService } from '@nestjs/config';
import { utilities as nestWinstonUtils } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

export const winstonOptionsFactory = (config: ConfigService): winston.LoggerOptions => {
  const isProduction = config.get<string>('app.nodeEnv') === 'production';
  const appName = config.get<string>('app.name', 'Aqarat');

  const consoleFormat = isProduction
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.ms(),
        nestWinstonUtils.format.nestLike(appName, {
          colors: true,
          prettyPrint: true,
        }),
      );

  const transports: winston.transport[] = [
    new winston.transports.Console({ format: consoleFormat }),
  ];

  if (isProduction) {
    transports.push(
      new winston.transports.DailyRotateFile({
        filename: 'logs/aqarat-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
      new winston.transports.DailyRotateFile({
        filename: 'logs/aqarat-error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '30d',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
    );
  }

  return {
    level: isProduction ? 'info' : 'debug',
    defaultMeta: { service: appName, env: config.get<string>('app.nodeEnv') },
    transports,
    exitOnError: false,
  };
};
