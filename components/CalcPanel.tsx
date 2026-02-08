
import React, { useState } from 'react';
import { Calculator, Navigation, Scaling, Compass, Info, Map as MapIcon, RefreshCw } from 'lucide-react';
import { calculateGaussArea } from '../utils/geoUtils';

const CalcPanel: React.FC = () => {
  // Temel Ödev State
  const [coords, setCoords] = useState({ x1: 0, y1: 0, x2: 0, y2: 0 });
  const [result, setResult] = useState<{dist: number, azimuth: number} | null>(null);

  // Alan Hesabı State
  const [areaPoints, setAreaPoints] = useState<string>("");
  const [areaResult, setAreaResult] = useState<number | null>(null);

  // DMS Converter State
  const [dms, setDms] = useState({ d: 0, m: 0, s: 0 });
  const [ddResult, setDdResult] = useState<number | null>(null);

  const calculateBasic = () => {
    const dx = coords.x2 - coords.x1;
    const dy = coords.y2 - coords.y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    let azimuth = Math.atan2(dy, dx) * (200 / Math.PI); // Gon system
    if (azimuth < 0) azimuth += 400;

    setResult({ dist, azimuth });
  };

  const handleAreaCalc = () => {
    try {
      // Format: Y1 X1, Y2 X2, Y3 X3...
      const points = areaPoints.split('\n').filter(line => line.trim()).map(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 2) throw new Error("Hatalı format");
        return { y: parseFloat(parts[0]), x: parseFloat(parts[1]) };
      });
      const area = calculateGaussArea(points);
      setAreaResult(area);
    } catch (e) {
      alert("Lütfen her satıra 'Y X' koordinatlarını aralarında boşluk bırakarak girin.");
    }
  };

  const convertDms = () => {
    const dd = dms.d + (dms.m / 60) + (dms.s / 3600);
    setDdResult(dd);
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-50 custom-scrollbar">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-600 rounded-xl text-white">
          <Calculator className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">ESOCAD Hesap Araçları</h2>
          <p className="text-sm text-slate-500">Mühendislik ve Jeodezi Çözümleri</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* TEMEL ÖDEV HESABI */}
        <section className="space-y-4">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-600" /> 2 Nokta Arası Temel Ödev
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">P1 (Y - Sağa)</label>
                <input type="number" placeholder="Y1" onChange={e => setCoords({...coords, y1: Number(e.target.value)})} className="w-full mt-1 border border-gray-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">P1 (X - Yukarı)</label>
                <input type="number" placeholder="X1" onChange={e => setCoords({...coords, x1: Number(e.target.value)})} className="w-full mt-1 border border-gray-200 rounded-lg p-2.5 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">P2 (Y - Sağa)</label>
                <input type="number" placeholder="Y2" onChange={e => setCoords({...coords, y2: Number(e.target.value)})} className="w-full mt-1 border border-gray-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">P2 (X - Yukarı)</label>
                <input type="number" placeholder="X2" onChange={e => setCoords({...coords, x2: Number(e.target.value)})} className="w-full mt-1 border border-gray-200 rounded-lg p-2.5 text-sm" />
              </div>
            </div>
            <button onClick={calculateBasic} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all mb-4">HESAPLA</button>
            
            {result && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 p-4 rounded-xl text-white">
                  <span className="text-[10px] text-slate-400 block uppercase">Mesafe</span>
                  <span className="text-xl font-mono text-blue-400">{result.dist.toFixed(4)} m</span>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl text-white">
                  <span className="text-[10px] text-slate-400 block uppercase">Semt (Gon)</span>
                  <span className="text-xl font-mono text-emerald-400">{result.azimuth.toFixed(4)} g</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ALAN HESABI (GAUSS) */}
        <section className="space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-emerald-600" /> Gauss Alan Hesabı
            </h3>
            <p className="text-[10px] text-slate-400 mb-4 uppercase font-bold tracking-tight">Her satıra 'Y(Sağa) X(Yukarı)' değerlerini boşlukla ayırarak girin:</p>
            <textarea 
              value={areaPoints}
              onChange={e => setAreaPoints(e.target.value)}
              placeholder="500420.12 4452100.45&#10;500450.33 4452120.12&#10;500480.11 4452080.55"
              className="w-full h-32 border border-gray-200 rounded-xl p-3 text-xs font-mono mb-4 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            />
            <button onClick={handleAreaCalc} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all mb-4">ALAN HESAPLA</button>
            
            {areaResult !== null && (
              <div className="bg-emerald-950 p-5 rounded-2xl text-white flex justify-between items-center border border-emerald-500/20">
                <div>
                  <span className="text-[10px] text-emerald-400 block uppercase font-black">Toplam Alan</span>
                  <span className="text-2xl font-mono font-bold">{areaResult.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} m²</span>
                </div>
                <div className="text-right">
                   <span className="text-[10px] text-emerald-400 block uppercase font-black">Dönüm</span>
                   <span className="text-sm font-mono opacity-80">{(areaResult / 1000).toFixed(3)} daa</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* KOORDİNAT DÖNÜŞTÜRÜCÜ (DMS to DD) */}
        <section className="space-y-4">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-purple-600" /> Derece-Dakika-Saniye ➔ Ondalık
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">Derece</label>
                <input type="number" onChange={e => setDms({...dms, d: Number(e.target.value)})} className="w-full mt-1 border border-gray-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">Dakika</label>
                <input type="number" onChange={e => setDms({...dms, m: Number(e.target.value)})} className="w-full mt-1 border border-gray-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">Saniye</label>
                <input type="number" onChange={e => setDms({...dms, s: Number(e.target.value)})} className="w-full mt-1 border border-gray-200 rounded-lg p-2.5 text-sm" />
              </div>
            </div>
            <button onClick={convertDms} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-all">DÖNÜŞTÜR</button>
            {ddResult !== null && (
               <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-purple-700 uppercase">Ondalık Derece:</span>
                  <span className="text-lg font-mono font-bold text-purple-900">{ddResult.toFixed(8)}°</span>
               </div>
            )}
          </div>
        </section>

        {/* HIZLI BAĞLANTILAR */}
        <section className="space-y-4">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
             <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Compass className="w-4 h-4 text-orange-500" /> Haritacılık Kaynakları
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a href="https://parselsorgu.tkgm.gov.tr/" target="_blank" rel="noreferrer" className="p-4 bg-orange-50 rounded-xl border border-orange-100 hover:bg-orange-100 transition-all group">
                <span className="block font-bold text-orange-900 text-sm">TKGM Parsel Sorgu</span>
                <span className="text-[10px] text-orange-600 uppercase font-black">Resmi Kadastro Sorgulama</span>
              </a>
              <a href="https://tucbs-public-api.csb.gov.tr/tucbs_atlas/" target="_blank" rel="noreferrer" className="p-4 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition-all group">
                <span className="block font-bold text-blue-900 text-sm">Atlas (TUCBS)</span>
                <span className="text-[10px] text-blue-600 uppercase font-black">Coğrafi Bilgi Sistemleri</span>
              </a>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 opacity-60">
                 <span className="block font-bold text-slate-900 text-sm italic">Düşey Kurp Hesabı</span>
                 <span className="text-[10px] text-slate-400 uppercase font-black">Yakında Eklenecek</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 opacity-60">
                 <span className="block font-bold text-slate-900 text-sm italic">Hacim Kübaj</span>
                 <span className="text-[10px] text-slate-400 uppercase font-black">Yakında Eklenecek</span>
              </div>
            </div>
           </div>
        </section>
      </div>

      <div className="mt-8 p-4 bg-blue-900 rounded-2xl text-white flex items-center gap-4 border border-blue-400/20">
        <Info className="w-6 h-6 text-blue-300 shrink-0" />
        <p className="text-xs font-medium leading-relaxed">
          <b>Not:</b> Tüm hesaplamalar seçili projeksiyon sistemine (ITRF96) göre yapılmaktadır. Yer küre eğriliği ihmal edilmiş olup, lokal düzlem varsayılmıştır. Büyük alanlar için jeodezik düzeltme katsayılarını kullanmayı unutmayınız.
        </p>
      </div>
    </div>
  );
};

export default CalcPanel;
