/* The route map on /nepal-flood/rasuwa/map/. Served as /assets/route-map.js.
   Leaflet is loaded after first paint and only once the map scrolls into
   view, so the table above it is never blocked by a 150 kB map library.
   The points come from the page's own JSON block, #route-places. */
(function(){
  var el = document.getElementById('route-map');
  if(!el) return;
  var PLACES = JSON.parse(document.getElementById('route-places').textContent);
  var started = false;
  function start(){
    if(started) return; started = true;
    var css = document.createElement('link');
    var s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    s.crossOrigin = '';
    s.onload = draw;
    s.onerror = function(){ el.innerHTML = '<p style="padding:20px;font-size:.9rem;">The map could not load. Every point it shows is in the table above.</p>'; };
    document.head.appendChild(s);
  }
  function draw(){
    if(!window.L) return;
    var map = L.map(el, { scrollWheelZoom:false, attributionControl:false });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom:18 }).addTo(map);
    var pts = [];
    PLACES.forEach(function(p, i){
      pts.push([p.la, p.lo]);
      L.circleMarker([p.la, p.lo], { radius:8, color:'#fff', weight:2, fillColor:'#dc2626', fillOpacity:1 })
        .addTo(map)
        .bindPopup('<strong>' + (i+1) + '. ' + p.n + '</strong><br>' + p.e + '<br>' + p.t);
    });
    L.polyline(pts, { color:'#dc2626', weight:3, opacity:.85 }).addTo(map);
    map.fitBounds(L.latLngBounds(pts).pad(0.18));
  }
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ io.disconnect(); start(); } }); }, { rootMargin:'300px' });
    io.observe(el);
  } else { addEventListener('load', start); }
})();
