// Demo file for video - shows the full power of Mini TypeScript Hero
// Press Ctrl+Alt+O (or Cmd+Alt+O on macOS) to organize imports

import { UserDetail } from './components/user-detail';
import { Component } from '@angular/core';
import { UnusedService } from './services/unused';
import {Router} from "@angular/router"
import { map, switchMap } from 'rxjs/operators';
import {OnInit, inject} from "@angular/core"
import { BookList } from './components/book-list';
import {of} from "rxjs"

@Component({
  selector: 'app-demo',
  standalone: true,
  template: `
    <h1>Demo Component</h1>
    <app-book-list />
    <app-user-detail />
  `
})
export class DemoComponent implements OnInit {
  private router = inject(Router);

  ngOnInit() {
    console.log('Component initialized');

    // Using some RxJS operators
    const data$ = this.getData().pipe(
      switchMap(x => this.transform(x)),
      map(y => y.toUpperCase())
    );
  }

  private getData() {
    return of('data');
  }

  private transform(value: string) {
    return of(value);
  }
}

// Note: UnusedService is imported but never used - it will be removed!
