import { Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { delay, retryWhen, scan } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';
import { KnexModuleOptions } from '../interfaces';
import { DEFAULT_CONNECTION_NAME } from '../knex.constants';

const logger = new Logger('KnexModule');

/**
 * This function returns a Connection injection token for the given KnexModuleOptions or connection name.
 * @param {KnexModuleOptions | string} [connection='default'] This optional parameter is either
 * a KnexModuleOptions or a string.
 * @returns {string | Function} The Connection injection token.
 */
export function getConnectionToken(
  connection: KnexModuleOptions | string = DEFAULT_CONNECTION_NAME,
// eslint-disable-next-line @typescript-eslint/ban-types
): string | Function {
  return DEFAULT_CONNECTION_NAME === connection
    ? DEFAULT_CONNECTION_NAME
    : 'string' === typeof connection
    ? `${connection}Connection`
    : DEFAULT_CONNECTION_NAME === connection.name || !connection.name
    ? DEFAULT_CONNECTION_NAME
    : `${connection.name}Connection`;
}

/**
 * This function returns a Connection prefix based on the connection name
 * @param {KnexModuleOptions | string} [connection='default'] This optional parameter is either
 * a KnexModuleOptions or a string.
 * @returns {string | Function} The Connection injection token.
 */
export function getConnectionPrefix(
  connection: KnexModuleOptions | string = DEFAULT_CONNECTION_NAME,
): string {
  if (connection === DEFAULT_CONNECTION_NAME) {
    return '';
  }
  if (typeof connection === 'string') {
    return connection + '_';
  }
  if (connection.name === DEFAULT_CONNECTION_NAME || !connection.name) {
    return '';
  }
  return connection.name + '_';
}

export function handleRetry(
  retryAttempts = 9,
  retryDelay = 3000,
): <T>(source: Observable<T>) => Observable<T> {
  return <T>(source: Observable<T>) =>
    source.pipe(
      retryWhen((e) =>
        e.pipe(
          scan((errorCount, error: Error) => {
            logger.error(
              `Unable to connect to the database. Retrying (${
                errorCount + 1
              })...`,
              error.stack,
            );
            if (errorCount + 1 >= retryAttempts) {
              throw error;
            }
            return errorCount + 1;
          }, 0),
          delay(retryDelay),
        ),
      ),
    );
}

export function getConnectionName(options: KnexModuleOptions): string {
  return options && options.name ? options.name : DEFAULT_CONNECTION_NAME;
}

export const generateString = (): string => uuid();
