import { Platform } from 'react-native';

let MapView, Marker, Callout, Polyline, PROVIDER_GOOGLE;

if (Platform.OS === 'web') {
  const { View } = require('react-native');
  const React = require('react');
  // Stub components that render nothing on web
  MapView = React.forwardRef((props, ref) =>
    React.createElement(View, { ref, ...props, style: [{ flex: 1, backgroundColor: '#e0e0e0' }, props.style] }, props.children)
  );
  MapView.displayName = 'MapView';
  Marker = (props) => null;
  Callout = (props) => null;
  Polyline = (props) => null;
  PROVIDER_GOOGLE = 'google';
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
