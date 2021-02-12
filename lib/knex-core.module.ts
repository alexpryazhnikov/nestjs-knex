import {
  DynamicModule,
  Global,
  Inject,
  Module,
  OnApplicationShutdown,
  Provider,
  Type,
} from '@nestjs/common';
import { defer } from 'rxjs';
import {
  generateString,
  getConnectionToken,
  handleRetry,
} from './common/knex.utils';
import {
  KnexModuleAsyncOptions,
  KnexModuleOptions,
  KnexOptionsFactory,
} from './interfaces/knex-options.interface';
import { KNEX_MODULE_ID, KNEX_MODULE_OPTIONS } from './knex.constants';
import { Config as KnexOptions } from 'knex';
import * as Knex from 'knex';
import { ModuleRef } from '@nestjs/core';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const KnexBuilder = require('knex');

@Global()
@Module({})
export class KnexCoreModule implements OnApplicationShutdown {
  constructor(
    @Inject(KNEX_MODULE_OPTIONS) private readonly options: KnexModuleOptions,
    private readonly moduleRef: ModuleRef,
  ) {}

  static forRoot(options: KnexModuleOptions = {}): DynamicModule {
    const sequelizeModuleOptions = {
      provide: KNEX_MODULE_OPTIONS,
      useValue: options,
    };
    const connectionProvider = {
      provide: getConnectionToken(options as KnexOptions) as string,
      useFactory: async () => await this.createConnectionFactory(options),
    };

    return {
      module: KnexCoreModule,
      providers: [connectionProvider, sequelizeModuleOptions],
      exports: [connectionProvider],
    };
  }

  static forRootAsync(options: KnexModuleAsyncOptions): DynamicModule {
    const connectionProvider = {
      provide: getConnectionToken(options as KnexOptions) as string,
      useFactory: async (knexOptions: KnexModuleOptions) => {
        return await this.createConnectionFactory(knexOptions);
      },
      inject: [KNEX_MODULE_OPTIONS],
    };

    const asyncProviders = this.createAsyncProviders(options);

    return {
      module: KnexCoreModule,
      imports: options.imports,
      providers: [
        ...asyncProviders,
        connectionProvider,
        {
          provide: KNEX_MODULE_ID,
          useValue: generateString(),
        },
      ],
      exports: [connectionProvider],
    };
  }

  async onApplicationShutdown(): Promise<void> {
    try {
      const connection = this.moduleRef.get<Knex>(
        getConnectionToken(this.options) as Type<Knex>,
      );
      connection && (await connection.destroy());
    } catch (error) {}
  }

  private static createAsyncProviders(
    options: KnexModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    const useClass = options.useClass as Type<KnexOptionsFactory>;

    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: useClass,
        useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: KnexModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: KNEX_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }
    // `as Type<KnexOptionsFactory>` is a workaround for microsoft/TypeScript#31603
    const inject = [
      (options.useClass || options.useExisting) as Type<KnexOptionsFactory>,
    ];

    return {
      provide: KNEX_MODULE_OPTIONS,
      useFactory: async (optionsFactory: KnexOptionsFactory) =>
        await optionsFactory.createKnexOptions(options.name),
      inject,
    };
  }

  private static async createConnectionFactory(
    options: KnexModuleOptions,
  ): Promise<Knex> {
    return await defer(async () => {
      return new KnexBuilder(options);
    })
      .pipe(handleRetry(options.retryAttempts, options.retryDelay))
      .toPromise();
  }
}
