// Test Case 10: Configuration showcase
// This file tests various formatting configurations
// Try with different settings to see the effects:
//
// Quote style: 'miniTypescriptHero.imports.stringQuoteStyle': "'" or "\""
// Semicolons: 'miniTypescriptHero.imports.insertSemicolons': true or false
// Spaces: 'miniTypescriptHero.imports.insertSpaceBeforeAndAfterImportBraces': true or false
// Multiline: 'miniTypescriptHero.imports.multiLineWrapThreshold': 125
// Trailing comma: 'miniTypescriptHero.imports.multiLineTrailingComma': true or false

import {Component,OnInit,Injectable,Input,Output,EventEmitter} from "@angular/core"
import {Observable,Subject,BehaviorSubject} from "rxjs"
import { map, filter, tap } from 'rxjs/operators';
import {UsedClass} from './helpers/used-class'

class MyComponent implements OnInit {
  data$: Observable<any>;

  ngOnInit() {
    const instance = new UsedClass();
    this.data$ = new BehaviorSubject(instance).pipe(
      map(x => x),
      filter(x => x !== null)
    );
  }
}
