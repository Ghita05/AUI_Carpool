import { Platform } from 'react-native';

let MapView, Marker, Callout, Polyline, PROVIDER_GOOGLE;

if (Platform.OS === 'web') {
  const React = require('react');
  const { useMemo } = React;
  const { View, Text } = require('react-native');
  const {
    useJsApiLoader,
    GoogleMap,
    Marker: GMMarker,
    Polyline: GMPolyline,
    OverlayView,
  } = require('@react-google-maps/api');

  const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '';

  PROVIDER_GOOGLE = 'google';

  function regionToCenter(region) {
    if (!region) return { lat: 33.8869, lng: -5.5473 }; // AUI default
    return { lat: region.latitude, lng: region.longitude };
  }

  function regionToZoom(region) {
    if (!region?.latitudeDelta) return 13;
    return Math.round(Math.log2(360 / region.latitudeDelta));
  }

  function makePinIcon(color) {
    if (!color) return undefined;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42"><path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0z" fill="${color}" stroke="white" stroke-width="2"/><circle cx="16" cy="16" r="6" fill="white"/></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  MapView = React.forwardRef(function MapViewWeb(
    {
      style,
      initialRegion,
      region,
      children,
      showsUserLocation,
      followsUserLocation,
      showsCompass,
      provider,
      showsMyLocationButton,
      toolbarEnabled,
      ...rest
    },
    ref
  ) {
    const { isLoaded, loadError } = useJsApiLoader({
      id: 'google-map-script',
      googleMapsApiKey: MAPS_KEY,
    });

    const activeRegion = region || initialRegion;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const center = useMemo(() => regionToCenter(activeRegion), [
      activeRegion?.latitude,
      activeRegion?.longitude,
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const zoom = useMemo(() => regionToZoom(activeRegion), [
      activeRegion?.latitudeDelta,
    ]);

    if (loadError) {
      return React.createElement(
        View,
        { style: [{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee' }, style] },
        React.createElement(Text, { style: { color: '#666' } }, 'Map failed to load')
      );
    }
    if (!isLoaded) {
      return React.createElement(
        View,
        { style: [{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee' }, style] },
        React.createElement(Text, { style: { color: '#666' } }, 'Loading map\u2026')
      );
    }

    return React.createElement(
      GoogleMap,
      {
        mapContainerStyle: { width: '100%', height: '100%' },
        center,
        zoom,
        options: {
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
        },
        onClick: rest.onPress
          ? (e) => {
              if (e.latLng) {
                rest.onPress({
                  nativeEvent: {
                    coordinate: { latitude: e.latLng.lat(), longitude: e.latLng.lng() },
                  },
                });
              }
            }
          : undefined,
      },
      children
    );
  });
  MapView.displayName = 'MapView';

  Marker = function MarkerWeb({ coordinate, title, pinColor, anchor, children, ...rest }) {
    if (!coordinate) return null;
    const position = { lat: coordinate.latitude, lng: coordinate.longitude };

    // Filter out Callout children — handled via title tooltip instead
    const markerChildren = React.Children.toArray(children).filter(
      (child) => child?.type?.displayName !== 'Callout'
    );

    if (markerChildren.length > 0) {
      // Render custom React Native content as a map overlay
      return React.createElement(
        OverlayView,
        {
          position,
          mapPaneName: OverlayView.OVERLAY_MOUSE_TARGET,
          getPixelPositionOffset: (width, height) => ({
            x: -(width * (anchor?.x ?? 0.5)),
            y: -(height * (anchor?.y ?? 0.5)),
          }),
        },
        React.createElement('div', { title }, markerChildren)
      );
    }

    return React.createElement(GMMarker, {
      position,
      title,
      icon: makePinIcon(pinColor),
    });
  };
  Marker.displayName = 'Marker';

  Polyline = function PolylineWeb({ coordinates, strokeColor, strokeWidth, zIndex, tappable, onPress, lineDashPattern, ...rest }) {
    if (!coordinates?.length) return null;
    const path = coordinates.map((c) => ({ lat: c.latitude, lng: c.longitude }));
    return React.createElement(GMPolyline, {
      path,
      options: {
        strokeColor: strokeColor || '#000000',
        strokeWeight: strokeWidth || 2,
        zIndex: zIndex || 0,
        clickable: !!tappable,
      },
      onClick: onPress,
    });
  };
  Polyline.displayName = 'Polyline';

  // Callout is handled via the title prop on Marker on web
  Callout = function CalloutWeb() { return null; };
  Callout.displayName = 'Callout';

} else {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Callout = Maps.Callout;
  Polyline = Maps.Polyline;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
}

export default MapView;
export { Marker, Callout, Polyline, PROVIDER_GOOGLE };
