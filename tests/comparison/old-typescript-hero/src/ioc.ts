import 'reflect-metadata';

import { Container, interfaces } from 'inversify';
import { TypescriptCodeGenerator, TypescriptParser } from 'typescript-parser';
import { ExtensionContext, TextDocument, Uri } from 'vscode';

import { Activatable } from './activatable';
import { Configuration } from './configuration';
import { ImportManager, ImportOrganizer } from './imports';
import { ImportManagerProvider, iocSymbols, TypescriptCodeGeneratorFactory } from './ioc-symbols';
import { TypescriptHero } from './typescript-hero';
import { Logger, winstonLogger } from './utilities/logger';
import { getScriptKind } from './utilities/utility-functions';

const iocContainer = new Container();

// Entry point
iocContainer
  .bind(TypescriptHero)
  .to(TypescriptHero)
  .inSingletonScope();

// Activatables
iocContainer
  .bind<Activatable>(iocSymbols.activatables)
  .to(ImportOrganizer)
  .inSingletonScope();

// Configuration
iocContainer
  .bind<Configuration>(iocSymbols.configuration)
  .to(Configuration)
  .inSingletonScope();

// Logging
iocContainer
  .bind<Logger>(iocSymbols.logger)
  .toDynamicValue((context: interfaces.Context) => {
    const extContext = context.container.get<ExtensionContext>(
      iocSymbols.extensionContext,
    );
    const config = context.container.get<Configuration>(
      iocSymbols.configuration,
    );
    return winstonLogger(config.verbosity(), extContext);
  })
  .inSingletonScope();

// Managers
iocContainer
  .bind<ImportManagerProvider>(iocSymbols.importManager)
  .toProvider<ImportManager>(c => async (document: TextDocument) => {
    const parser = c.container.get<TypescriptParser>(iocSymbols.parser);
    const config = c.container.get<Configuration>(iocSymbols.configuration);
    const logger = c.container.get<Logger>(iocSymbols.logger);
    const generatorFactory = c.container.get<TypescriptCodeGeneratorFactory>(
      iocSymbols.generatorFactory,
    );
    const source = await parser.parseSource(
      document.getText(),
      getScriptKind(document.fileName),
    );
    return new ImportManager(
      document,
      source,
      parser,
      config,
      logger,
      generatorFactory,
    );
  });

// Typescript
iocContainer
  .bind<TypescriptParser>(iocSymbols.parser)
  .toConstantValue(new TypescriptParser());
iocContainer
  .bind<TypescriptCodeGeneratorFactory>(iocSymbols.generatorFactory)
  .toFactory<TypescriptCodeGenerator>((context: interfaces.Context) => {
    return (resource: Uri) => {
      const config = context.container.get<Configuration>(
        iocSymbols.configuration,
      );
      return new TypescriptCodeGenerator(
        config.typescriptGeneratorOptions(resource),
      );
    };
  });

export const ioc = iocContainer;
