
import React, { useState, useCallback, useRef, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import MapView from './components/MapView';
import CalcPanel from './components/CalcPanel';
import AdBanner from './components/AdBanner';
import { AppMode, Point, ProjectionSettings } from './types';
import { Download, Upload, FileText, Trash2, MapPin, Globe, Settings as SettingsIcon, Menu, ArrowUpDown, X, Navigation, Plus, Target, Map as MapIcon, Square, CheckSquare, Layers, ChevronLeft, ChevronRight, Search, Pencil } from 'lucide-react';
import { wgs84ToProjected, projectedToWgs84, downloadTxtFile, downloadKmlFile, parseSurveyFile, calculateGaussArea } from './utils/geoUtils';

const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.MAP);
  const [points, setPoints] = useState<Point[]>([]);
  const [stakeoutTargetId, setStakeoutTargetId] = useState<string | null>(null);
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [manualName, setManualName] = useState("");
  const [manualY, setManualY] = useState("");
  const [manualX, setManualX] = useState("");
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  // const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile menu replaced by BottomNav
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [projSettings, setProjSettings] = useState<ProjectionSettings>({
    type: 'TM',
    width: 3,
    centralMeridian: 33,
    autoZone: false,
    datum: 'ITRF96'
  });

  const filteredPoints = useMemo(() => {
    if (!searchTerm) return points;
    return points.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [points, searchTerm]);

  const addPoint = useCallback((p: Point) => {
    setPoints(prev => [...prev, p]);
  }, []);

  const togglePointSelection = (id: string) => {
    setSelectedPointIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const selectedPoints = useMemo(() => {
    return selectedPointIds
      .map(id => points.find(p => p.id === id))
      .filter((p): p is Point => !!p);
  }, [selectedPointIds, points]);

  const calculatedArea = useMemo(() => {
    if (selectedPoints.length < 3) return 0;
    const projectedCoords = selectedPoints.map(p => {
      const proj = wgs84ToProjected(p.lat, p.lng, projSettings.width, projSettings.centralMeridian, projSettings.datum);
      return { y: proj.east, x: proj.north };
    });
    return calculateGaussArea(projectedCoords);
  }, [selectedPoints, projSettings]);

  const startEditing = (p: Point) => {
    const proj = wgs84ToProjected(p.lat, p.lng, projSettings.width, projSettings.centralMeridian, projSettings.datum);
    setManualName(p.name);
    setManualY(proj.east.toFixed(3));
    setManualX(proj.north.toFixed(3));
    setEditingId(p.id);
    setShowManualModal(true);
  };

  const handleManualAdd = (startStakeoutImmediately: boolean = false) => {
    if (!manualName || !manualY || !manualX) return alert("Lütfen tüm alanları doldurun.");
    const coords = projectedToWgs84(parseFloat(manualY), parseFloat(manualX), projSettings.width, projSettings.centralMeridian || 33, projSettings.datum);

    if (editingId) {
      setPoints(prev => prev.map(p => p.id === editingId ? { ...p, name: manualName, lat: coords.lat, lng: coords.lng } : p));
      setEditingId(null);
    } else {
      const id = Math.random().toString(36).substr(2, 9);
      const p: Point = {
        id,
        name: manualName,
        lat: coords.lat,
        lng: coords.lng,
        timestamp: Date.now()
      };
      addPoint(p);
      if (startStakeoutImmediately) startStakeout(id);
    }

    setShowManualModal(false);
    setManualName(""); setManualY(""); setManualX("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const newPoints = await parseSurveyFile(file, projSettings.width, projSettings.centralMeridian || 33, projSettings.datum);
      if (newPoints.length > 0) {
        setPoints(prev => [...prev, ...newPoints]);
        alert(`${newPoints.length} nokta başarıyla eklendi.`);
      } else {
        alert("Hata: Dosya formatı uygun değil. Format 'AD Y X [Z]' şeklinde olmalıdır.");
      }
    } catch (err) {
      alert("Dosya okuma hatası.");
    }
    if (e.target) e.target.value = "";
  };

  const removePoint = useCallback((id: string) => {
    if (confirm("Seçili nokta tamamen silinecek. Onaylıyor musunuz?")) {
      setPoints(prev => prev.filter(p => p.id !== id));
      setSelectedPointIds(prev => prev.filter(pId => pId !== id));
      setStakeoutTargetId(current => current === id ? null : current);
    }
  }, []);

  const handleDownloadTxt = () => {
    if (points.length === 0) return alert("Veri yok.");
    downloadTxtFile(points, `esocad_points_${Date.now()}.txt`, projSettings.width, projSettings.centralMeridian, projSettings.datum);
    setShowExportOptions(false);
  };

  const handleDownloadKml = () => {
    if (points.length === 0) return alert("Veri yok.");
    downloadKmlFile(points, `esocad_export_${Date.now()}.kml`);
    setShowExportOptions(false);
  };

  const startStakeout = (id: string) => {
    setStakeoutTargetId(id);
    setCurrentMode(AppMode.MAP);
  };

  const stakeoutPoint = points.find(p => p.id === stakeoutTargetId);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <div className="hidden lg:block h-full">
        <Sidebar currentMode={currentMode} onModeChange={setCurrentMode} isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} isMobileOpen={false} setIsMobileOpen={() => { }} />
      </div>

      <main className="flex-1 flex flex-col relative overflow-hidden pb-16 lg:pb-0">
        {/* Export Options Popover */}
        {showExportOptions && (
          <div className="absolute top-16 right-6 z-[100] w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 animate-in slide-in-from-top-2">
            <button onClick={handleDownloadTxt} className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-xl flex items-center gap-3 transition-colors">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-700">TXT Olarak Al</span>
            </button>
            <button onClick={handleDownloadKml} className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-xl flex items-center gap-3 transition-colors">
              <MapIcon className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-700">KML (Earth)</span>
            </button>
            <div className="h-px bg-slate-100 my-1" />
            <button onClick={() => setShowExportOptions(false)} className="w-full text-left px-4 py-2 text-[10px] text-slate-400 font-bold uppercase hover:text-slate-600 transition-colors">Vazgeç</button>
          </div>
        )}

        {showManualModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-md rounded-3xl p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900">{editingId ? 'Nokta Düzenle' : 'Nokta Ekle'}</h3>
                <button onClick={() => setShowManualModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="space-y-5 mb-10">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nokta Adı</label>
                  <input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Örn: P1" className="w-full bg-transparent border-none p-0 text-base font-bold focus:ring-0" />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Y Koordinatı (Sağa)</label>
                    <input value={manualY} onChange={e => setManualY(e.target.value)} type="number" placeholder="500000.000" className="w-full bg-transparent border-none p-0 text-base font-mono font-bold focus:ring-0" />
                  </div>
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">X Koordinatı (Yukarı)</label>
                    <input value={manualX} onChange={e => setManualX(e.target.value)} type="number" placeholder="4450000.000" className="w-full bg-transparent border-none p-0 text-base font-mono font-bold focus:ring-0" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={() => handleManualAdd(true)} className="w-full bg-blue-600 text-white py-5 rounded-[1.5rem] font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                  {editingId ? <CheckSquare className="w-6 h-6" /> : <Target className="w-6 h-6" />}
                  {editingId ? 'GÜNCELLE' : 'KAYDET VE APLİKASYON YAP'}
                </button>
                <button onClick={() => handleManualAdd(false)} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600">Sadece Kaydet</button>
              </div>
            </div>
          </div>
        )}

        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-20 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            {/* <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 lg:hidden"><Menu className="w-6 h-6 text-slate-500" /></button> */}
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              {currentMode === AppMode.MAP && 'Harita & Aplikasyon'}
              {currentMode === AppMode.CALCULATIONS && 'Hesap Araçları'}
              {currentMode === AppMode.HISTORY && 'Özet Cetveli'}
              {currentMode === AppMode.SETTINGS && 'Ayarlar'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center bg-slate-100 p-3 rounded-xl hover:bg-slate-200 transition-all active:scale-95 text-slate-700" title="Dosya Oku">
              <Upload className="w-5 h-5" />
            </button>
            <button onClick={() => setShowExportOptions(!showExportOptions)} className="flex items-center justify-center bg-slate-900 text-white p-3 rounded-xl shadow-lg hover:shadow-slate-200 active:scale-95 transition-all" title="Dışa Aktar">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden">
          {currentMode === AppMode.MAP && (
            <div className="flex h-full w-full">
              <MapView
                points={points}
                onAddPoint={addPoint}
                onDeletePoint={removePoint}
                onClearPoints={() => setPoints([])}
                stakeoutTarget={stakeoutPoint}
                onCloseStakeout={() => setStakeoutTargetId(null)}
                onStartStakeout={startStakeout}
                projSettings={projSettings}
                selectedPoints={selectedPoints}
              />


              {/* SAĞ PANEL TOGGLE BUTONU */}
              <button
                onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                className={`absolute right-0 top-1/2 -translate-y-1/2 z-[100] bg-white p-2 rounded-l-xl shadow-lg border-y border-l border-slate-200 text-slate-500 hover:text-blue-600 transition-all ${isRightSidebarOpen ? 'mr-80' : 'mr-0'}`}
              >
                {isRightSidebarOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>

              <div className={`fixed inset-y-0 right-0 w-80 bg-white border-l border-gray-200 flex flex-col shadow-xl z-50 transition-transform duration-300 ease-in-out ${isRightSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-5 bg-slate-50 border-b border-gray-200 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><Navigation className="w-4 h-4 text-blue-600" /> Nokta Havuzu</h3>
                    <div className="flex gap-1">
                      {selectedPointIds.length > 0 && (
                        <button
                          onClick={() => setSelectedPointIds([])}
                          className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-all shadow-sm active:scale-95"
                          title="Seçimi Temizle"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setManualName("");
                          setManualY("");
                          setManualX("");
                          setShowManualModal(true);
                        }}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Nokta Ara..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {selectedPointIds.length >= 3 && (
                  <div className="p-4 bg-emerald-600 text-white animate-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Seçili Alan Hesabı</span>
                      <div className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">{selectedPointIds.length} Nokta</div>
                    </div>
                    <div className="text-xl font-mono font-black">{calculatedArea.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} m²</div>
                    <div className="text-[10px] font-bold opacity-70">{(calculatedArea / 1000).toFixed(3)} daa (Dönüm)</div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 custom-scrollbar">
                  {filteredPoints.length === 0 ? (
                    <div className="p-10 text-center text-slate-300 text-xs italic">
                      {searchTerm ? 'Sonuç bulunamadı.' : 'Haritaya tıklayın veya manuel ekleyin.'}
                    </div>
                  ) : (
                    [...filteredPoints].reverse().map(p => {
                      const proj = wgs84ToProjected(p.lat, p.lng, projSettings.width, projSettings.centralMeridian, projSettings.datum);
                      const isStaked = stakeoutTargetId === p.id;
                      const isSelected = selectedPointIds.includes(p.id);
                      return (
                        <div key={p.id} className={`p-4 transition-colors group flex items-start gap-3 ${isStaked ? 'bg-blue-50 border-r-4 border-blue-600' : isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                          <button
                            onClick={() => togglePointSelection(p.id)}
                            className={`mt-1 transition-colors ${isSelected ? 'text-emerald-600' : 'text-slate-300 group-hover:text-slate-400'}`}
                            title="Alan için seç"
                          >
                            {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                          </button>
                          <div className="flex-1">
                            <div className="flex justify-between font-bold text-xs mb-1">
                              <span className="text-slate-800 uppercase">{p.name}</span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => startStakeout(p.id)} className={`${isStaked ? 'text-blue-600' : 'text-slate-400 hover:text-blue-600'}`} title="Aplikasyon Yap"><Target className="w-4 h-4" /></button>
                                <button onClick={() => startEditing(p)} className="text-slate-400 hover:text-orange-500" title="Düzenle"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => removePoint(p.id)} className="text-slate-400 hover:text-red-500" title="Sil"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 flex justify-between">
                              <span>Y: {proj.east.toFixed(2)}</span>
                              <span>X: {proj.north.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {currentMode === AppMode.CALCULATIONS && <CalcPanel />}
          {currentMode === AppMode.HISTORY && (
            <div className="p-8 max-w-7xl mx-auto h-full overflow-y-auto bg-slate-50">
              <div className="flex justify-between items-end mb-8">
                <h2 className="text-3xl font-black text-slate-900 flex items-center gap-4">
                  <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-200"><FileText className="w-7 h-7" /></div>
                  Özet Cetveli ({projSettings.datum})
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => fileInputRef.current?.click()} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-black hover:bg-slate-50 transition-all flex items-center gap-2"><Upload className="w-4 h-4" /> DOSYA OKU</button>
                  <button onClick={handleDownloadTxt} className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-black hover:bg-black transition-all flex items-center gap-2"><Download className="w-4 h-4" /> TXT KAYDET</button>
                </div>
              </div>
              <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
                    <tr>
                      <th className="p-6">Seç</th>
                      <th className="p-6">Nokta No</th>
                      <th className="p-6">Y (Sağa)</th>
                      <th className="p-6">X (Yukarı)</th>
                      <th className="p-6">Enlem (WGS84)</th>
                      <th className="p-6">Boylam (WGS84)</th>
                      <th className="p-6 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPoints.map(p => {
                      const proj = wgs84ToProjected(p.lat, p.lng, projSettings.width, projSettings.centralMeridian, projSettings.datum);
                      const isSelected = selectedPointIds.includes(p.id);
                      return (
                        <tr key={p.id} className={`transition-colors ${isSelected ? 'bg-emerald-50/50' : 'hover:bg-blue-50/30'}`}>
                          <td className="p-6">
                            <button onClick={() => togglePointSelection(p.id)} className={`transition-colors ${isSelected ? 'text-emerald-600' : 'text-slate-300 hover:text-slate-400'}`}>
                              {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                            </button>
                          </td>
                          <td className="p-6 font-black text-slate-800 uppercase">{p.name}</td>
                          <td className="p-6 font-mono font-black text-blue-600">{proj.east.toFixed(3)}</td>
                          <td className="p-6 font-mono font-black text-emerald-600">{proj.north.toFixed(3)}</td>
                          <td className="p-6 font-mono text-slate-400 text-xs">{p.lat.toFixed(8)}</td>
                          <td className="p-6 font-mono text-slate-400 text-xs">{p.lng.toFixed(8)}</td>
                          <td className="p-6">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => startStakeout(p.id)} className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md transition-all active:scale-95" title="Aplikasyon Yap"><Target className="w-4 h-4" /></button>
                              <button onClick={() => startEditing(p)} className="p-2.5 bg-orange-100 text-orange-600 rounded-xl hover:bg-orange-200 transition-all active:scale-95" title="Düzenle"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => removePoint(p.id)} className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all active:scale-95" title="Sil"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {filteredPoints.length === 0 && (
                      <tr><td colSpan={7} className="p-20 text-center text-slate-300 font-medium italic text-sm">
                        {searchTerm ? 'Sonuç bulunamadı.' : 'Kayıtlı veri bulunmuyor. Harita modundan nokta ekleyin.'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {currentMode === AppMode.SETTINGS && (
            <div className="p-8 max-w-2xl mx-auto h-full overflow-y-auto">
              <h2 className="text-3xl font-black text-slate-900 mb-8 text-center sm:text-left">Sistem Ayarları</h2>
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200 space-y-8">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Referans Datumu</label>
                  <div className="flex gap-4">
                    {['ITRF96', 'ED50'].map(d => (
                      <button key={d} onClick={() => setProjSettings({ ...projSettings, datum: d as 'ITRF96' | 'ED50' })} className={`flex-1 p-6 rounded-3xl border-2 font-bold transition-all ${projSettings.datum === d ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-lg shadow-blue-100' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                        <Layers className={`w-6 h-6 mb-2 mx-auto ${projSettings.datum === d ? 'text-blue-600' : 'text-slate-300'}`} />
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Dilim Genişliği ve Projeksiyon</label>
                  <div className="flex gap-4">
                    {[3, 6].map(w => (
                      <button key={w} onClick={() => setProjSettings({ ...projSettings, width: w as 3 | 6, type: w === 3 ? 'TM' : 'UTM' })} className={`flex-1 p-6 rounded-3xl border-2 font-bold transition-all ${projSettings.width === w ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-lg shadow-blue-100' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                        <Globe className={`w-6 h-6 mb-2 mx-auto ${projSettings.width === w ? 'text-blue-600' : 'text-slate-300'}`} />
                        {w}° Dilim ({w === 3 ? 'TM' : 'UTM'})
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Dilim Orta Meridyeni (DOM)</label>
                  <select value={projSettings.centralMeridian} onChange={e => setProjSettings({ ...projSettings, centralMeridian: Number(e.target.value) })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 font-bold outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer">
                    {[27, 30, 33, 36, 39, 42, 45].map(dom => <option key={dom} value={dom}>DOM {dom}° (Türkiye {dom === 33 ? 'Merkez' : dom === 27 ? 'Batı' : 'Doğu'})</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.csv" onChange={handleFileUpload} />
      <div className="pb-16 lg:pb-0"> {/* Add padding for ad space if needed */}
        <AdBanner />
      </div>
      <BottomNav currentMode={currentMode} onModeChange={setCurrentMode} />
    </div>
  );
};

export default App;
