import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import {HttpClientModule} from '@angular/common/http';
import {environment} from '../environments/environment';
declare var Cesium: any;

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule
  ],
  providers: [
    {provide: 'BASE_CONFIG', useValue: {uri: environment.server}}
    ],
  bootstrap: [AppComponent]
})
export class AppModule { }
