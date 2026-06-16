import React, { useRef, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Colors } from '@/theme/colors';

const DEFAULT_LAT = 23.8103;
const DEFAULT_LNG = 90.4125;
const DEFAULT_ZOOM = 14;

interface Props {
  latitude: number | null;
  longitude: number | null;
  locationLabel?: string;
  onLocationChange: (lat: number, lng: number) => void;
  onGpsPress: () => void;
  gpsLoading?: boolean;
  height?: number;
}

function buildHtml(lat: number, lng: number): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#1a1814}
#map{width:100%;height:100vh}
.leaflet-control-zoom a{background:#241f1a!important;color:#F5F0E8!important;border-color:#2e2923!important}
.leaflet-control-attribution{display:none}
</style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:true,attributionControl:false}).setView([${lat},${lng}],${DEFAULT_ZOOM});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

var pinHtml='<div style="width:22px;height:22px;background:#FF4749;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.55)"></div>';
var icon=L.divIcon({html:pinHtml,iconAnchor:[11,22],iconSize:[22,22],className:''});
var marker=L.marker([${lat},${lng}],{draggable:true,icon:icon}).addTo(map);

function send(lat,lng){
  try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({lat:lat,lng:lng}));}catch(e){}
}

marker.on('dragend',function(e){var p=e.target.getLatLng();send(p.lat,p.lng);});
map.on('click',function(e){marker.setLatLng(e.latlng);send(e.latlng.lat,e.latlng.lng);});

window.moveMarker=function(lat,lng){
  marker.setLatLng([lat,lng]);
  map.setView([lat,lng],16,{animate:true});
};
</script>
</body>
</html>`;
}

export function LocationPickerMap({
  latitude,
  longitude,
  locationLabel,
  onLocationChange,
  onGpsPress,
  gpsLoading = false,
  height = 240,
}: Props) {
  const webRef = useRef<WebView>(null);
  const prevCoords = useRef({ lat: latitude, lng: longitude });

  // Build HTML once with Dhaka defaults; GPS/tap updates go via injectJavaScript
  const initialHtml = useMemo(
    () => buildHtml(latitude ?? DEFAULT_LAT, longitude ?? DEFAULT_LNG),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // When the parent passes new coords (GPS fix), move the marker via JS injection
  React.useEffect(() => {
    if (
      latitude !== null &&
      longitude !== null &&
      (latitude !== prevCoords.current.lat || longitude !== prevCoords.current.lng)
    ) {
      prevCoords.current = { lat: latitude, lng: longitude };
      webRef.current?.injectJavaScript(
        `window.moveMarker(${latitude},${longitude}); true;`,
      );
    }
  }, [latitude, longitude]);

  function handleMessage(e: WebViewMessageEvent) {
    try {
      const { lat, lng } = JSON.parse(e.nativeEvent.data) as { lat: number; lng: number };
      onLocationChange(lat, lng);
    } catch {}
  }

  const isPinned = latitude !== null && longitude !== null;

  return (
    <View style={styles.wrapper}>
      {/* Map */}
      <View style={[styles.mapBox, { height }, isPinned && styles.mapBoxPinned]}>
        <WebView
          ref={webRef}
          source={{ html: initialHtml }}
          style={styles.webview}
          onMessage={handleMessage}
          javaScriptEnabled
          originWhitelist={['*']}
          scrollEnabled={false}
          nestedScrollEnabled={false}
          bounces={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        />

        {/* Hint overlay shown before first pin */}
        {!isPinned && (
          <View style={styles.hint} pointerEvents="none">
            <Text style={styles.hintText}>ট্যাপ করে হাসপাতালের অবস্থান সেট করুন</Text>
          </View>
        )}
      </View>

      {/* Location label */}
      {isPinned && (
        <View style={styles.labelRow}>
          <Text style={styles.pinIcon}>📍</Text>
          <Text style={styles.labelText} numberOfLines={2}>
            {locationLabel || `${latitude?.toFixed(5)}, ${longitude?.toFixed(5)}`}
          </Text>
        </View>
      )}

      {/* GPS button */}
      <TouchableOpacity
        style={[styles.gpsBtn, gpsLoading && styles.gpsBtnDisabled]}
        onPress={onGpsPress}
        disabled={gpsLoading}
        activeOpacity={0.75}
      >
        {gpsLoading ? (
          <ActivityIndicator color={Colors.gold} size="small" style={{ marginRight: 8 }} />
        ) : (
          <Text style={styles.gpsIcon}>🎯</Text>
        )}
        <Text style={styles.gpsBtnText}>
          {gpsLoading ? 'GPS খোঁজা হচ্ছে...' : 'GPS অবস্থান ব্যবহার করুন'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },

  mapBox: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    position: 'relative',
  },
  mapBoxPinned: {
    borderColor: '#22c55e',
  },
  webview: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  hint: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },

  labelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 4,
  },
  pinIcon: { fontSize: 14, marginTop: 1 },
  labelText: {
    color: Colors.textSecondary,
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },

  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceElevated,
  },
  gpsBtnDisabled: { opacity: 0.6 },
  gpsIcon: { fontSize: 16 },
  gpsBtnText: { color: Colors.gold, fontSize: 13, fontWeight: '600' },
});
