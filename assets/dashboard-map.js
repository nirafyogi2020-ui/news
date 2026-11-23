/* Nepal Disaster Update: the Rasuwa dashboard, map code, fetched on first use. Source: src/rasuwa-dashboard.html. */
function buildFloodMap(){
  var PLACES = [
    {
      id:'source', name:'Glacial source', step:'Step 1', lat:28.4402, lng:85.4432, elev:'~5,000 m',
      colour:'#3b82f6', zoom:12, onRiver:false, shotZoom:12,
      blurb:'High above the Lende Khola, on the Tibetan side. Satellite images suggest a mass of ice and rock broke away here first.',
      facts:['Country: China (Tibet)','Elevation: about 5,000 m','Distance to the border: about 20 km','No monitoring station upstream']
    },
    {
      id:'landslide', name:'Lende Khola blockage', step:'Step 2', lat:28.3050, lng:85.4020, elev:'~3,000 m',
      colour:'#8b5cf6', zoom:13, shotZoom:14,
      blurb:'The ice and rock dammed the narrow valley. Water built up behind the plug, then the plug failed. That is what turned a landslide into a flood.',
      facts:['Suspected dam-and-release point','About 20 km from Rasuwagadhi','Identified from Planet Labs imagery','No rain recorded that morning']
    },
    {
      id:'border', name:'Rasuwagadhi border', step:'Step 3', lat:28.2760, lng:85.3770, elev:'~1,850 m',
      colour:'#dc2626', zoom:14,
      blurb:'The China-Nepal crossing. Two rivers meet here, the landslide-fed Lende Khola and the Kyirong Tsangpo, and become the Bhote Koshi. The water hit both sides at once.',
      facts:['China-Nepal border crossing','Gyirong Port on the Chinese side','Customs and dry port damaged','China confirmed 3 deaths nearby']
    },
    {
      id:'timure', name:'Timure', step:'Step 4', lat:28.2350, lng:85.3730, elev:'~1,900 m',
      colour:'#dc2626', zoom:15,
      blurb:'A border market town, and the worst-hit place in Nepal. Nine bank branches and the customs post were swept away.',
      facts:['Hit first and hardest in Nepal','9 bank branches swept away','Customs post destroyed','Rasuwa district']
    },
    {
      id:'syabru', name:'Syabrubesi', step:'Step 5', lat:28.1620, lng:85.3340, elev:'~1,470 m',
      colour:'#dc2626', zoom:15,
      blurb:'Gateway town for the Langtang trek. The Bhotekoshi meets the Trishuli here. The helipad was destroyed, which slowed rescue flights.',
      facts:['Helipad destroyed','Bhotekoshi joins the Trishuli here','Main trekking gateway to Langtang','Hydropower projects damaged']
    },
    {
      id:'betrawati', name:'Betrawati', step:'Step 6', lat:27.9660, lng:85.1830, elev:'~730 m',
      colour:'#b45309', zoom:14,
      blurb:'About 60 km downstream, on the Rasuwa-Nuwakot boundary. The water had lost height by here, not force.',
      facts:['Rasuwa / Nuwakot boundary','About 60 km downstream','Bridge and riverside settlements hit']
    },
    {
      id:'devighat', name:'Devighat', step:'Step 7', lat:27.9050, lng:85.1350, elev:'~460 m',
      colour:'#b45309', zoom:14,
      blurb:'Furthest damage reported. The hydropower station was hit. From the source down to here is a drop of about 4,500 metres.',
      facts:['Furthest downstream damage reported','Devighat Hydropower Station damaged','Nuwakot district','Total drop from source: about 4,500 m']
    }
  ];

  var ESRI_SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  var ESRI_CREDIT = 'Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS user community';

  var map = L.map('flood-map', { scrollWheelZoom: false, zoomControl: true })
             .setView([28.13, 85.29], 10);
  map.on('click', function(){ map.scrollWheelZoom.enable(); });
  map.on('mouseout', function(){ map.scrollWheelZoom.disable(); });

  var layers = {
    sat: L.tileLayer(ESRI_SAT, { maxZoom: 19, attribution: ESRI_CREDIT }),
    terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17, subdomains:'abc',
      attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Style: &copy; OpenTopoMap (CC-BY-SA)'
    }),
    street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
    })
  };
  var activeLayer = 'sat';
  layers.sat.addTo(map);

  document.getElementById('map-attrib').innerHTML =
    ESRI_CREDIT + ' &middot; terrain &copy; <a href="https://opentopomap.org/" target="_blank" rel="noopener">OpenTopoMap' + NEW_TAB_HTML + '</a> &middot; ' +
    'streets &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap' + NEW_TAB_HTML + '</a> contributors &middot; map by Leaflet.';

  document.querySelectorAll('[data-layer]').forEach(function(chip){
    chip.addEventListener('click', function(){
      var want = chip.getAttribute('data-layer');
      if(want === activeLayer) return;
      map.removeLayer(layers[activeLayer]);
      layers[want].addTo(map);
      activeLayer = want;
      document.querySelectorAll('[data-layer]').forEach(function(c){
        c.setAttribute('aria-pressed', String(c.getAttribute('data-layer') === want));
      });
      route.eachLayer(function(l){ if(l.bringToFront) l.bringToFront(); });
    });
  });

  var LENDE_PATH = [[28.43827,85.44214],[28.43694,85.44323],[28.43602,85.44329],[28.43435,85.44266],[28.43181,85.44376],[28.42999,85.44297],[28.42766,85.44295],[28.42717,85.44421],[28.42414,85.44511],[28.4232,85.44685],[28.422,85.44761],[28.42112,85.44654],[28.41937,85.44719],[28.41795,85.44697],[28.41637,85.44615],[28.41454,85.44746],[28.41361,85.44729],[28.41307,85.4478],[28.41154,85.44785],[28.40939,85.4462],[28.40754,85.4471],[28.40749,85.44778],[28.40673,85.44867],[28.39965,85.44809],[28.398,85.44991],[28.39624,85.45046],[28.39496,85.44889],[28.39228,85.44945],[28.39127,85.44862],[28.38996,85.44898],[28.3886,85.44853],[28.3855,85.44873],[28.38337,85.44806],[28.38235,85.44816],[28.38116,85.44756],[28.37475,85.44977],[28.3737,85.45068],[28.37065,85.45075],[28.36787,85.45142],[28.36559,85.45106],[28.36388,85.45126],[28.36292,85.45059],[28.36023,85.44996],[28.35972,85.44938],[28.35894,85.44957],[28.35498,85.44833],[28.35406,85.44855],[28.35131,85.4475],[28.34963,85.44638],[28.34465,85.44656],[28.34356,85.44557],[28.34042,85.44537],[28.33916,85.44428],[28.3379,85.44178],[28.3354,85.4403],[28.33479,85.437],[28.33402,85.43532],[28.33338,85.43436],[28.33169,85.43311],[28.33051,85.43089],[28.33005,85.42904],[28.33047,85.42573],[28.32959,85.42203],[28.32812,85.42005],[28.32812,85.41922],[28.3271,85.41731],[28.32738,85.41569],[28.32707,85.41519],[28.32536,85.41369],[28.32294,85.41307],[28.31798,85.41397],[28.31726,85.41446],[28.31288,85.4137],[28.30828,85.41194],[28.30758,85.4111],[28.30702,85.40915],[28.30512,85.40844],[28.30453,85.40689],[28.3015,85.40358],[28.30151,85.40273],[28.30057,85.40113],[28.29965,85.40071],[28.29814,85.39767],[28.29405,85.39709],[28.29193,85.39453],[28.29029,85.39327],[28.28936,85.39328],[28.28823,85.39226],[28.28809,85.3906],[28.28634,85.3874],[28.28417,85.38593],[28.28169,85.38141],[28.28002,85.38042],[28.27805,85.377]];
  var KYIRONG_PATH = [[28.40875,85.29027],[28.40768,85.29259],[28.40646,85.29333],[28.405,85.29547],[28.40543,85.29695],[28.40698,85.29795],[28.40728,85.29997],[28.40822,85.3007],[28.40854,85.30233],[28.40668,85.30434],[28.40331,85.30657],[28.40311,85.30794],[28.40169,85.3096],[28.40192,85.31367],[28.40046,85.31411],[28.39979,85.31375],[28.39826,85.31165],[28.3966,85.31137],[28.39606,85.31262],[28.395,85.31309],[28.39451,85.31393],[28.39299,85.31457],[28.3922,85.31677],[28.391,85.31683],[28.39013,85.31789],[28.38956,85.31885],[28.38956,85.32052],[28.38871,85.3215],[28.38919,85.32329],[28.38865,85.3244],[28.38709,85.32447],[28.38599,85.32392],[28.38532,85.32439],[28.38458,85.32342],[28.38313,85.32258],[28.3792,85.32358],[28.37699,85.32733],[28.37701,85.32857],[28.37837,85.33103],[28.37884,85.33307],[28.37695,85.33651],[28.37545,85.33813],[28.37485,85.33845],[28.37344,85.33832],[28.37223,85.33715],[28.37141,85.33508],[28.37064,85.3348],[28.37006,85.33505],[28.3691,85.33694],[28.36946,85.34088],[28.36894,85.342],[28.36809,85.34228],[28.36743,85.34348],[28.367,85.34623],[28.3673,85.34823],[28.36668,85.34902],[28.36704,85.35116],[28.36845,85.35395],[28.36822,85.35707],[28.36754,85.35777],[28.36627,85.35808],[28.36539,85.35974],[28.3649,85.35987],[28.36365,85.35898],[28.36187,85.36004],[28.3607,85.35975],[28.35993,85.35879],[28.35955,85.35641],[28.35896,85.35661],[28.35821,85.35628],[28.3534,85.35816],[28.35249,85.35774],[28.35181,85.35663],[28.35046,85.35716],[28.34971,85.35653],[28.34735,85.35579],[28.34658,85.35528],[28.34626,85.35315],[28.34387,85.351],[28.3434,85.35008],[28.34159,85.34938],[28.33941,85.3478],[28.33748,85.34775],[28.33627,85.34598],[28.33467,85.34518],[28.33435,85.34403],[28.33366,85.34354],[28.33119,85.34263],[28.32888,85.3411],[28.3282,85.34132],[28.32477,85.33966],[28.32161,85.34086],[28.31925,85.34111],[28.31894,85.34167],[28.31627,85.34291],[28.31247,85.34581],[28.31165,85.34547],[28.31101,85.34584],[28.30909,85.34552],[28.30619,85.34585],[28.30162,85.34811],[28.29872,85.3478],[28.29778,85.34842],[28.29639,85.34793],[28.29275,85.34826],[28.2913,85.34701],[28.29083,85.34701],[28.28898,85.34746],[28.28775,85.34836],[28.28743,85.3503],[28.28651,85.35184],[28.28664,85.35524],[28.28563,85.35896],[28.28577,85.36125],[28.28525,85.36191],[28.28599,85.36724],[28.28548,85.37015],[28.28435,85.37288],[28.28231,85.3759],[28.27895,85.37711],[28.27805,85.377]];
  var MAINSTEM_PATH = [[28.27805,85.377],[28.27751,85.37676],[28.27341,85.37773],[28.26985,85.37737],[28.26885,85.37633],[28.2666,85.37558],[28.26454,85.37262],[28.26307,85.37287],[28.26232,85.37262],[28.26126,85.37093],[28.25896,85.36874],[28.25794,85.36558],[28.25112,85.36464],[28.24955,85.36498],[28.24869,85.3641],[28.24657,85.36319],[28.24325,85.35865],[28.24235,85.35823],[28.23736,85.35794],[28.23669,85.3587],[28.23517,85.35901],[28.23297,85.36031],[28.22892,85.361],[28.22476,85.36117],[28.22293,85.36082],[28.21846,85.35641],[28.21602,85.35475],[28.21326,85.35485],[28.21077,85.35417],[28.20591,85.3548],[28.20374,85.35329],[28.19959,85.35248],[28.19761,85.35159],[28.19659,85.35059],[28.19421,85.34977],[28.19343,85.34913],[28.19164,85.34874],[28.18826,85.34616],[28.18622,85.3458],[28.18404,85.3441],[28.18216,85.34361],[28.18174,85.34292],[28.17994,85.3426],[28.17397,85.34298],[28.16833,85.34243],[28.16638,85.34289],[28.165,85.34219],[28.16411,85.33985],[28.16331,85.33927],[28.16245,85.33774],[28.15975,85.3374],[28.15863,85.33394],[28.15329,85.3273],[28.15198,85.32642],[28.15082,85.32421],[28.1505,85.32262],[28.14958,85.32169],[28.14902,85.32034],[28.14817,85.31983],[28.14765,85.31791],[28.14623,85.3166],[28.14506,85.31318],[28.14136,85.31261],[28.14117,85.31183],[28.14219,85.30978],[28.14066,85.30752],[28.13755,85.30469],[28.135,85.30334],[28.13451,85.30262],[28.13386,85.30261],[28.13263,85.30095],[28.1297,85.30046],[28.12834,85.2988],[28.1265,85.29754],[28.12484,85.29456],[28.12291,85.29299],[28.12219,85.29126],[28.12105,85.29054],[28.12032,85.28907],[28.11852,85.28764],[28.11622,85.28289],[28.11497,85.28268],[28.11543,85.28257],[28.11403,85.28188],[28.11112,85.27885],[28.11084,85.27756],[28.10978,85.27705],[28.10761,85.27446],[28.10686,85.27247],[28.10416,85.2709],[28.10339,85.26919],[28.10246,85.26867],[28.10237,85.26697],[28.09974,85.26438],[28.09817,85.26351],[28.0961,85.26084],[28.09503,85.25561],[28.09293,85.25147],[28.09248,85.24325],[28.09146,85.24077],[28.09121,85.23703],[28.08944,85.23188],[28.08736,85.2297],[28.08534,85.22873],[28.08258,85.2222],[28.08179,85.22155],[28.08075,85.21914],[28.07773,85.21624],[28.07498,85.21147],[28.07471,85.20985],[28.07413,85.20917],[28.0727,85.20839],[28.07029,85.20802],[28.06886,85.20536],[28.06779,85.20512],[28.06616,85.20546],[28.06414,85.20685],[28.06186,85.20775],[28.05797,85.20866],[28.05546,85.20857],[28.05222,85.20645],[28.04985,85.20283],[28.04804,85.20237],[28.04523,85.20076],[28.04139,85.19519],[28.03983,85.19391],[28.03746,85.19355],[28.03538,85.19481],[28.03309,85.19462],[28.02861,85.19214],[28.02594,85.19007],[28.02529,85.18787],[28.02434,85.18679],[28.02319,85.18621],[28.02075,85.18619],[28.01932,85.18748],[28.01625,85.18729],[28.01517,85.18563],[28.01286,85.18423],[28.01158,85.18373],[28.00831,85.18356],[28.00476,85.18427],[28.0018,85.18378],[27.99683,85.18617],[27.99313,85.1822],[27.99001,85.18286],[27.9886,85.18047],[27.98772,85.1801],[27.9844,85.18054],[27.98116,85.18038],[27.97869,85.18153],[27.97497,85.18246],[27.97211,85.18442],[27.97138,85.18434],[27.97025,85.1829],[27.96928,85.17911],[27.96852,85.17821],[27.96494,85.17626],[27.96263,85.16976],[27.95703,85.16709],[27.95484,85.16194],[27.95317,85.16255],[27.95026,85.16244],[27.94738,85.16287],[27.94542,85.1611],[27.94372,85.16017],[27.94055,85.15921],[27.9363,85.15614],[27.93404,85.15533],[27.93245,85.15524],[27.93185,85.15447],[27.93186,85.15348],[27.934,85.15105],[27.93256,85.14998],[27.92863,85.14891],[27.92727,85.15031],[27.9259,85.15102],[27.92339,85.15135],[27.92217,85.15079],[27.92068,85.14668],[27.92035,85.14311],[27.91748,85.14064],[27.91616,85.13574],[27.91561,85.13461],[27.91485,85.13409],[27.91407,85.13436],[27.91065,85.13807],[27.90924,85.13887],[27.90619,85.13947],[27.904,85.14089],[27.90211,85.14044],[27.90014,85.13683],[27.8977,85.13669],[27.89523,85.13565],[27.89349,85.13581],[27.89033,85.13708],[27.88899,85.13706],[27.88306,85.12831],[27.88143,85.12672],[27.87934,85.12576],[27.87632,85.12606],[27.87465,85.12534],[27.87303,85.12093],[27.86965,85.1144],[27.86912,85.11446],[27.86807,85.11321],[27.86197,85.11051],[27.86034,85.10774],[27.85874,85.10666],[27.85825,85.10521],[27.85816,85.10168],[27.85972,85.09783],[27.86018,85.09448]];

  var riverLayers = [
    { pts: LENDE_PATH,    colour:'#a78bfa', label:'Lende Khola (landslide-fed)' },
    { pts: KYIRONG_PATH,  colour:'#38bdf8', label:'Kyirong Tsangpo (main stem, Tibet)' },
    { pts: MAINSTEM_PATH, colour:'#0ea5e9', label:'Bhote Koshi → Trishuli (Nepal)' }
  ];
  var route = L.layerGroup().addTo(map);
  riverLayers.forEach(function(r){
    L.polyline(r.pts, { color:'#0c4a6e', weight:8, opacity:0.32, lineJoin:'round' }).addTo(route);
    L.polyline(r.pts, { color:r.colour, weight:4, opacity:0.95, className:'flood-line', lineJoin:'round' })
      .bindTooltip(r.label, { sticky:true })
      .addTo(route);
  });
  L.circleMarker([28.27805, 85.377], {
    radius:7, color:'#fff', weight:2, fillColor:'#f59e0b', fillOpacity:1
  }).bindTooltip('Confluence: Lende Khola meets Kyirong Tsangpo here, becomes Bhote Koshi below this point', { sticky:true }).addTo(route);

  var DOWNSTREAM = LENDE_PATH.concat(MAINSTEM_PATH.slice(1));

  function snap(lat, lng){
    var best = null, bestD = Infinity;
    [LENDE_PATH, KYIRONG_PATH, MAINSTEM_PATH].forEach(function(path){
      for(var i = 0; i < path.length; i++){
        var dy = path[i][0] - lat, dx = (path[i][1] - lng) * 0.88;   // rough cos(28°)
        var d = dy * dy + dx * dx;
        if(d < bestD){ bestD = d; best = path[i]; }
      }
    });
    return best || [lat, lng];
  }

  PLACES.forEach(function(place){
    if(place.onRiver === false) return;
    var at = snap(place.lat, place.lng);
    place.lat = at[0];
    place.lng = at[1];
  });

  L.polyline([[28.4402, 85.4432], LENDE_PATH[0]], {
    color:'#93c5fd', weight:2.5, opacity:0.9, dashArray:'5 6'
  }).addTo(route);

  var markers = {};
  PLACES.forEach(function(place, i){
    var big = i >= 2 && i <= 4;
    var marker = L.marker([place.lat, place.lng], {
      title: place.name,
      icon: L.divIcon({
        className: '',
        html: '<div class="pin' + (big ? ' pin-lg' : '') + '" style="background:' + place.colour + '"></div>',
        iconSize: big ? [20,20] : [16,16],
        iconAnchor: big ? [10,10] : [8,8]
      })
    }).addTo(map);

    marker.bindPopup(
      '<h4>' + place.name + '</h4>' +
      '<div class="pop-meta">' + place.step + ' &middot; ' + place.elev + '</div>' +
      '<div>' + place.blurb + '</div>' +
      '<a class="pop-btn" style="display:inline-block; text-decoration:none;" target="_blank" rel="noopener" href="https://www.google.com/maps/@' + place.lat + ',' + place.lng + ',15z/data=!3m1!1e3">Open in Google Maps' + NEW_TAB_HTML + '</a>'
    );
    marker.on('click', function(){ select(place.id, false); });
    markers[place.id] = marker;
  });

  var strip = document.getElementById('journey');
  PLACES.forEach(function(place){
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('data-place', place.id);
    b.innerHTML =
      '<span class="step">' + place.step + '</span>' +
      '<span class="name">' + place.name + '</span>' +
      '<span class="elev">' + place.elev + '</span>';
    b.addEventListener('click', function(){ select(place.id, true); });
    strip.appendChild(b);
  });

  var detail = document.getElementById('place-detail');

  function satShot(lat, lng, zoom, caption){
    var n = Math.pow(2, zoom);
    var x = (lng + 180) / 360 * n;
    var latRad = lat * Math.PI / 180;
    var y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
    var tx = Math.floor(x), ty = Math.floor(y);
    var offX = (x - tx - 0.5) * 256;
    var offY = (y - ty - 0.5) * 256;
    var imgs = '';
    for(var dy = -1; dy <= 1; dy++){
      for(var dx = -1; dx <= 1; dx++){
        imgs += '<img loading="lazy" alt="" referrerpolicy="no-referrer" src="' +
          ESRI_SAT.replace('{z}', zoom).replace('{y}', ty + dy).replace('{x}', tx + dx) + '">';
      }
    }
    return '<div class="sat-shot">' +
      '<div class="tiles" style="transform:translate(' + (-offX) + 'px,' + (-offY) + 'px)">' + imgs + '</div>' +
      '<span class="cross"></span>' +
      '<span class="tag">' + caption + '</span>' +
    '</div>';
  }

  function select(id, fly){
    var place = PLACES.filter(function(p){ return p.id === id; })[0];
    if(!place) return;

    document.querySelectorAll('[data-place]').forEach(function(b){
      b.classList.toggle('is-active', b.getAttribute('data-place') === id);
    });

    detail.innerHTML =
      '<div><h4>' + place.name + '</h4><p>' + place.blurb + '</p>' +
        satShot(place.lat, place.lng, place.shotZoom || 15, place.name + ' from above') +
      '</div>' +
      '<div class="place-facts">' + place.facts.map(function(f){
        var parts = f.split(': ');
        return parts.length > 1 ? '<span>' + parts[0] + ': <b>' + parts.slice(1).join(': ') + '</b></span>' : '<span>' + f + '</span>';
      }).join('') +
      '<a class="chip" style="margin-top:6px; display:inline-block; text-decoration:none;" target="_blank" rel="noopener" href="https://www.google.com/maps/@' + place.lat + ',' + place.lng + ',15z/data=!3m1!1e3">Open in Google Maps' + NEW_TAB_HTML + '</a></div>';

    if(fly){
      map.flyTo([place.lat, place.lng], place.zoom, { duration: 1.1 });
      markers[id].openPopup();
    }
  }

  var playBtn   = document.getElementById('play-route');
  var playLabel = document.getElementById('play-label');
  var playTimer = 0;
  var playing   = false;
  var head = null, trace = null;

  var PLAY_SECONDS = 15;

  function clearPlay(){
    if(playTimer) cancelAnimationFrame(playTimer);
    playTimer = 0;
    if(head){ map.removeLayer(head); head = null; }
    if(trace){ map.removeLayer(trace); trace = null; }
  }

  function stopPlay(){
    playing = false;
    clearPlay();
    playBtn.setAttribute('aria-pressed', 'false');
    playLabel.textContent = 'Play the flood path';
    playBtn.querySelector('svg').innerHTML = '<path d="M8 5v14l11-7z"></path>';
  }

  function startPlay(){
    playing = true;
    playBtn.setAttribute('aria-pressed', 'true');
    playLabel.textContent = 'Stop';
    playBtn.querySelector('svg').innerHTML = '<path d="M6.5 6h11v12h-11z"></path>';

    clearPlay();
    trace = L.polyline([DOWNSTREAM[0]], {
      color:'#f59e0b', weight:6, opacity:0.95, lineJoin:'round', lineCap:'round'
    }).addTo(map);
    head = L.circleMarker(DOWNSTREAM[0], {
      radius:8, color:'#fff', weight:2.5, fillColor:'#f59e0b', fillOpacity:1
    }).addTo(map);

    map.flyTo(DOWNSTREAM[0], 12, { duration: 1.2 });

    var t0 = 0;
    var lastPan = 0;
    var lastStop = -1;

    function frame(now){
      if(!playing) return;
      if(!t0) t0 = now;
      var pct = Math.min(1, (now - t0) / (PLAY_SECONDS * 1000));
      var idx = Math.floor(pct * (DOWNSTREAM.length - 1));
      var at = DOWNSTREAM[idx];

      trace.setLatLngs(DOWNSTREAM.slice(0, idx + 1));
      head.setLatLng(at);

      // pan with the water rather than on every frame, or the map fights itself
      if(now - lastPan > 900){
        lastPan = now;
        map.panTo(at, { animate:true, duration:0.9, noMoveStart:true });
      }

      // light up the stop the water has just passed
      for(var i = 0; i < PLACES.length; i++){
        var dy = PLACES[i].lat - at[0], dx = (PLACES[i].lng - at[1]) * 0.88;
        if(dy * dy + dx * dx < 0.0000045 && lastStop !== i){
          lastStop = i;
          select(PLACES[i].id, false);
          break;
        }
      }

      if(pct >= 1){ stopPlay(); return; }
      playTimer = requestAnimationFrame(frame);
    }
    playTimer = requestAnimationFrame(frame);
  }

  playBtn.addEventListener('click', function(){
    if(playing) stopPlay(); else startPlay();
  });

  Tabs.onChange(function(name){ if(name !== 'map' && playing) stopPlay(); });

  select('border', false);
  var CORRIDOR = L.latLngBounds(DOWNSTREAM).pad(0.06);
  map.fitBounds(CORRIDOR);
  Tabs.onChange(function(name){
    if(name !== 'map') return;
    setTimeout(function(){ map.invalidateSize(); if(!playing) map.fitBounds(CORRIDOR); }, 60);
  });

  return {
    flyTo: function(id){ select(id, true); }
  };
}
