import { AfterViewInit, OnInit, QueryList, ViewChildren } from '@angular/core';
import { HostListener } from '@angular/core';
import { Component } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

@Component({
  selector: 'lv-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {

  myWebSocket: WebSocketSubject<any> = webSocket('ws://localhost:1299/log');
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

  @ViewChildren('item') itemElements: QueryList<any>;

  // tslint:disable-next-line: typedef
  ngOnInit() {
    this.myWebSocket.asObservable().subscribe(d => {
      if (d === null) {
        return;
      }
      if (d.length) {
        this.logs = d;
        this.logs.forEach(element => {
          this.buildOptions(element);
        });
      } else {
        this.logs.push(d);
        this.buildOptions(d);
      }
      this.filterLogs(this.filterForm.value);
    }, error => {
      console.log(error);
    },
      () => console.log('complete'));

    this.filterForm.valueChanges.subscribe(data => this.filterLogs(data));
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
    window.scroll({
      top: document.body.scrollHeight,
      left: 0,
      behavior: 'smooth'
    });
  }

  private isUserNearBottom(): boolean {
    const threshold = 150;
    const position = window.scrollY + window.innerHeight;
    const height = document.body.scrollHeight;
    return position > height - threshold;
  }

  @HostListener('window:scroll', ['$event'])
  scrolled(event: any): void {
    this.isNearBottom = this.isUserNearBottom();
  }
}
