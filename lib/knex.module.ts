import { DynamicModule, Module } from '@nestjs/common';
import {
  KnexModuleAsyncOptions,
  KnexModuleOptions,
} from './interfaces/knex-options.interface';
import { KnexCoreModule } from './knex-core.module';

@Module({})
export class KnexModule {
  static forRoot(options: KnexModuleOptions): DynamicModule {
    return {
      module: KnexModule,
      imports: [KnexCoreModule.forRoot(options)],
    };
  }

  static forRootAsync(options: KnexModuleAsyncOptions): DynamicModule {
    return {
      module: KnexModule,
      imports: [KnexCoreModule.forRootAsync(options)],
    };
  }
}
