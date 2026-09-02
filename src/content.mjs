/* ============================================================================
   Editorial data for the generated pages.

   Every figure and claim here already appears on the site and traces back to a
   named public source. Nothing is invented, estimated or rounded up. When a
   bulletin supersedes one of these, edit it here and rebuild. The number then
   changes on every page that uses it, and the "as of" line changes with it.
   ========================================================================= */

/* The bulletin the casualty figures come from. Change together, never apart. */
export const TOLL_AS_OF = '2026-09-02T16:14:39+05:45';
export const TOLL_SOURCE = 'Onlinekhabar';
export const TOLL_EARLIER_SOURCE = 'Nepal Police bulletin 10275, 2pm Sunday';

/* When the bulletin one step before TOLL_AS_OF was published. Used only for
   the "how the toll has moved" table, so that row's timestamp always matches
   TOLL.deadNepalEarlier instead of drifting out of date as later runs move
   both TOLL_AS_OF and deadNepalEarlier forward. */
export const TOLL_EARLIER_AS_OF = '2026-08-30T14:00:00+05:45';

/* The district breakdown now comes from the same 2pm police bulletin as the
   national toll. */
export const BODIES_AS_OF = '2026-09-02T16:14:39+05:45';
export const BODIES_SOURCE = 'Onlinekhabar';

/* NDRRMA's 1pm Sunday update reports the current missing total. Its detailed
   group breakdown is older and remains separately timestamped below. */
export const MISSING_AS_OF = '2026-09-02T12:00:00+05:45';
export const MISSING_SOURCE = 'Nepal Police';

export const RESCUE_AS_OF = '2026-08-30T13:00:00+05:45';
export const RESCUE_SOURCE = 'NDRRMA 1pm Sunday situation update, reported by Onlinekhabar';

/* Who those people are was last broken down in the morning police bulletin,
   when the list stood at 826. The groups below still describe that list. */
export const MISSING_BREAKDOWN_AS_OF = '2026-08-27T08:15:00+05:45';
export const MISSING_BREAKDOWN_TOTAL = 826;

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
  ['Chitwan', 264],
  ['Nawalparasi East', 194],
  ['Nawalparasi West', 100],
  ['Gorkha', 58],
  ['Nuwakot', 52],
  ['Dhading', 50],
  ['Tanahun', 37],
  ['Rasuwa', 13],
];

/** Who the 826 on the morning list were, as Nepal Police broke it down. */
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
  deadNepal: 1114,
  deadNepalEarlier: 768,
  deadChina: 16,
  missing: 5015,
  missingChina: 546,
  missingChinaForeign: 261,
  missingIndian: 133,
  injured: 242,
  rescued: 8730,
  rescuedBreakdown: [],
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
    ['Upper Trishuli-3B substation', 'Nuwakot', '220 kV substation damaged, which affects evacuation of power from the whole corridor. Twelve project staff were reported out of contact. The Ministry of Energy said Friday the project camp area is now completely buried under landslide debris, and rescue there is continuing.'],
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
  volume: '2.5 million cubic metres',
  asOf: '2026-08-29T20:54:29+05:45',
  source: 'Department of Hydrology and Meteorology and water experts, reported by Onlinekhabar',
  note: 'The Nepali Army suspended rescue operations along the border for one and a half hours as a precaution while Chinese teams pulled back a kilometre from the site. The Kathmandu Post reported early Friday afternoon that the lake had breached; NDRRMA said water levels in the Bhotekoshi surged as a result, and helicopters carried out aerial reconnaissance over Rasuwa to check the impact downstream. Chinese state media said Friday afternoon that rescue operations in Tibet had resumed after water levels at the lake dropped slightly, then reported a new glacial slip sent about 50,000 cubic metres of ice and debris into the same lake on Friday evening, ABC News reports. The lake grew from about 2 million cubic metres on Thursday morning to about 2.5 million cubic metres by Friday evening. China had earlier warned that some 3 million more cubic metres of water was expected to flow in over three days, with peak flow expected around 1 September, ABC News reports. On Saturday evening, the Department of Hydrology and Meteorology said the immediate risk of a sudden lake burst had decreased after water began flowing out naturally. Onlinekhabar reported experts warning that fresh landslides could still trigger renewed flooding, so people downstream should remain cautious. Both rivers are upper tributaries of the Trishuli system, so the water is running down the same corridor the 26 August flood took.',
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
  ['Thursday evening, 27 August', 'Nepal turns down offers of search and rescue teams from India, China, the US, Britain, Japan, South Korea, Sri Lanka and Bangladesh, the Kathmandu Post reports, saying its own army and police can handle the operation and asking instead for cash through the Prime Minister’s Disaster Relief Fund. The finance ministry says the fund took in Rs 273.3 million in its first six hours.'],
  ['Early afternoon, 28 August', 'The Kathmandu Post reports the barrier lake near the Chhochen Khola and Purepu Tsangpo has breached. NDRRMA says water levels in the Bhotekoshi surged as a result, and helicopters carry out aerial reconnaissance over Rasuwa to assess the damage downstream.'],
  ['12:00 NPT, 28 August', 'Nepal Police restate a fuller district breakdown alongside the 489 toll: Chitwan 186, Nawalparasi East 112, Gorkha 44, Dhading 40, Nuwakot 37, Tanahun 29, Nawalparasi West 28, Rasuwa 13, which adds up to 489.'],
  ['Friday afternoon, 28 August', 'Chinese state media report rescue operations in Tibet have resumed after water levels at the barrier lake dropped slightly, ABC News reports. NDRRMA separately tells ABC News that 3,253 people have now been rescued by helicopter across the flood zone. ABC News, citing Nepal Police, reports the toll again at 489, unchanged since the midday bulletin.'],
  ['Friday evening, 28 August', "China's state media report a new glacial slip in the Himalayan border region, sending about 50,000 cubic metres of ice and debris into the barrier lake, ABC News reports. The Nepali Army says its helicopters have rescued 706 people, including 40 foreign nationals, as of 3pm, Onlinekhabar reports."],
  ['15:52 NPT, 28 August', 'The Kathmandu Post reports that Nepal’s government has not confirmed a dam or lake collapse on the China side. Government spokesperson and Education Minister Sasmit Pokharel says Nepal has only received word that glaciers broke and sent water mixed with debris over the top, not that a dam failed, and that China has indicated there is no immediate major threat. The two accounts, a reported breach and the government’s more cautious version, have not been reconciled.'],
  ['16:06 NPT, 28 August', "NDRRMA raises the confirmed toll to 538 and repeats its missing count of 977, unchanged, ABC News reports."],
  ['16:23 NPT, 28 August', 'Nepal Police raise the confirmed toll further, to 547, and report 1,473 people injured in Nepal, up from 466 a day earlier, ABC News reports. The higher police figure comes within minutes of NDRRMA’s 538.'],
  ['Friday, 28 August', "China's state media raise the Tibet side death toll to 5, from 3, ABC News reports. The missing count on the China side holds at 558."],
  ['Friday afternoon, 28 August', 'The Ministry of Energy, Water Resources and Irrigation says the camp area of the Upper Trishuli-3B hydropower project in Nuwakot has been completely buried under landslide debris. It says rescuing people there is the top priority and that rescue equipment has been flown in, Onlinekhabar reports.'],
  ['Friday evening, 28 August', "ABC News reports the barrier lake has grown rather than drained: China's Ministry of Water Resources put it at about 2 million cubic metres on Thursday morning, and by Friday evening it had grown to about 2.5 million cubic metres, with more water still forecast to flow in over the weekend."],
  ['17:00 NPT, 28 August', 'Nepal Police raise the confirmed toll to 553 in a Friday evening bulletin posted on the force’s own website, with a district breakdown that sums to the new total: Chitwan 222, Nawalparasi East 134, Gorkha 47, Dhading 40, Nuwakot 38, Tanahun 31, Nawalparasi West 28, Rasuwa 13.'],
  ['19:14 NPT, 28 August', 'The Prithvi Highway partly reopens: the Galchhi stretch to alternating one way traffic and the Galaundi-Ghatbesi-Jarekhet stretch to two way traffic, the Kathmandu Post reports. Officials say they cannot guarantee the whole highway will be clear by the end of Friday.'],
  ['Friday evening, 28 August', 'David Fisher, head of delegation for the International Federation of Red Cross and Red Crescent Societies in Nepal, says at least 93,000 people have been affected by the flood and are in great need.'],
  ['20:55 NPT, 28 August', 'In a reversal, Nepal says it will let India, China, Australia and South Korea send in tunnel rescue and DNA identification experts, the Kathmandu Post reports. Nepal had said as recently as Wednesday and Thursday that its own army and police could handle the operation without outside rescue teams.'],
  ['Friday, 28 August', 'Water resources researcher Santosh Nepal tells Onlinekhabar that satellite images suggest a huge ice and rock fall off Langtang Lirung, not a glacial lake bursting, may have generated the flood directly by melting snow and ice on impact. He says it is too early to be sure and compares the mechanism to the 2021 Chamoli disaster in Uttarakhand.'],
  ['06:00 NPT, 29 August', 'Nepal Police raise the confirmed toll to 616 bodies found, in a bulletin posted on the force’s own website, up from 553 in Friday’s 5pm bulletin. The new district breakdown: Chitwan 233, Nawalparasi East 158, Gorkha 48, Nawalparasi West 47, Dhading 45, Nuwakot 41, Tanahun 31, Rasuwa 13.'],
  ['16:00 NPT, 29 August', 'Nepal Police report 669 bodies recovered and 2,301 people rescued. Nepal News reports the district count as Chitwan 248, Nawalparasi East 158, Nawalparasi West 75, Gorkha 54, Dhading 49, Nuwakot 41, Tanahun 31 and Rasuwa 13.'],
  ['19:47 NPT, 29 August', 'The Independent Power Producers’ Association, Nepal says 898 people remain unaccounted for at 11 affected hydropower projects in Rasuwa and Nuwakot. Onlinekhabar reports that 361 people have been evacuated, around 300 are believed trapped in the Upper Trishuli-1 tunnel, and Chinese experts have arrived to help with tunnel rescue.'],
  ['20:54 NPT, 29 August', 'The Department of Hydrology and Meteorology says the immediate risk of a sudden lake burst has decreased after water began flowing out naturally. Onlinekhabar reports experts warning that fresh landslides could still trigger renewed flooding.'],
  ['21:04 NPT, 29 August', 'Prime Minister Balen Shah says Rs 5.04 billion has been deposited in nine commercial bank accounts for flood rescue and relief, with another US$1.8 million deposited at two banks, Onlinekhabar reports.'],
  ['09:00 NPT, 30 August', 'NDRRMA reports 734 bodies and human remains recovered, 2,498 people missing, 242 injured or discharged, and 8,186 people rescued. The district body count is Chitwan 259, Nawalparasi East 184, Nawalparasi West 82, Gorkha 58, Nuwakot 52, Dhading 50, Tanahun 36 and Rasuwa 13. The rescue total breaks down to 2,974 by the Nepali Army, 2,699 by Nepal Police and 2,513 by the Armed Police Force, Onlinekhabar and the Kathmandu Post report.'],
  ['11:00 NPT, 30 August', 'Nepal Police bulletin 10274 reports 735 bodies found in Nepal. The district count is Chitwan 259, Nawalparasi East 184, Nawalparasi West 82, Gorkha 58, Nuwakot 52, Dhading 50, Tanahun 37 and Rasuwa 13, which adds to 735.'],
  ['13:00 NPT, 30 August', 'NDRRMA reports 752 bodies found in Nepal, 2,502 people out of contact and 8,730 people rescued in its 1pm Sunday situation update, Onlinekhabar reports. The district count is Chitwan 259, Nawalparasi East 184, Nawalparasi West 100, Gorkha 58, Nuwakot 52, Dhading 50, Tanahun 36 and Rasuwa 13, which adds to 752. The report does not publish a current rescue agency or location breakdown.'],
  ['14:00 NPT, 30 August', 'Nepal Police bulletin 10275 reports 768 bodies found in Nepal. The district count is Chitwan 264, Nawalparasi East 194, Nawalparasi West 100, Gorkha 58, Nuwakot 52, Dhading 50, Tanahun 37 and Rasuwa 13, which adds to 768.'],
  ['16:14 NPT, 2 September', "Nepal's confirmed death toll is reported at 1,114, up from 768, by Onlinekhabar."],
];

/** What the response looks like, from the UN OCHA overview of 27 August. */
export const RESPONSE = [
  ['Search and rescue', 'NDRRMA reported 8,730 people rescued in its 1pm Sunday situation update, Onlinekhabar reported. The latest report does not publish a current agency or location breakdown, so this site does not infer one.'],
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
    rank: 'Newly proposed',
    title: 'An ice and rock fall off Langtang Lirung may have generated the flood directly, without a lake bursting',
    text: 'Santosh Nepal, a water resources and climate change researcher, told Onlinekhabar on Friday that satellite images point to a large mass of ice, snow and rock falling from about 5,000 to 5,500 metres on Langtang Lirung’s northern slope and dropping nearly 2,000 metres into the Lhende Khola. He said the impact’s energy may have rapidly melted snow and ice, sending a sudden surge of water downstream without a lake first forming and bursting. He compared the mechanism to Uttarakhand’s 2021 Chamoli disaster, and said it is too early to conclude what happened without more satellite data and a field investigation. This is one researcher’s preliminary reading, not a government or ICIMOD finding.',
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
/**
 * The government's own online donation gateway, opened on 27 August 2026 for
 * donors outside Nepal who have a card rather than a Nepali bank account.
 * Run by Nepal Clearing House (which also runs connectIPS) for the Office of
 * the Prime Minister, and linked by the Office of the Prime Minister itself,
 * which is the only reason it is printed here: an unverified payment link on
 * a disaster page is how people get robbed.
 */
export const RELIEF_PORTAL = {
  url: 'https://pmdrf.nchl.com.np/',
  host: 'pmdrf.nchl.com.np',
  operator: 'Nepal Clearing House, for the Office of the Prime Minister',
  opened: '27 August 2026',
  methods: 'International and Nepali cards, NepalPay QR, connectIPS, mobile banking and wallets',
  currency: 'Charged in Nepali rupees, so your bank converts at its own rate.',
  confirmedBy: [
    ['Office of the Prime Minister, on its own page', 'https://www.facebook.com/OPMCMNP/posts/994255970306111/'],
    ['Republica', 'https://myrepublica.nagariknetwork.com/news/govt-launches-new-portal-to-accept-disaster-relief-donations-from-abroad-84-26.html'],
  ],
};

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

/* ---------------------------------------------------------------------------
   Hazard detail pages.

   /nepal-disasters/ is the hub and keeps the short version of each hazard.
   Each hazard also has its own page, and the long copy lives here so the hub
   and the page cannot say the same thing twice. Duplicated text across two
   URLs helps nobody: the reader gets no more, and a search engine has to pick
   one of them anyway.
   ------------------------------------------------------------------------- */
export const HAZARD_PAGES = {
  glof: {
    title: 'Glacial Lake Outburst Flood (GLOF) in Nepal: What It Is and What to Do',
    description: 'What a glacial lake outburst flood is, why Nepal gets them, the warning signs that come minutes before the water, and what to do when the river rises on a dry day.',
    h1: 'Glacial lake outburst floods in Nepal',
    lede: 'The hazard behind the 2026 Rasuwa flood. A lake that nobody lives near empties in an afternoon and kills people fifty kilometres downstream.',
    long: [
      'A glacier melts. The meltwater collects behind the loose rock and dead ice the glacier left when it retreated. That rubble is not a dam. Nobody built it and nothing holds it together but friction, and it sits at the top of a valley with a river running out of the bottom of it.',
      'Sooner or later something disturbs it. An ice avalanche falls into the lake and pushes a wave over the rim. A rock slope collapses and blocks the river instead, ponds a new lake in hours, and then that gives way. Warm weeks melt the ice core out of the rubble and the wall slumps. In every version the ending is the same: the whole lake leaves at once.',
      'What comes down the valley is not water. It is water carrying boulders, gravel, trees and everything the flood has already destroyed, moving fast enough to take out a concrete bridge. That is why a glacial flood can be far more destructive than a monsoon flood carrying the same volume of water.',
      'Nepal is unusually exposed to this. Its rivers start in ice, its valleys are steep, and its settlements, roads, border crossings and hydropower plants are all built along the river because in that terrain there is nowhere else flat. More than twenty glacial lakes inside Nepal are classified as potentially dangerous. Many more sit across the border in Tibet, on rivers that flow into Nepal, where Nepal has no gauges and no sirens and depends on Chinese authorities passing a warning on.',
      'The warning time is the whole problem. From a lake bursting to the water arriving can be under an hour. In the 2026 Rasuwa flood most of the river gauges that existed downstream were destroyed by the first wave, so any second surge would arrive with even less notice than the first.',
    ],
    signsLong: [
      'The river rises fast on a day with no rain where you are. Rain upstream, or none at all, does not matter; the water is coming from ice.',
      'The river suddenly drops or stops. That means something upstream is holding it back, and whatever is holding it back will fail.',
      'A roar or a rumble from upstream that keeps growing. People who have survived one describe it as sounding like a jet, not like water.',
      'The water turns grey, brown or black and starts carrying wood and rubbish.',
    ],
    todoLong: [
      'Go uphill, straight away, and keep going past where you think is far enough. Height beats distance.',
      'Do not go along the road. Roads follow rivers, which is exactly where the water goes.',
      'Do not go back for belongings, animals or a vehicle. The first wave is rarely the biggest.',
      'Do not stand on a bridge to watch. Bridges are the first thing to go.',
      'Once you are high and safe, stay there until officials say it is over, not until the river looks calm.',
    ],
    faq: [
      ['Is a glacial lake outburst flood caused by an earthquake?',
       'Usually not. Shaking can trigger the rock or ice fall that starts one, and a seismic station will record the collapse itself, which is why these events are sometimes first reported as earthquakes and corrected later. That is exactly what happened in Rasuwa in August 2026, where the US Geological Survey first logged an earthquake and then reassessed the signal as a glacial collapse.'],
      ['How much warning is there?',
       'Sometimes an hour, often less. Where the lake is across an international border there may be none at all until the river itself tells you.'],
      ['Are they getting more common?',
       'Yes. Himalayan ice is melting faster than it is replaced, so there are more lakes, they are bigger, and the rubble holding them back is weaker. ICIMOD, the regional research centre for the Hindu Kush Himalaya, describes cascading glacial hazards as increasing at an unprecedented pace.'],
      ['Can they be predicted?',
       'Individual lakes can be monitored by satellite and some have sensors and sirens. Predicting the day one bursts is not currently possible. Lowering a dangerous lake by draining part of it has been done in Nepal, at Tsho Rolpa, and it is slow and expensive.'],
    ],
  },
  earthquake: {
    title: 'Earthquakes in Nepal: Why They Happen and What to Do in the First Minute',
    description: 'Why Nepal has large earthquakes, what to do during the shaking, what to do in the hours after it stops, and which risks come next: aftershocks, landslides and damaged buildings.',
    h1: 'Earthquakes in Nepal',
    lede: 'The Indian plate is pushing under Asia and the Himalaya is what that collision looks like. The shaking is the strain being released.',
    long: [
      'India moves north into Asia at roughly two centimetres a year. The rock does not slide smoothly. It locks, strain builds for decades or centuries, and then a section releases in seconds. That release is an earthquake, and the mountains above it exist because this has been going on for tens of millions of years.',
      'The 2015 Gorkha earthquake killed nearly nine thousand people and destroyed or damaged hundreds of thousands of buildings. Seismologists are clear that it did not release all the accumulated strain along the Himalayan front, and that western Nepal in particular has not had a great earthquake in a very long time.',
      'Most people are not killed by the ground moving. They are killed by what the ground moving brings down: unreinforced masonry walls, heavy roofs on weak columns, parapets, water tanks and the outsides of buildings falling into the street people have just run into.',
      'The hours after a large quake carry their own hazards. Aftershocks continue for weeks and can bring down buildings that survived the main shock. Slopes loosened by the shaking fail in the next rain, sometimes months later. Rivers get blocked by landslides and then break through.',
    ],
    signsLong: [
      'There is no reliable warning before an earthquake. Treat any shaking as the real thing from the first second rather than waiting to see if it grows.',
      'Some people feel or hear a low rumble a second or two before the strong shaking. That is not enough time to leave a building. It is enough time to get under something.',
    ],
    todoLong: [
      'Drop, cover and hold on. Get under a sturdy table or against an interior wall, away from windows and away from anything heavy that can fall on you.',
      'Do not run outside during the shaking. The street next to a building is one of the more dangerous places to be.',
      'If you are in bed, stay there and protect your head with a pillow, unless there is something heavy directly above you.',
      'If you are outdoors, get into an open space away from buildings, walls and power lines and stay there.',
      'After it stops: check for injuries, turn off gas if you smell it, expect aftershocks, and stay out of damaged buildings even if they look standing.',
      'Avoid steep slopes and riverbanks for days afterwards. Shaking loosens both.',
    ],
    faq: [
      ['Is it safe to go back into my house after an earthquake?',
       'Not until someone competent has looked at it. Cracks through structural walls, a leaning frame, or a floor that has dropped at one end all mean stay out. Aftershocks finish off buildings that the first shock only weakened.'],
      ['How long do aftershocks last?',
       'Weeks to months after a large earthquake, getting less frequent but not stopping neatly. A large aftershock is possible days later.'],
      ['Does a small earthquake release pressure and prevent a big one?',
       'No. The energy scale is such that it would take an enormous number of small earthquakes to release the strain of one large one.'],
    ],
  },
  landslide: {
    title: 'Landslides in Nepal: Warning Signs, What to Do, and Why Roads Make It Worse',
    description: 'Landslides and debris flows kill more people in Nepal in a normal year than any single large disaster. The warning signs, what to do at night in heavy rain, and why cut roads fail first.',
    h1: 'Landslides and debris flows in Nepal',
    lede: 'The hazard that kills quietly, a few houses at a time, usually at night, usually in the monsoon, and almost always with no warning at all.',
    long: [
      'Nepal loses people to landslides every monsoon. They rarely make international news because each one takes a household or a hamlet rather than a town, but added together across a season they are one of the country’s largest causes of disaster deaths.',
      'The mechanism is simple. Rain soaks into a steep slope. Water fills the spaces between soil particles, the friction holding the slope up drops, and a slab of hillside moves. On a slope with a stream in it the moving mass turns into a debris flow, which behaves like wet concrete travelling at the speed of a car and destroys anything in the channel.',
      'Road building has made this worse across much of the hills. A road cut into a steep slope leaves a vertical face with nothing supporting it, and the spoil is usually pushed over the downhill side onto the slope below. Both the cut and the spoil fail in the first heavy monsoon. Many landslides in Nepal now start at a road.',
      'Most landslide deaths happen between midnight and dawn, when it has been raining for hours and everyone is asleep indoors on a slope. That is why the practical advice is about where you sleep, not about what you do when you see one coming.',
    ],
    signsLong: [
      'New cracks in the ground, in a yard, or in the walls of a house, especially cracks that widen over days.',
      'Doors and windows that suddenly stick, or a floor that has started to slope.',
      'Trees, poles or fence posts leaning downhill when they did not before.',
      'Water appearing where it never has, or a spring going dry.',
      'A rumbling that grows louder. If you hear that, you have seconds.',
    ],
    todoLong: [
      'Move sideways off the path of the slope, across the hill, not straight downhill. You cannot outrun a debris flow going down its own channel.',
      'If you are indoors on a slope at night during prolonged heavy rain, sleep on the uphill side of the house, or move the household to a neighbour on flatter ground.',
      'Do not shelter in a gully, a stream bed or below a fresh road cut.',
      'After a landslide, do not walk onto the debris to look or to help until it has been assessed. Slides usually come in more than one movement.',
      'If a landslide has blocked a river, get downstream residents warned. A blocked river forms a lake and that lake will break.',
    ],
    faq: [
      ['When are landslides most likely?',
       'During and immediately after prolonged heavy rain, so mostly June to September, and disproportionately at night.'],
      ['Is a slope that has already slipped safer now?',
       'No. Ground that has moved once has lost strength and often moves again in the same season.'],
      ['What is a debris flow?',
       'A landslide that has picked up enough water to flow rather than slide. It travels much further and much faster than a dry slide and follows stream channels, which is why building in a gully mouth is dangerous even well away from the hill.'],
    ],
  },
  'monsoon-flood': {
    title: 'Monsoon Floods in Nepal: The Rivers, the Season and What to Do',
    description: 'Nepal’s monsoon runs June to September and brings most of the year’s rain. How hill floods and Tarai floods differ, which basins flood most years, and the rules that keep people alive.',
    h1: 'Monsoon river floods in Nepal',
    lede: 'The predictable disaster. It happens every year, in roughly the same places, and still kills people who drove into it.',
    long: [
      'Between June and September Nepal gets around eighty per cent of its annual rainfall. Rivers that are shallow and clear in April run brown, wide and fast, and they do it every year.',
      'Two different floods share the name. In the hills, rain falls on steep ground and reaches the river in hours, so a hill river rises fast, does its damage and drops again within a day. In the Tarai plains the same water arrives slowly, spreads out over a wide flat landscape, and can sit on farmland and in villages for days. Preparing for one is not preparing for the other.',
      'The basins that flood most years are the Koshi, the Karnali, the Narayani, the Bagmati and the West Rapti. Embankments, barrages and road embankments on both sides of the border change where the water goes rather than removing it, which is why a village that never used to flood sometimes starts to.',
      'Nepal does publish live river levels. The BIPAD portal run by the National Disaster Risk Reduction and Management Authority carries gauge readings and warning levels, and the Department of Hydrology and Meteorology issues forecasts and bulletins. Both are worth knowing about before the water is at the door.',
    ],
    signsLong: [
      'Rain that has continued for many hours rather than heavy rain for a short time.',
      'The river browning and rising, and carrying wood.',
      'A gauge reading crossing its warning level on the BIPAD portal for your river.',
      'Water backing up in drains and coming up rather than going down.',
    ],
    todoLong: [
      'Never walk or drive into moving water. Thirty centimetres will float most cars. Fifteen will take an adult off their feet. Turn around.',
      'Move to higher ground early rather than well, and take documents, medicine, a phone charger and drinking water.',
      'Assume flood water is contaminated. Sewage, fuel and animal waste are in it.',
      'Keep out of flooded buildings until the power is confirmed off.',
      'After the water drops, boil or treat drinking water until the supply is declared safe.',
    ],
    faq: [
      ['When is Nepal’s monsoon?',
       'Roughly mid-June to late September, with the heaviest and most damaging rain usually in July and August.'],
      ['Where can I see live river levels in Nepal?',
       'The BIPAD portal at bipad.gov.np carries gauge readings and warning levels, and the Department of Hydrology and Meteorology at dhm.gov.np publishes forecasts and flood bulletins.'],
      ['Is a monsoon flood the same as a glacial lake outburst flood?',
       'No. A monsoon flood builds over hours or days from rain you can see. A glacial flood arrives without rain and much faster, and carries far more rock and debris. The safe response to both is the same: get high, early.'],
    ],
  },
  'fire-lightning-cold': {
    title: 'Lightning, Fire and Cold Waves in Nepal: The Steady Killers',
    description: 'Lightning kills around a hundred people a year in Nepal, village fires spread through dense housing in the dry season, and Tarai cold waves kill the poorest. What to do about each.',
    h1: 'Lightning, fire and cold waves',
    lede: 'Three hazards that kill steadily rather than all at once, which is exactly why they get less attention and less preparation than they deserve.',
    long: [
      'Nepal loses roughly a hundred people a year to lightning, which over a decade is comparable to a major single disaster. Deaths cluster in the pre-monsoon and early monsoon months and fall heavily on people working outdoors: farmers in open fields, herders, and children walking home.',
      'Fire is a dry-season hazard. Traditional village housing is built close together with timber and thatch, cooking is done with fire, and water pressure for firefighting is often nothing at all. A single house fire in a dense lane becomes a village fire within minutes, and the fire service, where there is one, may be an hour away on a bad road.',
      'Cold waves hit the Tarai each winter. Dense fog holds temperatures down for days at a time and the deaths fall on people without heating, adequate housing or warm clothing: the very old, the very young, and anyone sleeping outside.',
      'None of the three produces a single event large enough to command a national response, and each is largely preventable with cheap measures taken in advance.',
    ],
    signsLong: [
      'Lightning: count the seconds between the flash and the thunder. Under thirty seconds means the storm is close enough to strike where you are standing.',
      'Lightning: hair standing on end, or a buzzing from metal objects, means a strike is imminent. Crouch low, feet together, immediately.',
      'Fire: in dense housing, smell smoke and act rather than investigate.',
    ],
    todoLong: [
      'Lightning: get inside a building or a hard-topped vehicle. Stay there for thirty minutes after the last thunder, not thirty seconds.',
      'Lightning: do not shelter under a lone tree, in an open field, on a ridge, or beside metal fencing or machinery.',
      'Fire: know two ways out of a village lane rather than one, and keep the second one clear.',
      'Fire: cooking fires and stoves are the common start. Do not leave them unattended and keep fuel away from them.',
      'Cold: a cold wave kills through prolonged exposure, so check on elderly neighbours and anyone sleeping outdoors rather than assuming they are coping.',
    ],
    faq: [
      ['How many people does lightning kill in Nepal?',
       'Around a hundred a year, with the deaths concentrated among people working outdoors in the pre-monsoon and monsoon months.'],
      ['Is it safe to use a mobile phone in a thunderstorm?',
       'Indoors, yes. Outdoors the phone is not the danger, being outdoors is. Get inside.'],
      ['What counts as a cold wave in the Tarai?',
       'A run of days where dense fog keeps daytime temperatures unusually low. It is the duration rather than any single very cold night that causes the deaths.'],
    ],
  },
};
