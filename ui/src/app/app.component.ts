import { AfterViewInit, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { Component } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { webSocket } from 'rxjs/webSocket';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, retryWhen, delay } from 'rxjs/operators';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

@Component({
  selector: 'lv-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {

  logs = [];
  filteredLogs = [];

  filterForm: FormGroup = new FormGroup({
    level: new FormControl([]),
    service: new FormControl([]),
    id: new FormControl([]),
  });

  ids = [];
  services = [];

  private isNearBottom = true;

  @ViewChild('virtualScroll', { static: true })
  public virtualScrollViewport: CdkVirtualScrollViewport;

  @ViewChildren('item') itemElements: QueryList<any>;

  constructor(private http: HttpClient) { }

  // tslint:disable-next-line: typedef
  ngOnInit() {
    this.createWebSocket('ws://localhost:1299/log')
      .pipe(
        retryWhen(errors =>
          errors.pipe(
            tap(err => {
              console.error('Got error', err);
            }),
            delay(1000)
          )
        )
      )
      .subscribe((data: any) => {
        if (data === null) {
          return;
        }
        if (data.length) {
          this.logs = data;
          this.logs.forEach(element => {
            this.buildOptions(element);
          });
        } else {
          this.logs.push(data);
          this.buildOptions(data);
        }
        this.filterLogs(this.filterForm.value);
      }, err => console.error(err));
    this.filterForm.valueChanges.subscribe(data => this.filterLogs(data));
  }

  // tslint:disable-next-line: typedef
  createWebSocket(uri) {
    return new Observable(observer => {
      try {
        const subject = webSocket(uri);

        const subscription = subject.asObservable()
          .subscribe(data =>
            observer.next(data),
            error => observer.error(error),
            () => observer.complete());

        return () => {
          if (!subscription.closed) {
            subscription.unsubscribe();
          }
        };
      } catch (error) {
        observer.error(error);
      }
    });
  }

  // tslint:disable-next-line: typedef
  ngAfterViewInit() {
    this.itemElements.changes.subscribe(_ => this.onItemElementsChanged());
  }

  // tslint:disable-next-line: typedef
  buildOptions(log: any) {
    if (log.data.id) {
      if (this.ids.indexOf(log.data.id) === -1) {
        this.ids.push(log.data.id);
      }
    }
    if (log.data.service) {
      if (this.services.indexOf(log.data.service) === -1) {
        this.services.push(log.data.service);
      }
    }
  }

  // tslint:disable-next-line: typedef
  toggleData(log: any) {
    log.showData = !log.showData;
  }

  // tslint:disable-next-line: typedef
  clearLogs() {
    return this.http.get('/log/clear').subscribe(response => {
      this.logs = [];
      this.filteredLogs = [];
    }, error => console.log(error),
    );
  }

  // tslint:disable-next-line: typedef
  filterLogs(filter: any) {
    this.filteredLogs = this.logs.filter((log) => {
      if (filter.id.length > 0 && filter.id.indexOf(log.data.id) === -1) {
        return false;
      }
      if (filter.service.length > 0 && filter.service.indexOf(log.data.service) === -1) {
        return false;
      }
      if (filter.level.length > 0 && filter.level.indexOf(log.level) === -1) {
        return false;
      }
      return true;
    });
  }

  private onItemElementsChanged(): void {
    if (this.isNearBottom) {
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      this.virtualScrollViewport.scrollToIndex(
        this.filteredLogs.length - 1
      );
      setTimeout(() => {
        const items = document.getElementsByClassName('item');
        items[items.length - 1].scrollIntoView();
      }, 10);
    });
  }

  // tslint:disable-next-line: typedef
  public isUserNearBottom() {
    const threshold = 150;
    const cont = document.getElementsByClassName('cdk-virtual-scroll-viewport');
    const element = cont[0];
    const p = (element.scrollTop + element.clientHeight) >= (element.scrollHeight - threshold);
    this.isNearBottom = p;
  }

}
