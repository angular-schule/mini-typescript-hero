// PLEASE DO NOT MODIFY / DELETE UNLESS YOU KNOW WHAT YOU ARE DOING
//
// This file is providing the test runner to use when running extension tests.
// By default the test runner in use is Mocha based.
//
// You can provide your own test runner if you want to override it by exporting
// a function run(testRoot: string, clb: (error:Error) => void) that the extension
// host can call to run the tests. The test runner is expected to use console.log
// to report the results back to the caller. When the tests are finished, return
// a possible error to the callback or null if none.
import { join, relative } from 'path';
import { ExtensionContext, Memento } from 'vscode';

declare var global: any;

class ContextMock implements ExtensionContext {
  public subscriptions: { dispose(): any }[] = [];
  public workspaceState: Memento = undefined as any;
  public globalState: Memento = undefined as any;
  public extensionPath: string = '';
  public storagePath: string = '';
  public asAbsolutePath(path: string): string {
    return relative(global['rootPath'], path);
  }
}

// Prepare for snapshot (sigh) tests.
// HACK
global['rootPath'] = join(__dirname, '..', '..');
// END HACK

const testRunner = require('vscode/lib/testrunner');

// You can directly control Mocha options by uncommenting the following lines
// See https://github.com/mochajs/mocha/wiki/Using-mocha-programmatically#set-options for more info
const options: any = {
  ui: 'bdd',
  useColors: true,
  timeout: 5000,
};

if (process.env.EXT_DEBUG) {
  options.timeout = 2 * 60 * 60 * 1000;
}

testRunner.configure(options);

const { default: ioc } = require('../src/ioc');
const { default: iocSymbols } = require('../src/ioc-symbols');
ioc.bind(iocSymbols.extensionContext).toConstantValue(new ContextMock());

module.exports = testRunner;
