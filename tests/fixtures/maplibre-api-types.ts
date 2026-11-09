import type * as MapLibreGL from "maplibre-gl";

// The isolated Hideaway wrapper is intentionally excluded from the project's
// typecheck. Keep its MapLibre public API imports covered without activating it.
export type MapLibreWrapperApi = {
  map: InstanceType<typeof MapLibreGL.Map>;
  marker: InstanceType<typeof MapLibreGL.Marker>;
  popup: InstanceType<typeof MapLibreGL.Popup>;
  source: MapLibreGL.GeoJSONSource;
  mapOptions: MapLibreGL.MapOptions;
  mouseEvent: MapLibreGL.MapMouseEvent;
  layerMouseEvent: MapLibreGL.MapLayerMouseEvent;
  feature: MapLibreGL.MapGeoJSONFeature;
  projection: MapLibreGL.ProjectionSpecification;
  style: MapLibreGL.StyleSpecification;
  lineLayer: MapLibreGL.LineLayerSpecification;
  popupOptions: MapLibreGL.PopupOptions;
  markerOptions: MapLibreGL.MarkerOptions;
};
