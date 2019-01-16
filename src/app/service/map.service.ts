import {Inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  uri = `${this.config.uri}`;

  constructor(private http: HttpClient, @Inject('BASE_CONFIG') private config) { }

  getLocationList(req): Observable<any> {
    return this.http.get(`${this.uri}/map/location`, {params: req});
  }

  getDetail(req): Observable<any> {
    return this.http.get(`${this.uri}/map/baike`, {params: req});
  }
}
