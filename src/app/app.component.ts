import {AfterViewInit, Component, HostListener, OnInit, ViewChild} from '@angular/core';
import {Map, Overlay, View, Feature} from 'ol';
import {addCommon, fromLonLat, toLonLat, Projection} from 'ol/proj';
import OLCesium from 'ol-cesium';
import Tile from 'ol/layer/Tile';
import Point from 'ol/geom/Point';
import {Icon, Style, Stroke, Fill, Text} from 'ol/style';
import {Vector as VectorLayer, Image} from 'ol/layer';
import {Vector as VectorSource, TileWMS, ImageWMS, XYZ, OSM} from 'ol/source';
import {fromEvent} from 'rxjs';
import {debounceTime, filter, map, switchMap} from 'rxjs/operators';
import {MapService} from './service/map.service';
import {SearchItem} from './model/map.model';

declare var Cesium: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('searchInput') searchInput;
  @ViewChild('detail') detail;
  map2d = null;          // openlayers生成的2d地图
  map3d = null;          // cesium生成的3d地图
  pointLayer = null;     // 点图层
  searchList = [];       // 搜索框的搜索结果
  listDisplay = false;   // 是否展示搜索结果
  itemData: SearchItem = {};         // 单个搜索结果的数据
  detailDisplay = false; // 是否展示详情
  hasDetail = true;      // 当前搜索内容是否有详情

  @HostListener('document:click', ['$event']) bodyClick(e) {
    this.listDisplay = false;
  }

  constructor(private service: MapService) {
  }

  ngOnInit() {

  }

  ngAfterViewInit() {
    this.initOlMap();
    this.initSearch();
  }

  initCesiumMap() {
    const wmsProvider = new Cesium.WebMapServiceImageryProvider({
      url: 'http://192.168.76.30:8080/geoserver/osm/wms',
      layers: 'osm:osm',
      parameters: {
        service: 'WMS',
        format: 'image/png',
        transparent: true
      }
    });
    const urlProvider = new Cesium.UrlTemplateImageryProvider({
      url: 'http://172.31.234.202:8081/tiles/tilemap/{z}/{x}/{y}.png'
    });
    const viewer = new Cesium.Viewer('mapContainer', {
      imageryProvider: urlProvider,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      vrButton: false
    });
    viewer.imageryLayers.addImageryProvider(wmsProvider);
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(120.1286, 23.6022, 300000),
      orientation: {
        heading: 0.0,
        pitch: -Cesium.Math.PI_OVER_TWO,
        roll: 0.0
      }
    });
  }

  // 初始化ol地图
  initOlMap() {
    addCommon();     // 必须！Ol5.3的bug，不执行的话 tree shaking 会将 projection 组件忽略
    // const tile = new Tile({
    //   source: new TileWMS({
    //     url: 'http://192.168.76.30:8080/geoserver/osm/wms',
    //     params: {
    //       'FORMAT': 'image/png',
    //       'VERSION': '1.1.1',
    //       'tiled': true,
    //       'SRS': 'EPSG:3857',
    //       'LAYERS': 'osm:osm'
    //     }
    //   })
    // });
    const tile = new Tile({
      source: new TileWMS({
        crossOrigin: 'anonymous',
        url: 'http://192.168.84.150:8080/geoserver/sf/wms',
        params: {
          FORMAT: 'iflytek:osm1',
          tiled: true,
          SRS: 'EPSG:3857',
          TRANSPARENT: false
        }
      })
    });
    const layer = new Tile({
      source: new XYZ({
        url: 'http://172.31.234.202:8081/tiles/tilemap/{z}/{x}/{y}.png'
      })
    });
    const mapCenter = [120.1286, 23.6022];
    this.map2d = new Map({
      layers: [tile],
      target: 'mapContainer',
      view: new View({
        center: fromLonLat(mapCenter),
        zoom: 7
      })
    });

    this.map3d = new OLCesium({map: this.map2d});
    // this.map3d.setEnabled(true);
  }

  // 监听input框搜索
  initSearch() {
    const inputDom = this.searchInput.nativeElement;
    const subscription = fromEvent(inputDom, 'keyup').pipe(
      debounceTime(250),
      map((ev: any) => ev.target.value),
      switchMap(value => this.service.getLocationList({name: value, page: 1, size: 10}))
    ).subscribe(data => {
      const list = data.list || [];
      this.searchList = list.map(item => ({
        ...item,
        addr: item.addr === 'null' ? '' : item.addr
      }));
      this.listDisplay = true;
    });
  }

  // 点击列表项后，移动视角，展示点，展示详情
  goToPoint(item) {
    this.itemData = item;
    this.searchInput.nativeElement.value = item.name;
    this.service.getDetail({name: item.name}).subscribe(d => {
      this.setCenter(item);
      this.showFeature(item);
      this.detailDisplay = true;
      if (!d) {
        this.hasDetail = false;
      } else {
        this.hasDetail = true;
        const html = d ? (d.wiki || d.baidu) : '';
        setTimeout(_ => this.detail.nativeElement.innerHTML = html);
      }
    });
  }

  // 点击input框时展示列表
  onInputClick(ev) {
    ev.stopPropagation();
    this.listDisplay = true;
  }

  // 取消查询
  cancel() {
    this.listDisplay = false;
    this.detailDisplay = false;
    this.hasDetail = true;
    this.searchList = [];
    this.searchInput.nativeElement.value = '';
    this.detail.nativeElement.innerHTML = '';
    this.map2d.removeLayer(this.pointLayer);
  }

  // 设置地图中心点位置
  setCenter(item) {
    const view = this.map2d.getView();
    const center = fromLonLat([item.x, item.y]);
    view.setCenter(center);
    view.setZoom(18);
  }

  // 展示地图点
  showFeature(item) {
    const feature = new Feature({
      name: item.name,
      id: item.id,
      geometry: new Point(fromLonLat([item.x, item.y]))
    });
    feature.setStyle(new Style({
      image: new Icon(({
        src: 'assets/images/mark.png',
        anchor: [0.5, 1]
      })),
      text: new Text({
        textAlign: 'left',
        font: 'bold 13px sans-serif',
        text: item.name,
        stroke: new Stroke({
          color: '#fff',
          width: 2
        }),
        fill: new Fill({
          color: '#f00'
        }),
        offsetX: 16,
        offsetY: -20
      })
    }));
    const source = new VectorSource({
      features: [feature]
    });
    if (this.pointLayer) {
      this.map2d.removeLayer(this.pointLayer);
    }
    this.pointLayer = new VectorLayer({
      source: source
    });
    this.map2d.addLayer(this.pointLayer);
  }

  exportMap() {
    this.map2d.once('rendercomplete', ev => {
      const canvas = ev.context.canvas;
      const save_link = document.createElement('a');
      save_link.href = canvas.toDataURL('image/png');
      save_link.download = 'map.png';
      save_link.click();
    });
    this.map2d.renderSync();
  }
}
