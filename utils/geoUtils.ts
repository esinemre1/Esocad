
/**
 * Haritacılık için gelişmiş koordinat dönüşüm araçları.
 * Türkiye için UTM, TM ve ED50 (Hayford) sistemlerini destekler.
 */

export interface ProjectedPoint {
  east: number;
  north: number;
  zone: number;
  meridian: number;
}

// Elipsoid Parametreleri
const GRS80 = { a: 6378137.0, f: 1 / 298.257222101 };
const HAYFORD = { a: 6378388.0, f: 1 / 297.0 };

// Türkiye için Ortalama Datum Kayıklığı (ED50 -> WGS84)
// Not: Bölgesel olarak değişebilir, burada standart Türkiye ortalaması kullanılmıştır.
const SHIFT = { dx: -84.1, dy: -102.3, dz: -129.8 };

/**
 * Datum Dönüşümü (Molodensky Basitleştirilmiş)
 * mode: 1 (WGS84 to ED50), -1 (ED50 to WGS84)
 */
function datumTransform(lat: number, lng: number, mode: 1 | -1): { lat: number, lng: number } {
  const phi = lat * (Math.PI / 180);
  const lam = lng * (Math.PI / 180);

  const a = GRS80.a;
  const f = GRS80.f;
  const da = HAYFORD.a - GRS80.a;
  const df = HAYFORD.f - GRS80.f;

  const dx = SHIFT.dx * mode;
  const dy = SHIFT.dy * mode;
  const dz = SHIFT.dz * mode;

  const b = a * (1 - f);
  const e2 = (a * a - b * b) / (a * a);

  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const sinLam = Math.sin(lam);
  const cosLam = Math.cos(lam);

  const N = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);
  const M = a * (1 - e2) / Math.pow(1 - e2 * sinPhi * sinPhi, 1.5);

  const dPhi = (-dx * sinPhi * cosLam - dy * sinPhi * sinLam + dz * cosPhi + 
                (a * df + f * da) * Math.sin(2 * phi)) / (M + 0); // h=0 varsayıldı
  
  const dLam = (-dx * sinLam + dy * cosLam) / ((N + 0) * cosPhi);

  return {
    lat: lat + (dPhi * 180 / Math.PI),
    lng: lng + (dLam * 180 / Math.PI)
  };
}

// WGS84 -> Projected (UTM/TM)
export function wgs84ToProjected(
  lat: number, 
  lng: number, 
  width: 3 | 6 = 6, 
  fixedMeridian?: number,
  datum: 'ITRF96' | 'ED50' = 'ITRF96'
): ProjectedPoint {
  
  let calcLat = lat;
  let calcLng = lng;

  // Eğer ED50 isteniyorsa önce datum dönüşümü yap
  if (datum === 'ED50') {
    const transformed = datumTransform(lat, lng, 1);
    calcLat = transformed.lat;
    calcLng = transformed.lng;
  }

  const elipsoid = datum === 'ED50' ? HAYFORD : GRS80;

  let meridian: number;
  if (fixedMeridian) {
    meridian = fixedMeridian;
  } else {
    meridian = width === 6 
      ? Math.floor(calcLng / 6) * 6 + 3 
      : Math.round(calcLng / 3) * 3;
  }

  const zone = width === 6 
    ? Math.floor((calcLng + 180) / 6) + 1 
    : meridian / 3;

  const lambda0 = meridian * (Math.PI / 180);
  const phi = calcLat * (Math.PI / 180);
  const lambda = calcLng * (Math.PI / 180);

  const a = elipsoid.a;
  const f = elipsoid.f;
  const k0 = width === 6 ? 0.9996 : 1.0; 

  const e2 = 2 * f - f * f;
  const n = f / (2 - f);
  const n2 = n * n;
  const n3 = n2 * n;
  const n4 = n2 * n2;

  const A = a / (1 + n) * (1 + n2 / 4 + n4 / 64);
  const alpha = [0, 1 / 2 * n - 2 / 3 * n2 + 5 / 16 * n3, 13 / 48 * n2 - 3 / 5 * n3, 61 / 240 * n3];

  const t = Math.sinh(Math.atanh(Math.sin(phi)) - 2 * Math.sqrt(n) / (1 + n) * Math.atanh(2 * Math.sqrt(n) / (1 + n) * Math.sin(phi)));
  const xiPrime = Math.atan(t / Math.cos(lambda - lambda0));
  const etaPrime = Math.atanh(Math.sin(lambda - lambda0) / Math.sqrt(1 + t * t));

  let xi = xiPrime;
  let eta = etaPrime;

  for (let j = 1; j <= 3; j++) {
    xi += alpha[j] * Math.sin(2 * j * xiPrime) * Math.cosh(2 * j * etaPrime);
    eta += alpha[j] * Math.cos(2 * j * xiPrime) * Math.sinh(2 * j * etaPrime);
  }

  return {
    east: k0 * A * eta + 500000,
    north: (k0 * A * xi) < 0 ? (k0 * A * xi) + 10000000 : k0 * A * xi,
    zone,
    meridian
  };
}

/**
 * Projeksiyon Koordinatlarından (Y, X) Coğrafi Koordinatlara (Lat, Lng) Ters Dönüşüm.
 */
export function projectedToWgs84(
  east: number,
  north: number,
  width: 3 | 6 = 6,
  centralMeridian: number,
  datum: 'ITRF96' | 'ED50' = 'ITRF96'
): { lat: number, lng: number } {
  const k0 = width === 6 ? 0.9996 : 1.0;
  const elipsoid = datum === 'ED50' ? HAYFORD : GRS80;
  const a = elipsoid.a;
  const f = elipsoid.f;
  const e2 = 2 * f - f * f;
  
  const x = east - 500000;
  const y = north;
  const lambda0 = centralMeridian * (Math.PI / 180);

  const M = y / k0;
  const mu = M / (a * (1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

  const phi1 = mu + (3*e1/2 - 27*e1*e1*e1/32) * Math.sin(2*mu) 
               + (21*e1*e1/16 - 55*e1*e1*e1*e1/32) * Math.sin(4*mu)
               + (151*e1*e1*e1/96) * Math.sin(6*mu);

  const C1 = (e2 / (1 - e2)) * Math.pow(Math.cos(phi1), 2);
  const T1 = Math.pow(Math.tan(phi1), 2);
  const N1 = a / Math.sqrt(1 - e2 * Math.pow(Math.sin(phi1), 2));
  const R1 = a * (1 - e2) / Math.pow(1 - e2 * Math.pow(Math.sin(phi1), 2), 1.5);
  const D = x / (N1 * k0);

  const lat = phi1 - (N1 * Math.tan(phi1) / R1) * (D*D/2 - (5 + 3*T1 + 10*C1 - 4*C1*C1 - 9*(e2/(1-e2)))*Math.pow(D, 4)/24);
  const lng = lambda0 + (D - (1 + 2*T1 + C1)*Math.pow(D, 3)/6 + (5 - 2*C1 + 28*T1 - 3*C1*C1 + 8*(e2/(1-e2)) + 24*T1*T1)*Math.pow(D, 5)/120) / Math.cos(phi1);

  const resLat = lat * (180 / Math.PI);
  const resLng = lng * (180 / Math.PI);

  // Eğer giriş ED50 ise sonucu harita için WGS84'e geri dönüştür
  if (datum === 'ED50') {
    return datumTransform(resLat, resLng, -1);
  }

  return { lat: resLat, lng: resLng };
}

export function calculateGaussArea(coords: {y: number, x: number}[]): number {
  if (coords.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const next = (i + 1) % coords.length;
    area += (coords[i].y * coords[next].x) - (coords[next].y * coords[i].x);
  }
  return Math.abs(area) / 2;
}

export function downloadTxtFile(points: any[], filename: string, width: 3 | 6, meridian?: number, datum: 'ITRF96' | 'ED50' = 'ITRF96') {
  let content = `NOKTA_ID\tAD\tY(SAĞA)\tX(YUKARI)\tZ\tSİSTEM\tDOM\tDATUM\n`;
  points.forEach((p, idx) => {
    const proj = wgs84ToProjected(p.lat, p.lng, width, meridian, datum);
    content += `${p.id}\t${p.name}\t${proj.east.toFixed(3)}\t${proj.north.toFixed(3)}\t${(p.alt || 0).toFixed(3)}\t${width === 6 ? 'UTM' : 'TM'}\t${proj.meridian}\t${datum}\n`;
  });
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadKmlFile(points: any[], filename: string) {
  let content = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>ESOCAD Points Export</name>
    <Style id="surveyPoint">
      <IconStyle>
        <color>ff0000ff</color>
        <scale>1.1</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
`;
  points.forEach(p => {
    content += `    <Placemark>
      <name>${p.name}</name>
      <styleUrl>#surveyPoint</styleUrl>
      <Point>
        <coordinates>${p.lng},${p.lat},${p.alt || 0}</coordinates>
      </Point>
    </Placemark>
`;
  });
  content += `  </Document>
</kml>`;
  
  const blob = new Blob([content], { type: 'application/vnd.google-earth.kml+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function parseSurveyFile(file: File, width: 3 | 6, meridian: number, datum: 'ITRF96' | 'ED50' = 'ITRF96'): Promise<any[]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/);
  const results = [];
  
  for (let line of lines) {
    const parts = line.trim().split(/[\t\s,]+/);
    // Beklenen format: Ad Y X [Z]
    if (parts.length >= 3) {
      const name = parts[0];
      const y = parseFloat(parts[1]);
      const x = parseFloat(parts[2]);
      const z = parts[3] ? parseFloat(parts[3]) : 0;
      
      if (!isNaN(y) && !isNaN(x)) {
        const coords = projectedToWgs84(y, x, width, meridian, datum);
        results.push({
          id: Math.random().toString(36).substr(2, 9),
          name: name,
          lat: coords.lat,
          lng: coords.lng,
          alt: z,
          timestamp: Date.now()
        });
      }
    }
  }
  return results;
}
