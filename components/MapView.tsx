
import React, { useEffect, useRef, useState } from 'react';
import { Point, ProjectionSettings } from '../types';
import { Trash2, MapPin, LocateFixed, Navigation2, Globe, Focus, Target, Ruler, X, ArrowUpRight, Layers, Scaling, Search, Check, AlertCircle, Plus, ChevronRight, Navigation, Menu } from 'lucide-react';
import { wgs84ToProjected, projectedToWgs84 } from '../utils/geoUtils';

interface MapViewProps {
  points: Point[];
  onAddPoint: (point: Point) => void;
  onDeletePoint: (id: string) => void;
  onClearPoints: () => void;
  stakeoutTarget?: Point | null;
  onCloseStakeout?: () => void;
  onStartStakeout: (id: string) => void;
  projSettings: ProjectionSettings;
  selectedPoints?: Point[];
}

declare const L: any;

type MapLayerType = 'osm' | 'google_satellite' | 'google_hybrid' | 'google_terrain';

const MapView: React.FC<MapViewProps> = ({ points, onAddPoint, onDeletePoint, onClearPoints, stakeoutTarget, onCloseStakeout, onStartStakeout, projSettings, selectedPoints = [] }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const userLocationMarkerRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const activeTileLayerRef = useRef<any>(null);

  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<any[]>([]);
  const measureLineRef = useRef<any>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number, alt?: number, accuracy?: number } | null>(null);
  const [isTrackingActive, setIsTrackingActive] = useState<boolean>(true);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [activeLayer, setActiveLayer] = useState<MapLayerType>('google_hybrid');

  // Nokta Kayıt (Survey) State
  const [surveyModal, setSurveyModal] = useState<{ lat: number, lng: number, alt?: number, accuracy?: number, name: string } | null>(null);

  // Hızlı Koordinat Giriş State
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickCoords, setQuickCoords] = useState({ name: '', y: '', x: '' });

  // Konum İzni State
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isToolbarOpen, setIsToolbarOpen] = useState(true);

  const layers = {
    osm: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OSM', label: 'Sokak' },
    google_satellite: { url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', attribution: '&copy; Google', label: 'Uydu' },
    google_hybrid: { url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', attribution: '&copy; Google', label: 'Hibrit' },
    google_terrain: { url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', attribution: '&copy; Google', label: 'Arazi' }
  };

  useEffect(() => {
    if (!mapContainerRef.current || map) return;
    const mapInstance = L.map(mapContainerRef.current, { zoomControl: false, maxZoom: 22 }).setView([39.9334, 32.8597], 6);
    const initialLayer = L.tileLayer(layers[activeLayer].url, { maxZoom: 22 }).addTo(mapInstance);
    activeTileLayerRef.current = initialLayer;
    setMap(mapInstance);
    return () => { if (mapInstance) mapInstance.remove(); };
  }, []);

  // Helper
  const createLatLng = (p: any) => L.latLng(p.lat, p.lng);

  // Haritaya Tıklama Dinleyicisi
  useEffect(() => {
    if (!map) return;
    const onClick = (e: any) => {
      if (e.originalEvent._handledByMarker || showQuickAdd || surveyModal) return;
      if (isMeasuring) {
        setMeasurePoints(prev => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng, name: 'Konum' }]);
        return;
      }
      setSurveyModal({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        name: `P-${points.length + 1}`,
        accuracy: 0
      });
    };
    map.on('click', onClick);
    return () => { map.off('click', onClick); };
  }, [map, isMeasuring, points.length, showQuickAdd, surveyModal]);

  // Ölçüm Çizgisini Güncelle
  useEffect(() => {
    if (!map) return;
    if (measureLineRef.current) map.removeLayer(measureLineRef.current);
    if (measurePoints.length > 1) {
      measureLineRef.current = L.polyline(measurePoints.map(p => [p.lat, p.lng]), {
        color: '#2563eb',
        weight: 4,
        dashArray: '10, 10',
        lineJoin: 'round'
      }).addTo(map);
    }
  }, [measurePoints, map]);

  // Katman Değişimi
  useEffect(() => {
    if (!map) return;
    if (activeTileLayerRef.current) map.removeLayer(activeTileLayerRef.current);
    const newLayer = L.tileLayer(layers[activeLayer].url, { maxZoom: 22 }).addTo(map);
    activeTileLayerRef.current = newLayer;
  }, [activeLayer, map]);

  // Aplikasyon Hedefi Değiştiğinde Zoom Yap
  useEffect(() => {
    if (map && stakeoutTarget) {
      map.setView([stakeoutTarget.lat, stakeoutTarget.lng], 19, { animate: true });
    }
  }, [map, stakeoutTarget]);

  // GPS Takibi
  useEffect(() => {
    if (!map) return;
    if (isTrackingActive && "geolocation" in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, altitude, accuracy } = pos.coords;
          setUserLocation({ lat: latitude, lng: longitude, alt: altitude || undefined, accuracy });

          if (!userLocationMarkerRef.current) {
            const icon = L.divIcon({
              className: 'user-marker',
              html: '<div class="relative flex h-6 w-6"><div class="animate-ping absolute h-full w-full rounded-full bg-blue-400 opacity-40"></div><div class="relative rounded-full h-6 w-6 bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center"><div class="w-2 h-2 bg-white rounded-full"></div></div></div>',
              iconSize: [24, 24], iconAnchor: [12, 12]
            });
            userLocationMarkerRef.current = L.marker([latitude, longitude], { icon, zIndexOffset: 1000 }).addTo(map);
          } else {
            userLocationMarkerRef.current.setLatLng([latitude, longitude]);
          }
        },
        (err) => {
          console.error("GPS Error:", err);
          let msg = "Konum alınırken bir hata oluştu.";
          if (err.code === 1) { // PERMISSION_DENIED
            setPermissionStatus('denied');
            msg = "Konum izni reddedildi. Lütfen tarayıcı ayarlarından izin verin.";
          } else if (err.code === 2) { // POSITION_UNAVAILABLE
            msg = "Konum bilgisi alınamıyor. Cihazınızın GPS'inin açık olduğundan emin olun. (Güvenli bağlantı/HTTPS gerekebilir)";
          } else if (err.code === 3) { // TIMEOUT
            msg = "Konum isteği zaman aşımına uğradı.";
          }
          setStatusMessage(msg);
          setShowPermissionModal(true);
          setIsTrackingActive(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      if (userLocationMarkerRef.current) {
        map.removeLayer(userLocationMarkerRef.current);
        userLocationMarkerRef.current = null;
      }
    }
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, [map, isTrackingActive]);

  // Marker Güncelleme
  useEffect(() => {
    if (!map) return;
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current.clear();
    points.forEach(p => {
      const isSelected = selectedPoints.some(sp => sp.id === p.id);
      const isStaked = stakeoutTarget?.id === p.id;
      const proj = wgs84ToProjected(p.lat, p.lng, projSettings.width, projSettings.centralMeridian, projSettings.datum);

      const icon = L.divIcon({
        className: 'survey-marker',
        html: `<div class="flex flex-col items-center">
          <div class="w-3.5 h-3.5 ${isStaked ? 'bg-blue-500 scale-150 ring-4 ring-blue-500/30' : isSelected ? 'bg-emerald-500' : 'bg-red-500'} rounded-full border-2 border-white shadow-lg transition-all"></div>
          <div class="bg-slate-900/80 backdrop-blur px-1.5 py-0.5 mt-1 text-[9px] text-white rounded font-bold shadow-sm border border-white/10 uppercase">${p.name}</div>
        </div>`,
        iconSize: [30, 30], iconAnchor: [15, 15]
      });

      const marker = L.marker([p.lat, p.lng], { icon }).addTo(map);

      const popupContent = document.createElement('div');
      popupContent.className = 'p-4 min-w-[200px] font-sans';
      popupContent.innerHTML = `
        <div class="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
          <div class="w-2.5 h-2.5 rounded-full bg-red-500"></div>
          <span class="text-xs font-black text-slate-900 uppercase tracking-wide">${p.name}</span>
        </div>
        <div class="space-y-1.5 font-mono text-[10px] text-slate-600 mb-4">
          <div class="flex justify-between bg-slate-50 p-1.5 rounded"><span>Y (Sağa):</span> <span class="font-black text-blue-600">${proj.east.toFixed(3)}</span></div>
          <div class="flex justify-between bg-slate-50 p-1.5 rounded"><span>X (Yukarı):</span> <span class="font-black text-emerald-600">${proj.north.toFixed(3)}</span></div>
          ${p.alt ? `<div class="flex justify-between bg-slate-50 p-1.5 rounded"><span>Z (Kot):</span> <span class="font-black text-slate-900">${p.alt.toFixed(3)}</span></div>` : ''}
        </div>
        <div class="flex gap-2">
          <button id="stake-btn-${p.id}" class="flex-1 bg-blue-600 text-white text-[10px] font-black py-2.5 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
            APLİKASYON
          </button>
          <button id="del-btn-${p.id}" class="w-10 bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl flex items-center justify-center transition-all active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: false,
        offset: [0, -10],
        className: 'custom-leaflet-popup'
      });

      marker.on('click', (e: any) => {
        L.DomEvent.stopPropagation(e);
        e.target._handledByMarker = true;
        if (isMeasuring) {
          setMeasurePoints(prev => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng, name: p.name }]);
          marker.closePopup();
        }
      });

      marker.on('popupopen', () => {
        const sBtn = document.getElementById(`stake-btn-${p.id}`);
        const dBtn = document.getElementById(`del-btn-${p.id}`);
        if (sBtn) sBtn.onclick = () => { onStartStakeout(p.id); marker.closePopup(); };
        if (dBtn) dBtn.onclick = () => { onDeletePoint(p.id); marker.closePopup(); };
      });

      markersRef.current.set(p.id, marker);
    });
  }, [map, points, onStartStakeout, onDeletePoint, selectedPoints, stakeoutTarget, projSettings, isMeasuring]);

  const centerOnMe = () => {
    if (userLocation && map) map.setView([userLocation.lat, userLocation.lng], 19, { animate: true });
    else alert("GPS konumu bekleniyor...");
  };

  const handleSaveSurvey = () => {
    if (surveyModal) {
      onAddPoint({
        id: Math.random().toString(36).substr(2, 9),
        name: surveyModal.name,
        lat: surveyModal.lat,
        lng: surveyModal.lng,
        alt: surveyModal.alt,
        timestamp: Date.now()
      });
      setSurveyModal(null);
    }
  };

  const handleQuickAdd = (startStakeoutImmediately: boolean = false) => {
    if (!quickCoords.y || !quickCoords.x) return;
    const wgs84 = projectedToWgs84(parseFloat(quickCoords.y), parseFloat(quickCoords.x), projSettings.width, projSettings.centralMeridian || 33, projSettings.datum);
    const id = Math.random().toString(36).substr(2, 9);
    const newPoint = { id, name: quickCoords.name || `P-${points.length + 1}`, lat: wgs84.lat, lng: wgs84.lng, timestamp: Date.now() };
    onAddPoint(newPoint);
    setShowQuickAdd(false);
    setQuickCoords({ name: '', y: '', x: '' });
    if (startStakeoutImmediately) onStartStakeout(id);
  };

  const calculateStakeout = () => {
    if (!userLocation || !stakeoutTarget) return null;
    const targetProj = wgs84ToProjected(stakeoutTarget.lat, stakeoutTarget.lng, projSettings.width, projSettings.centralMeridian, projSettings.datum);
    const userProj = wgs84ToProjected(userLocation.lat, userLocation.lng, projSettings.width, projSettings.centralMeridian, projSettings.datum);
    const dy = targetProj.east - userProj.east;
    const dx = targetProj.north - userProj.north;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let azim = Math.atan2(dy, dx) * (180 / Math.PI);
    if (azim < 0) azim += 360;
    let azimGon = Math.atan2(dy, dx) * (200 / Math.PI);
    if (azimGon < 0) azimGon += 400;
    return { dist, azim, azimGon };
  };

  const stData = calculateStakeout();
  const projUser = userLocation ? wgs84ToProjected(userLocation.lat, userLocation.lng, projSettings.width, projSettings.centralMeridian, projSettings.datum) : null;
  const surveyProj = surveyModal ? wgs84ToProjected(surveyModal.lat, surveyModal.lng, projSettings.width, projSettings.centralMeridian, projSettings.datum) : null;

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-slate-100">
      <div ref={mapContainerRef} className="flex-1 z-0" />

      {/* MESAFE ÖLÇÜM PANELİ */}
      {isMeasuring && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-2 max-w-[90vw]">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 p-4 rounded-[2rem] shadow-xl flex items-center gap-6 animate-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                <Scaling className="w-5 h-5" />
              </div>
              <div className="flex flex-col whitespace-nowrap">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">MESAFE ÖLÇÜMÜ</span>
                <span className="text-xl font-mono font-black text-slate-900">
                  {measurePoints.reduce((acc, curr, idx) => {
                    if (idx === 0) return 0;
                    return acc + L.latLng(measurePoints[idx - 1]).distanceTo(createLatLng(curr));
                  }, 0).toFixed(2)} m
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 hidden sm:block" />

            <div className="flex gap-2">
              <button
                onClick={() => setMeasurePoints([])}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                SIFIRLA
              </button>
              <button
                onClick={() => { setIsMeasuring(false); setMeasurePoints([]); }}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" /> KAPAT
              </button>
            </div>
          </div>

          {measurePoints.length > 0 && (
            <div className="bg-white/90 backdrop-blur-md border border-slate-200 p-4 rounded-3xl shadow-lg w-full max-w-sm animate-in slide-in-from-top-2 max-h-[40vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-2 mb-3 px-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SEÇİLEN NOKTALAR ({measurePoints.length})</span>
              </div>
              <div className="space-y-2">
                {measurePoints.map((p, i) => {
                  const dist = i > 0 ? L.latLng(measurePoints[i - 1]).distanceTo(createLatLng(p)) : 0;
                  return (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-black text-slate-600">
                          {i + 1}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800">{p.name || 'Harita Noktası'}</span>
                          <span className="text-[9px] font-mono text-slate-500">{p.lat.toFixed(6)}, {p.lng.toFixed(6)}</span>
                        </div>
                      </div>
                      {i > 0 && (
                        <div className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black border border-blue-100">
                          +{dist.toFixed(2)}m
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* APLİKASYON PUSULA PANELİ */}
      {stakeoutTarget && stData && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-4">
          <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-5 shadow-2xl flex flex-col gap-5 animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <Target className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">HEDEF NOKTA</span>
                  <span className="text-sm font-black text-white">{stakeoutTarget.name}</span>
                </div>
              </div>
              <button onClick={onCloseStakeout} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-6">
              <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[6px] border-white/5"></div>
                <div className="absolute inset-2 rounded-full border-[2px] border-dashed border-white/10 animate-[spin_20s_linear_infinite]"></div>
                <div
                  className="relative w-full h-full transition-transform duration-500 ease-out"
                  style={{ transform: `rotate(${stData.azim - 90}deg)` }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-bottom-[28px] border-bottom-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>
                    <div className="w-4 h-16 bg-gradient-to-b from-blue-500 to-transparent rounded-full -mt-1 opacity-50"></div>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full shadow-lg"></div>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center gap-4">
                <div className="bg-white/5 p-4 rounded-[1.5rem] border border-white/5">
                  <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">MESAFE</span>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-mono font-black ${stData.dist < 1 ? 'text-emerald-400 animate-pulse' : 'text-blue-400'}`}>
                      {stData.dist.toFixed(2)}
                    </span>
                    <span className="text-xs font-bold text-slate-400">m</span>
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-[1.5rem] border border-white/5">
                  <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">SEMT</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-mono font-black text-emerald-400">{stData.azimGon.toFixed(2)}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">gon</span>
                  </div>
                </div>
              </div>
            </div>

            {stData.dist < 0.5 && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl flex items-center gap-3 animate-bounce">
                <Check className="w-5 h-5 text-emerald-500" />
                <span className="text-xs font-black text-emerald-500 uppercase">HEDEFE ULAŞILDI (±{stData.dist.toFixed(2)}m)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ARAÇ ÇUBUĞU */}
      <div className="absolute bottom-24 lg:bottom-12 right-4 z-[1001] flex flex-col items-end gap-2">
        {isToolbarOpen && (
          <div className="bg-white/95 backdrop-blur-md p-2 rounded-[2rem] shadow-2xl border border-white/50 flex flex-col gap-2 animate-in slide-in-from-right-4 fade-in duration-300">
            <button onClick={centerOnMe} className="p-4 bg-slate-100 text-slate-700 rounded-[1.5rem] hover:bg-slate-200 active:scale-90 transition-all" title="Beni Bul"><Focus className="w-6 h-6" /></button>
            <button onClick={() => userLocation && setSurveyModal({ ...userLocation, name: `P-${points.length + 1}` })} className="p-4 bg-blue-600 text-white rounded-[1.5rem] hover:bg-blue-700 shadow-xl shadow-blue-500/30 active:scale-90 transition-all group" title="Nokta Kaydı"><LocateFixed className="w-6 h-6 group-hover:scale-110 transition-transform" /></button>
            <button onClick={() => setShowQuickAdd(true)} className="p-4 bg-slate-900 text-white rounded-[1.5rem] hover:bg-black active:scale-90 transition-all" title="Koordinat Gir"><Plus className="w-6 h-6" /></button>
            <div className="w-full h-px bg-slate-200/50 my-1" />
            <button onClick={() => { setIsMeasuring(!isMeasuring); setMeasurePoints([]); }} className={`p-4 rounded-[1.5rem] transition-all ${isMeasuring ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`} title="Mesafe Ölç"><Ruler className="w-6 h-6" /></button>
            <button onClick={() => setIsTrackingActive(!isTrackingActive)} className={`p-4 rounded-[1.5rem] transition-all ${isTrackingActive ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-slate-400 hover:bg-slate-100'}`} title="GPS"><Navigation2 className={`w-6 h-6 ${isTrackingActive ? 'fill-current' : ''}`} /></button>
            <button onClick={() => setShowLayerMenu(!showLayerMenu)} className={`p-4 rounded-[1.5rem] transition-all ${showLayerMenu ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`} title="Harita"><Layers className="w-6 h-6" /></button>
          </div>
        )}
        <button
          onClick={() => setIsToolbarOpen(!isToolbarOpen)}
          className="bg-white/95 backdrop-blur-md p-3 rounded-full shadow-xl border border-white/50 text-slate-700 hover:bg-slate-50 transition-all active:scale-90"
          title={isToolbarOpen ? "Menüyü Gizle" : "Menüyü Göster"}
        >
          {isToolbarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* MODALLAR */}
      {surveyModal && surveyProj && (
        <div className="fixed inset-0 z-[2005] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-lg"><LocateFixed className="w-6 h-6" /></div>
                  <h3 className="text-xl font-black text-slate-900">Nokta Kaydı</h3>
                </div>
                {surveyModal.accuracy !== undefined && (
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black border ${surveyModal.accuracy < 5 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-orange-50 border-orange-100 text-orange-600'}`}>
                    {surveyModal.accuracy === 0 ? 'MANUEL' : `±${surveyModal.accuracy.toFixed(1)}m`}
                  </div>
                )}
              </div>
              <div className="space-y-5 mb-10">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nokta Adı</label>
                  <input autoFocus type="text" value={surveyModal.name} onChange={e => setSurveyModal({ ...surveyModal, name: e.target.value })} className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-800 focus:ring-0" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                    <span className="text-[9px] font-black text-blue-400 uppercase block mb-1">Y (Sağa)</span>
                    <span className="text-base font-mono font-black text-blue-900">{surveyProj.east.toFixed(3)}</span>
                  </div>
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                    <span className="text-[9px] font-black text-emerald-400 uppercase block mb-1">X (Yukarı)</span>
                    <span className="text-base font-mono font-black text-emerald-900">{surveyProj.north.toFixed(3)}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={handleSaveSurvey} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                  <Check className="w-6 h-6" /> KAYDET
                </button>
                <button onClick={() => setSurveyModal(null)} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors">Vazgeç</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KONUM İZNİ MODALI */}
      {showPermissionModal && (
        <div className="fixed inset-0 z-[2010] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Navigation2 className="w-10 h-10 text-red-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3">Konum Erişimi Sorunu</h3>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              {statusMessage || "Arazide çalışabilmek ve sizi harita üzerinde gösterebilmek için konum erişimine ihtiyacımız var."}
            </p>
            <div className="space-y-3">
              <button onClick={() => { setShowPermissionModal(false); setIsTrackingActive(true); }} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-200">
                TEKRAR DENE
              </button>
              <button onClick={() => setShowPermissionModal(false)} className="w-full py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 active:scale-95 transition-all">
                VAZGEÇ
              </button>
            </div>
            <p className="mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Tarayıcı ayarlarından konuma izin verin
            </p>
          </div>
        </div>
      )}

      {/* QUICK ADD MODAL */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-[2010] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-slate-900 text-white rounded-2xl shadow-lg"><Plus className="w-6 h-6" /></div>
                  <h3 className="text-xl font-black text-slate-900">Koordinat Gir</h3>
                </div>
                <button onClick={() => setShowQuickAdd(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-5 mb-10">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nokta Adı</label>
                  <input autoFocus type="text" placeholder={`P-${points.length + 1}`} value={quickCoords.name} onChange={e => setQuickCoords({ ...quickCoords, name: e.target.value })} className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-800 focus:ring-0 placeholder:text-slate-300" />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                    <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-1">Y (Sağa)</label>
                    <input type="number" placeholder="500000.000" value={quickCoords.y} onChange={e => setQuickCoords({ ...quickCoords, y: e.target.value })} className="w-full bg-transparent border-none p-0 text-base font-mono font-bold text-blue-900 focus:ring-0 placeholder:text-blue-200" />
                  </div>
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                    <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-1">X (Yukarı)</label>
                    <input type="number" placeholder="4500000.000" value={quickCoords.x} onChange={e => setQuickCoords({ ...quickCoords, x: e.target.value })} className="w-full bg-transparent border-none p-0 text-base font-mono font-bold text-emerald-900 focus:ring-0 placeholder:text-emerald-200" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={() => handleQuickAdd(true)} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                  <Target className="w-6 h-6" /> KAYDET VE GİT
                </button>
                <button onClick={() => handleQuickAdd(false)} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors">
                  Sadece Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CANLI KONUM PANELİ */}
      <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-3 pointer-events-none">
        {projUser && (
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-xl px-5 py-3 rounded-full border border-white/20 shadow-2xl flex items-center gap-6 text-white animate-in slide-in-from-left-4">
            <div className="flex items-center gap-2.5 pr-5 border-r border-white/20">
              <div className={`w-2 h-2 rounded-full ${userLocation?.accuracy && userLocation.accuracy < 5 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-orange-500 animate-pulse'} `} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{projSettings.datum}</span>
            </div>
            <div className="flex gap-6 font-mono text-xs font-black">
              <div className="flex gap-2"><span className="text-slate-500">Y:</span>{projUser.east.toFixed(3)}</div>
              <div className="flex gap-2"><span className="text-slate-500">X:</span>{projUser.north.toFixed(3)}</div>
              {userLocation?.alt && <div className="flex gap-2 text-blue-400"><span className="text-slate-500">Z:</span>{userLocation.alt.toFixed(2)}</div>}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .custom-leaflet-popup .leaflet-popup-content-wrapper { border-radius: 2rem; padding: 0; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border: 1px solid rgba(255,255,255,0.2); }
        .custom-leaflet-popup .leaflet-popup-content { margin: 0; width: auto !important; }
        .custom-leaflet-popup .leaflet-popup-tip-container { display: none; }
        .border-bottom-blue-500 { border-bottom: 28px solid #3b82f6; }
      `}</style>
    </div>
  );
};

export default MapView;
