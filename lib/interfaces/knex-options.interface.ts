import { Type } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common/interfaces';
import { Config as KnexOptions } from 'knex';

export type KnexModuleOptions = {
  name?: string;
  retryAttempts?: number;
  retryDelay?: number;
} & Partial<KnexOptions>;

export interface KnexOptionsFactory {
  createKnexOptions(
    connectionName?: string,
  ): Promise<KnexModuleOptions> | KnexModuleOptions;
}

export interface KnexModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  name?: string;
  useExisting?: Type<KnexOptionsFactory>;
  useClass?: Type<KnexOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<KnexModuleOptions> | KnexModuleOptions;
  inject?: any[];
}
