/* ============================================================================
   Editorial data for the generated pages.

   Every figure and claim here already appears on the site and traces back to a
   named public source. Nothing is invented, estimated or rounded up. When a
   bulletin supersedes one of these, edit it here and rebuild. The number then
   changes on every page that uses it, and the "as of" line changes with it.
   ========================================================================= */

/* The bulletin the casualty figures come from. Change together, never apart. */
export const TOLL_AS_OF = '2026-08-27T21:00:00+05:45';
export const TOLL_SOURCE = 'Nepal Police bulletin';

/* The missing list has its own, earlier timestamp. It is deliberately kept
   separate: the newest police bulletin gives a death toll and no missing
   figure, so quoting both against one time would be wrong. */
export const MISSING_AS_OF = '2026-08-27T08:15:00+05:45';
export const MISSING_SOURCE = 'Nepal Police bulletin';

export const SITREP_AS_OF = '2026-08-27T15:00:00+05:45';
export const SITREP_SOURCE = 'UN OCHA ReliefWeb rapid situation overview, drawing on NDRRMA, Nepal Police, the Department of Roads and the Nepal Electricity Authority';
export const SITREP_SHORT = 'UN OCHA situation overview, 27 August';

export const EVENT = {
  id: 'rasuwa-flood-2026',
  name: 'Rasuwa flood',
  fullName: '2026 Rasuwa flash flood',
  started: '2026-08-26T09:00:00+05:45',
  quakeTime: '2026-08-26T08:37:00+05:45',
  status: 'active',
  districts: ['Rasuwa', 'Nuwakot', 'Dhading', 'Chitwan', 'Gorkha', 'Tanahun', 'Nawalparasi East', 'Nawalparasi West'],
  rivers: ['Bhote Koshi (Bhotekoshi)', 'Trishuli', 'Narayani'],
};

/** Bodies recovered, by the district where they were found. */
export const BODIES_BY_DISTRICT = [
  ['Chitwan', 137],
  ['Nawalparasi East', 87],
  ['Dhading', 33],
  ['Gorkha', 32],
  ['Nuwakot', 28],
  ['Tanahun', 28],
  ['Rasuwa', 17],
  ['Nawalparasi West', 27],
];

/** Who the 826 missing are, as Nepal Police break the list down. */
export const MISSING_BREAKDOWN = [
  ['Travellers (466 foreign nationals, 113 Nepalis)', 579],
  ['Rasuwa residents', 161],
  ['Nepali Army personnel', 44],
  ['Nepal Police personnel', 28],
  ['Armed Police Force personnel', 13],
  ['Nuwakot residents', 1],
];

/** Nationalities among the missing foreign travellers, where police have
    published a country count. Most were travelling toward the Kailash
    Mansarovar pilgrimage route through Tibet. */
export const MISSING_NATIONALITIES = [
  ['India', 133],
  ['Malaysia', 55],
  ['United States', 47],
  ['Australia', 34],
  ['United Kingdom', 33],
  ['Canada', 24],
];

/** Groups reported out of contact separately from the police missing list. */
export const OUT_OF_CONTACT = [
  ['Hydropower project workers', 60],
  ['Bank employees', 26],
  ['Customs officers, Rasuwa customs office at Timure', 15],
];

export const TOLL = {
  deadNepal: 389,
  deadNepalEarlier: 165,
  deadChina: 3,
  missing: 826,
  missingChina: 558,
  missingChinaForeign: 260,
  missingIndian: 133,
  injured: 466,
  rescued: 113,
  rescuedBreakdown: [
    ['Nepali citizens', 88],
    ['Indian citizens', 11],
    ['Chinese citizens', 8],
    ['Korean citizens', 4],
    ['US citizens', 2],
  ],
  narayaniRecovered: 121,
};

export const DAMAGE = {
  /* Nepal Electricity Authority count, reported through the UN OCHA overview
     of 27 August. An earlier same-day Ministry of Energy estimate put the loss
     at 431 MW, a good illustration of how fast this assessment is moving. */
  hydropowerProjects: 14,
  hydropowerMW: 748,
  hydropowerOperational: 9,
  hydropowerOperationalMW: 354,
  hydropowerUnderConstruction: 5,
  hydropowerUnderConstructionMW: 394,
  hydropowerEarlierEstimateMW: 431,
  hydropower: [
    ['Rasuwagadhi Hydropower Project', 'Rasuwa', 'Damaged. Sits on the Bhote Koshi immediately below the border crossing.'],
    ['Chilime Hydropower', 'Rasuwa', 'Damaged. One of the country’s better-known community-shareholder projects.'],
    ['Sanjen Khola Hydropower', 'Rasuwa', 'Damaged, on a Bhote Koshi tributary.'],
    ['Upper Trishuli-1', 'Rasuwa / Nuwakot', 'Damaged. One of the largest projects on the corridor.'],
    ['Upper Trishuli-3B substation', 'Nuwakot', '220 kV substation damaged, which affects evacuation of power from the whole corridor. Twelve project staff were reported out of contact.'],
    ['Trishuli Hydropower Station', 'Nuwakot', 'Damaged. One of Nepal’s oldest operating stations.'],
    ['Devighat Hydropower Station', 'Nuwakot', 'Damaged. The furthest downstream site where damage has been reported.'],
  ],
  roadDestroyedKm: 42,
  roadExtraKm: 16,
  costEstimate: 'Rs 200 billion',
  costScope: 'roads and bridges only',
  costSource: 'Physical Infrastructure and Transport Minister Sunil Lamsal, 26 August 2026, described as preliminary',
  reliefReleased: 'Rs 1 billion',
  reliefBreakdown: [
    ['Central disaster relief fund', 'Rs 1 billion'],
    ['Rasuwa district', 'Rs 10 million'],
    ['Nuwakot district', 'Rs 10 million'],
    ['Dhading district', 'Rs 5 million'],
  ],
  banksSwept: 9,
  bankStaffMissing: 26,
  customsStaffMissing: 15,
};

/** The hazard that has not passed. China's Ministry of Water Resources
    reported a new barrier lake forming upstream, inside Tibet. */
export const BARRIER_LAKE = {
  where: 'near the confluence of the Chhochen Khola and the Purepu Tsangpo, inside Tibet close to the Nepal border',
  volume: '2 million cubic metres',
  asOf: '2026-08-27T21:00:00+05:45',
  source: 'China’s Ministry of Water Resources, reported by CCTV and the Kathmandu Post',
  note: 'Both rivers are upper tributaries of the Trishuli system, so a release would run down the same corridor the 26 August flood took. The lake is already overflowing, and China’s Ministry of Water Resources says another 3 million cubic metres of water is expected to flow in over the next three days, which it says puts the lake at high risk of breaching in that window.',
};

/** The route the water took. Coordinates and elevations as used on the map. */
export const PLACES = [
  {
    id: 'source', name: 'Glacial source area, Lende Khola headwaters', country: 'China (Tibet)',
    lat: 28.4402, lng: 85.4432, elev: '~5,000 m',
    text: 'High above the Lende Khola on the Tibetan side. Satellite images reviewed by researchers suggest a mass of ice and rock broke away here first. There is no monitoring station upstream of this point on either side of the border.',
  },
  {
    id: 'landslide', name: 'Lende Khola blockage', country: 'China (Tibet)',
    lat: 28.3050, lng: 85.4020, elev: '~3,000 m',
    text: 'The ice and rock dammed the narrow valley, water built up behind the plug, and the plug then failed. That is the step that turned a landslide into a flood. About 20 km upstream of the Rasuwagadhi crossing. No rain was recorded nearby that morning.',
  },
  {
    id: 'border', name: 'Rasuwagadhi / Gyirong border crossing', country: 'Nepal-China border',
    lat: 28.2760, lng: 85.3770, elev: '~1,850 m',
    text: 'The China-Nepal crossing. The Lende Khola and the Kyirong Tsangpo meet here and become the Bhote Koshi. Customs and dry-port facilities were hit on both sides. China has confirmed three deaths near Gyirong.',
  },
  {
    id: 'timure', name: 'Timure', country: 'Rasuwa, Nepal',
    lat: 28.2350, lng: 85.3730, elev: '~1,900 m',
    text: 'A border market town, and the worst-hit settlement in Nepal. Nine bank branches and the customs post were swept away.',
  },
  {
    id: 'syabru', name: 'Syabrubesi', country: 'Rasuwa, Nepal',
    lat: 28.1620, lng: 85.3340, elev: '~1,470 m',
    text: 'Gateway town for the Langtang trek, and the point where the Bhote Koshi joins the Trishuli. The helipad was destroyed, which slowed rescue flights into the upper valley on the first day.',
  },
  {
    id: 'betrawati', name: 'Betrawati', country: 'Rasuwa / Nuwakot boundary, Nepal',
    lat: 27.9660, lng: 85.1830, elev: '~730 m',
    text: 'About 60 km downstream on the district boundary. By here the water had lost height but not force; the bridge and riverside settlements were hit.',
  },
  {
    id: 'devighat', name: 'Devighat', country: 'Nuwakot, Nepal',
    lat: 27.9050, lng: 85.1350, elev: '~460 m',
    text: 'The furthest downstream point where damage has been reported. Devighat Hydropower Station was hit. From the source area down to here is a drop of roughly 4,500 metres.',
  },
];

/** Hour-by-hour, as pieced together from police, official reports and named
    newsrooms. Times are Nepal time. */
export const TIMELINE = [
  ['08:37 NPT, 26 August', 'Seismic stations register a signal near the Nepal-Tibet border. The USGS first logs it as a magnitude 4.4 earthquake. It later revises that assessment: the signal was a magnitude 5.2 glacial collapse, not a tectonic earthquake.'],
  ['~09:00 NPT, 26 August', 'The Bhote Koshi rises suddenly where it crosses into Nepal. It was not raining in the Rasuwa catchment, so ordinary rainfall is ruled out as the cause.'],
  ['Morning, 26 August', 'Timure, Syabrubesi, the Rasuwagadhi customs and border crossing and around a dozen riverside settlements in northern Rasuwa take the earliest and heaviest impact. Nine bank branches are swept away. The Syabrubesi helipad is destroyed, slowing rescue by air.'],
  ['Through 26 August', 'The surge moves through Betrawati and Trishuli Bazar in Nuwakot, Galchhi and Dhunge Bazaar in Dhading, and past Muglin into the Narayani river system.'],
  ['Evening, 26 August', 'Counts move fast and disagree: the Prime Minister’s Office reports 95 dead, NDRRMA 72, and by late evening around 160 with 157 bodies recovered. The government releases Rs 1 billion into the disaster relief fund. Physical Infrastructure Minister Sunil Lamsal puts road and bridge damage at about Rs 200 billion, and calls the figure preliminary.'],
  ['08:15 NPT, 27 August', 'Nepal Police put the toll at 165 dead and list 826 people missing in Nepal, including 466 missing foreign travellers. Most were heading for the Kailash Mansarovar pilgrimage route through Tibet.'],
  ['Morning, 27 August', 'China’s Ministry of Water Resources reports that a new barrier lake has formed upstream inside Tibet, near the confluence of the Chhochen Khola and the Purepu Tsangpo, holding around 2 million cubic metres of water. Chinese state media warn it could break.'],
  ['13:30 NPT, 27 August', 'Nepal Police raise the toll to 270 as searches reach areas that had been cut off.'],
  ['14:30 NPT, 27 August', 'Nepal Police put the confirmed toll at 289 dead. The Armed Police Force reports 121 bodies recovered from the Narayani alone. NDRRMA reports 113 people rescued, 88 of them Nepali citizens.'],
  ['27 August, ongoing', 'The Nepal Electricity Authority puts hydropower damage at 14 projects and about 748 MW. The Department of Roads confirms the whole 42 km Betrawati-Rasuwagadhi road is destroyed at multiple points. India opens the Valmikinagar Barrage on the Gandak as a precaution and prepares to move 10,000 to 12,000 people downstream.'],
  ['11:44 NPT, 27 August', 'NDRRMA satellite imagery analysis finds a new lake, about 0.11 square kilometres, has formed on the Lhende Khola roughly 18 km upstream of the Rasuwagadhi border crossing. The authority says the natural dam it has created is of uncertain stability.'],
  ['17:00 NPT, 27 August', 'Nepal Police put the confirmed toll at 359 dead, spokesperson Abi Narayan Kafle told the Kathmandu Post. Bodies recovered by district: Chitwan 132, Nawalparasi East 82, Dhading 33, Gorkha 30, Nuwakot 28, Tanahun 22, Rasuwa 17, Nawalparasi West 15.'],
  ['Evening, 27 August', 'NDRRMA says 910 people remain out of contact, up from 826 that morning. Nepal Police have not published a matching revised missing count alongside the newer toll.'],
  ['Around noon, 27 August', "Nepal's Tourism Board issues its own situation update putting travellers missing at 644, 517 of them foreign nationals, up from the 579 travellers on the earlier Nepal Police list. Police have not issued a matching revised total."],
  ['21:00 NPT, 27 August', 'Nepal Police raise the confirmed toll to 389 dead and report 466 injured. Bodies recovered by district: Chitwan 137, Nawalparasi East 87, Dhading 33, Gorkha 32, Nuwakot 28, Tanahun 28, Rasuwa 17, Nawalparasi West 27.'],
  ['Thursday, 27 August', "China's Ministry of Water Resources warns that a barrier lake near the Chhochen Khola and Purepu Tsangpo, close to the Nepal border, is overflowing and holds about 2 million cubic metres of water. It expects another 3 million cubic metres to flow in over the next three days, putting the lake at high risk of breaching in that window."],
];

/** What the response looks like, from the UN OCHA overview of 27 August. */
export const RESPONSE = [
  ['Search and rescue', 'The Nepali Army, Armed Police Force and Nepal Police are deployed with military and private helicopters. 113 people have been rescued so far, 88 Nepali citizens and 25 foreign nationals, from Timure, Dhunche, Syabrubesi, Uttargaya and Bidur.'],
  ['Cabinet decisions', 'Free medical treatment for the injured, financial assistance to bereaved families, and orders to reopen roads, restore power and telecommunications, and provide food and shelter for the displaced.'],
  ['International assistance', 'Nepal has asked China and India for help. China has pledged relief funding; India is sending humanitarian supplies. The IFRC has released emergency funding to the Nepal Red Cross Society, which is distributing water, tarpaulins, blankets and first-aid supplies.'],
  ['Downstream precautions in India', 'Authorities in Bihar have opened the Valmikinagar Barrage on the Gandak, the same river that is called the Narayani inside Nepal, and prepared to evacuate 10,000 to 12,000 people.'],
  ['What is still not known', 'No government or humanitarian body has published a consolidated figure for people displaced, sheltering or in need. UN OCHA names that as the priority information gap for the days ahead.'],
];

/** Competing explanations, ranked by how strongly they are currently supported. */
export const CAUSES = [
  {
    rank: 'Leading explanation',
    title: 'An ice-and-rock avalanche dammed the Lhende Khola, and the dam then burst',
    text: 'Nepal’s Department of Hydrology and Meteorology and independent glaciologists, working from satellite imagery shared by Chinese counterparts through ICIMOD, put forward a preliminary hypothesis: an ice-and-rock avalanche blocked the Lhende Khola, a Bhote Koshi tributary on the Nepal-China border, roughly 20 km upstream of the Miteri Bridge. That formed a temporary debris-dammed lake, which then burst. This is described as preliminary, and no government has confirmed it.',
  },
  {
    rank: 'Reassessed',
    title: 'The 08:37 seismic signal was a glacial collapse, not an earthquake',
    text: 'The US Geological Survey initially logged a magnitude 4.4 earthquake at 08:37 local time, minutes before the flood. It has since revised that analysis and concluded the signal was in fact a magnitude 5.2 glacial collapse rather than a tectonic earthquake, based on nearby seismic stations, long-period seismic waves and satellite imagery. In other words the tremor was not a separate trigger; it was the collapse itself being recorded.',
  },
  {
    rank: 'Related hazard',
    title: 'Glacial lake drainage on the same river before',
    text: 'A broadly similar flood on the same river in July 2025 was ultimately attributed to the drainage of a supraglacial lake, meltwater pooled on the surface of a glacier. ICIMOD scientists say cascading glacial hazards of this kind are increasing at an "unprecedented" pace across the Hindu Kush Himalaya.',
  },
  {
    rank: 'Ruled out',
    title: 'Ordinary monsoon rainfall in Rasuwa',
    text: 'Meteorologists have ruled out heavy local rainfall in Rasuwa itself as the cause, while noting that satellite data showed rainfall on the Tibetan side of the border. Rainfall alone does not explain a surge of this size arriving this fast, which is what pointed investigators upstream and across the border in the first place.',
  },
];

export const EMERGENCY_NUMBERS = [
  ['100', 'Nepal Police', 'General emergency, rescue, missing persons'],
  ['112', 'Emergency, from any mobile', 'Works when you cannot recall the right number'],
  ['102', 'Ambulance', 'Medical emergency and transport'],
  ['101', 'Fire brigade', 'Fire and rescue'],
  ['103', 'Traffic Police', 'Road blockage and highway incidents'],
  ['1149', 'National Emergency Operation Centre', 'National disaster hotline (NEOC)'],
  ['1155', 'Nepal Police helpline', 'Toll-free public helpline'],
  ['1144', 'Tourist Police', 'Help for visitors and trekkers'],
];

export const DIRECTORIES = [
  ['https://neoc.gov.np/', 'National Emergency Operation Centre, contacts'],
  ['https://bipad.gov.np/', 'BIPAD portal, district emergency contacts'],
  ['https://www.nepalpolice.gov.np/index.php/contact-us', 'Nepal Police, district office directory'],
  ['https://www.nrcs.org/', 'Nepal Red Cross Society, ambulance and blood'],
  ['https://mohp.gov.np/', 'Ministry of Health, hospital directory'],
  ['https://www.aponepal.gov.np/', 'Armed Police Force Nepal, disaster response'],
  ['https://www.nepalarmy.mil.np/', 'Nepali Army, rescue coordination'],
  ['https://drrportal.gov.np/', 'Disaster Risk Reduction Portal'],
];

/** Transcribed by hand from the Prime Minister's Office graphic, 26 Aug 2026. */
export const RELIEF_BANKS = [
  ['Himalayan Bank (USD account)', ['01905631210046']],
  ['Standard Chartered Bank Nepal', ['01013243801', '02013243801']],
  ['Rastriya Banijya Bank', ['1130100003762001', '1130100000006006']],
  ['Everest Bank', ['00100105200270', '00101102200012']],
  ['Nepal Bank', ['00211600510039000003', '00200100510039000001']],
  ['Global IME Bank', ['00401010000057', '00411010000005']],
  ['Nabil Bank', ['1710017505285']],
  ['Agricultural Development Bank', ['0100201002907014']],
];

export const RELIEF_BANKS_GENERAL = [
  ['Rastriya Banijya Bank', ['1430100000025006', '1430100001164001']],
];

/** Nepal's recurring hazards. Evergreen: this outlives any single event. */
export const HAZARDS = [
  {
    slug: 'glof', colour: '#3b82f6',
    name: 'Glacial lake outburst flood (GLOF)',
    summary: 'A meltwater lake high in the mountains breaks through the loose rock and ice holding it back, and empties down the valley at once.',
    signs: 'The river suddenly rises, or suddenly stops, on a day with no rain. A roar from upstream. Water turning grey or brown.',
    todo: 'Go uphill and away from the river immediately. Not along the road. Roads follow rivers. You may have minutes, not hours.',
    exposure: 'More than 20 glacial lakes in Nepal are classified as potentially dangerous, and many more sit across the border in Tibet where Nepal has no monitoring. This is the hazard behind the 2026 Rasuwa flood.',
  },
  {
    slug: 'earthquake', colour: '#8b5cf6',
    name: 'Earthquakes',
    summary: 'India is pushing under Asia at about 2 cm a year. That strain releases as earthquakes. The 2015 Gorkha earthquake killed nearly 9,000 people.',
    signs: 'There is no reliable warning. Treat any shaking as the real thing from the first second.',
    todo: 'Drop, cover, hold on. Get under a sturdy table, away from windows. Do not run outside mid-shake. Falling masonry is the main killer.',
    exposure: 'Expect aftershocks for weeks. Avoid damaged buildings, steep slopes and riverbanks afterwards; a quake loosens both.',
  },
  {
    slug: 'landslide', colour: '#b45309',
    name: 'Landslides and debris flows',
    summary: 'Steep slopes, heavy rain and cut roads together cause a large share of Nepal’s monsoon deaths every year, usually at night and usually with no warning.',
    signs: 'New cracks in the ground or in walls. Doors and windows suddenly sticking. Tilting trees or poles. A rumbling that grows.',
    todo: 'Move sideways off the slope path, not straight downhill. If you are indoors on a slope at night in heavy rain, sleep on the uphill side of the house.',
    exposure: 'Road-cutting on steep terrain has made this worse in many districts, because the cut face is the first thing to fail.',
  },
  {
    slug: 'monsoon-flood', colour: '#0ea5e9',
    name: 'Monsoon river floods',
    summary: 'June to September brings most of Nepal’s yearly rain. In the Tarai plains rivers spread out slowly over days; in the hills they rise in hours.',
    signs: 'Rising, browning water and rain that does not stop. River gauge readings are published live on the BIPAD portal.',
    todo: 'Never walk or drive into moving water. Thirty centimetres will float a car; fifteen will knock an adult over. Turn around.',
    exposure: 'The Koshi, Karnali, Narayani, Bagmati and West Rapti basins flood most years, and cross-border embankments change where the water goes.',
  },
  {
    slug: 'fire-lightning-cold', colour: '#dc2626',
    name: 'Fire, lightning and cold waves',
    summary: 'Less talked about, still deadly. Lightning kills around 100 people a year in Nepal. Dry-season fires spread fast through village housing, and winter cold waves hit the Tarai hardest.',
    signs: 'For lightning: thunder within 30 seconds of the flash means the storm is close enough to strike you.',
    todo: 'Go inside and stay inside for 30 minutes after the last thunder. Not under a lone tree. For fire, know two ways out of a village lane, not one.',
    exposure: 'These hazards kill steadily rather than in single large events, so they attract less attention and less preparation.',
  },
];

export const RIVER_SAFETY = [
  'Know a route uphill, not along the road. Roads follow rivers, and they flood first.',
  'Loud river noise, or water rising with no rain, is the warning. Move first, ask questions later.',
  'Keep ID, cash, medicines and a torch in one bag you can grab in the dark.',
  'Pick a family meeting spot above the flood line. Phones stop working first.',
  'If you run a shop or homestay by the river, plan to lose the ground floor. Know what is load-bearing.',
  'Save the national emergency numbers into your phone now, not during the emergency.',
];

export const MISSING_STEPS = [
  'Call the nearest District Police Office, or 100. Give the full name, age, last known location, and what the person was wearing.',
  'Register the same details with the local ward office. Ward offices hold the evacuation and shelter lists, which the police list does not always include yet.',
  'If the person may have crossed into China at Rasuwagadhi, say so specifically. Cross-border checks are handled through a separate channel.',
  'Foreign nationals: contact your own country’s embassy in Kathmandu. Embassies coordinate directly with Nepal Police on foreign citizens, and the Department of Immigration holds the entry records that confirm whether someone entered the district.',
  'Keep one phone number reachable and charged. Rescue teams call back, often from an unknown number.',
  'If the person is found safe, tell the police office you registered with. An out-of-date missing list costs searcher time.',
];

/** Every outlet and dataset the site draws on, grouped by what it is used for. */
export const SOURCE_GROUPS = [
  {
    title: 'Nepali government and official bodies',
    note: 'Primary sources. Where these disagree with anything on this site, these are right.',
    links: [
      ['https://www.nepalpolice.gov.np/', 'Nepal Police', 'Daily casualty and rescue bulletins; the source of the dead, missing and rescued figures.'],
      ['https://ndrrma.gov.np/', 'NDRRMA', 'National Disaster Risk Reduction and Management Authority. Publishes the numbered Sthiti Pratibedan situation reports.'],
      ['https://bipad.gov.np/', 'BIPAD portal', 'Nepal’s official incident database and river-gauge readings. Read automatically by this site’s /api/incidents endpoint.'],
      ['https://neoc.gov.np/', 'National Emergency Operation Centre', 'Runs the 1149 disaster hotline and publishes district contacts.'],
      ['https://www.dhm.gov.np/', 'Department of Hydrology and Meteorology', 'Rainfall and river-level monitoring.'],
      ['https://seismonepal.gov.np/', 'National Seismological Centre', 'Nepal’s own earthquake records.'],
      ['https://www.opmcm.gov.np/', 'Office of the Prime Minister', 'Publishes the Prime Minister’s Natural Disaster Relief Fund account details.'],
    ],
  },
  {
    title: 'International agencies and open scientific data',
    note: 'Read automatically, on a schedule, by this site’s own server.',
    links: [
      ['https://reliefweb.int/', 'ReliefWeb (UN OCHA)', 'Humanitarian situation reporting and agency updates.'],
      ['https://www.gdacs.org/', 'GDACS', 'Global Disaster Alert and Coordination System, run by the UN and the European Commission.'],
      ['https://earthquake.usgs.gov/', 'USGS earthquake service', 'Public-domain earthquake feed, used for the live quake list.'],
      ['https://www.icimod.org/', 'ICIMOD', 'International Centre for Integrated Mountain Development. Its assessment is the basis for what this site says about the suspected cause.'],
      ['https://commons.wikimedia.org/', 'Wikimedia Commons', 'Openly licensed photographs, used with credit.'],
    ],
  },
  {
    title: 'Newsrooms read by the live feed',
    note: 'Headlines and links only. Stories are read at the source, not copied here.',
    links: [
      ['https://kathmandupost.com/', 'The Kathmandu Post', 'Nepal, English.'],
      ['https://english.onlinekhabar.com/', 'Onlinekhabar English', 'Nepal, English.'],
      ['https://www.ratopati.com/', 'Ratopati', 'Nepal, Nepali.'],
      ['https://www.setopati.com/', 'Setopati', 'Nepal, Nepali.'],
      ['https://nagariknews.nagariknetwork.com/', 'Nagarik News', 'Nepal, Nepali.'],
      ['https://www.khabarhub.com/', 'Khabarhub', 'Nepal, English and Nepali.'],
      ['https://www.aljazeera.com/', 'Al Jazeera', 'International.'],
      ['https://www.bbc.com/news/world/asia', 'BBC News Asia', 'International.'],
      ['https://www.theguardian.com/world/nepal', 'The Guardian, Nepal', 'International.'],
    ],
  },
  {
    title: 'Reporting used for the event narrative',
    note: 'Specific stories checked while writing the event pages.',
    links: [
      ['https://en.wikipedia.org/wiki/2026_Nepal_floods', 'Wikipedia, 2026 Nepal floods', 'Useful for cross-checking dates and named places against multiple citations.'],
      ['https://kathmandupost.com/national/2026/08/26/major-flood-damages-syabrubesi-hydropower-projects-in-rasuwa', 'Kathmandu Post, hydropower damage', 'Damage to the Syabrubesi-area hydropower projects.'],
      ['https://english.onlinekhabar.com/rasuwa-flood-death-toll-3.html', 'Onlinekhabar, death toll', 'Running toll and the police breakdown of the missing.'],
      ['https://www.icimod.org/press-release/major-flash-flood-sweeps-through-nepals-rasuwa-district-raising-fears-of-further-downstream-flooding', 'ICIMOD press release', 'Suspected cause and the warning about further downstream flooding.'],
      ['https://www.usnews.com/news/world/articles/2026-08-26/glacier-collapse-may-have-triggered-deadly-nepal-flash-flood-experts-say', 'Reuters, via US News', 'Expert assessment of a glacier collapse as trigger.'],
      ['https://www.aljazeera.com/gallery/2026/8/26/photos-avalanche-floods-kill-eight-hundreds-missing-in-nepals-himalayas', 'Al Jazeera photo gallery', 'Photographs from the first day.'],
    ],
  },
  {
    title: 'Map and imagery credits',
    note: 'Used under the terms each provider publishes.',
    links: [
      ['https://www.esri.com/', 'Esri World Imagery', 'Satellite basemap: Esri, Maxar, Earthstar Geographics and the GIS user community.'],
      ['https://opentopomap.org/', 'OpenTopoMap', 'Terrain basemap, CC-BY-SA.'],
      ['https://www.openstreetmap.org/copyright', 'OpenStreetMap contributors', 'Street basemap data, ODbL.'],
    ],
  },
];
