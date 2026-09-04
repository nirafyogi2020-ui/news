/* ---------------------------------------------------------------------------
   The Investigation tab's ledgers.

   Everything this site knows that is not a live counter: who has sent money
   and how much, what the flood destroyed, who is still unaccounted for and
   under whose count, what is claimed about the cause and how well each claim
   is supported, and what nobody has published at all.

   Two rules, and they are the whole point of the file:

   1. No figure here is typed twice. A row states its number once and names
      the briefing it came from by slug. The build reads that briefing out of
      `data/updates/`, takes its headline, its timestamp and its source links
      from the file the archive already holds, and prints them under the row.
      If a briefing is corrected, the ledger is corrected with it; if a slug
      stops existing, the build says so rather than printing a dead citation.

   2. No conversion, no total across currencies. A pledge stated in euros
      stays in euros. Adding US$5m to €2m to Rs 5.04bn would produce a single
      impressive number that no source has published and that would be wrong
      the next time a rate moved. The ledger groups by currency and lets the
      reader see the shape.

   The live counters are not here. They belong to /api/figures, which reads
   them from the sources every few minutes; the tab asks that API for them
   directly so this file can never disagree with the top of the page.
   ------------------------------------------------------------------------ */

/** Money and goods sent to Nepal for this flood, and money raised inside it. */
export const AID = [
  /* --- from outside Nepal ------------------------------------------------ */
  {
    giver: 'World Bank',
    origin: 'international',
    kind: 'money',
    stated: 'Up to Rs 25 billion',
    currency: 'NPR',
    value: 25e9,
    what: 'Emergency assistance offered to the finance ministry by the World Bank’s Nepal country director. An offer of aid, not a damage estimate, and not yet drawn down.',
    from: '2026-08-29-damage-cost'
  },
  {
    giver: 'Asian Development Bank',
    origin: 'international',
    kind: 'money',
    stated: 'US$5 million',
    currency: 'USD',
    value: 5e6,
    what: 'Emergency grant approved for the flood response, about Rs 750 million. Announced by the finance ministry.',
    from: '2026-08-29-damage-cost'
  },
  {
    giver: 'Canada',
    origin: 'international',
    kind: 'money',
    stated: 'C$5 million',
    currency: 'CAD',
    value: 5e6,
    what: 'Humanitarian assistance announced by Secretary of State for International Development Randeep Sarai, to be channelled through organisations such as the Red Cross. Five consular officials also sent to Kathmandu.',
    from: '2026-08-28-canada-missing-aid'
  },
  {
    giver: 'Australia',
    origin: 'international',
    kind: 'money',
    stated: 'A$5 million',
    currency: 'AUD',
    value: 5e6,
    what: 'Announced by Foreign Minister Penny Wong: A$2m to the World Food Programme, A$2m to Australian NGOs through the Australian Humanitarian Partnership, A$1m to the Emergency Action Alliance. Three more humanitarian specialists sent, joining 20 already in Nepal.',
    from: '2026-08-29-australia-missing-aid'
  },
  {
    giver: 'European Union',
    origin: 'international',
    kind: 'money',
    stated: '€2 million',
    currency: 'EUR',
    value: 2e6,
    what: 'Humanitarian aid for food, healthcare, clean water and sanitation, announced by the EU Delegation to Nepal. On top of about €3 million already committed this year for disaster preparedness.',
    from: '2026-08-28-eu-aid-2m'
  },
  {
    giver: 'China',
    origin: 'international',
    kind: 'supplies',
    stated: '50 tonnes',
    what: '13,200 items, namely tents, blankets, sleeping bags, hard tack and first-aid kits, flown into Kathmandu on two military transport aircraft at about 7am on Sunday 30 August.',
    from: '2026-08-30-china-relief-supplies'
  },
  {
    giver: 'China',
    origin: 'international',
    kind: 'people',
    stated: '5 experts, 4 more to follow',
    what: 'Tunnel-rescue specialists sent by the Ministry of Emergency Management, for the hydropower tunnels in Rasuwa and Nuwakot.',
    from: '2026-08-30-foreign-rescue-experts-accepted'
  },
  {
    giver: 'India',
    origin: 'international',
    kind: 'people',
    stated: '11-member team',
    what: 'Reconnaissance team flown to Chilime and Langtang with Nepali Army and Armed Police Force personnel, for specialised tunnel rescue.',
    from: '2026-08-30-foreign-rescue-experts-accepted'
  },
  {
    giver: 'South Korea',
    origin: 'international',
    kind: 'people',
    stated: 'Inspection team',
    what: 'Experts allowed in to inspect affected areas, alongside the Indian and Chinese tunnel-rescue teams.',
    from: '2026-08-30-foreign-rescue-experts-accepted'
  },
  {
    giver: 'India and China',
    origin: 'international',
    kind: 'works',
    stated: '42 Bailey bridges requested',
    what: 'Nepal asked both countries to build 42 Bailey bridges across Rasuwa, Nuwakot and Dhading, the number NDRRMA assessed as urgently needed. India said it would help; no delivery timeline has been published.',
    from: '2026-08-28-bailey-bridges'
  },
  {
    giver: 'IFRC and the Nepal Red Cross Society',
    origin: 'international',
    kind: 'supplies',
    stated: 'Emergency funding released',
    what: 'The International Federation released emergency funding to the Nepal Red Cross, which is distributing water, tarpaulins, blankets and first-aid supplies.',
    from: '2026-08-28-red-cross-93000-affected'
  },

  /* --- raised inside Nepal ----------------------------------------------- */
  {
    giver: 'Government of Nepal',
    origin: 'domestic',
    kind: 'money',
    stated: 'Rs 1 billion',
    currency: 'NPR',
    value: 1e9,
    what: 'Released into the disaster relief fund on the evening of the flood, plus Rs 10 million each to Rasuwa and Nuwakot districts and Rs 5 million to Dhading. This is public money released, not public money donated.',
    from: '2026-08-29-damage-cost'
  },
  {
    giver: 'Public donations to the Prime Minister’s Disaster Relief Fund',
    origin: 'domestic',
    kind: 'money',
    stated: 'Rs 5.04 billion',
    currency: 'NPR',
    value: 5.04e9,
    what: 'Deposited across nine commercial bank accounts, Prime Minister Balen Shah said on 29 August. A further US$1.8 million was deposited at Himalayan Bank and Laxmi Bank. Separate from the Rs 1 billion the government itself released.',
    from: '2026-08-29-relief-fund-504bn'
  },
  {
    giver: 'Gorkha Brewery',
    origin: 'domestic',
    kind: 'money',
    stated: 'Rs 100 million',
    currency: 'NPR',
    value: 1e8,
    what: 'The largest single gift in the fund’s first six hours, which took in Rs 273.3 million in total.',
    from: '2026-08-29-damage-cost'
  },
  {
    giver: 'Nepal Liquors',
    origin: 'domestic',
    kind: 'money',
    stated: 'Rs 10.1 million',
    currency: 'NPR',
    value: 1.01e7,
    what: 'Corporate donation to the Prime Minister’s Disaster Relief Fund.',
    from: '2026-09-01-auto-2026-09-01-nepal-liquors-donates-rs-10-1-million-to-flood-relief-'
  },
  {
    giver: 'Padma Jyoti Group',
    origin: 'domestic',
    kind: 'money',
    stated: 'Rs 10 million',
    currency: 'NPR',
    value: 1e7,
    what: 'Given through Syakar Trading Company to the Prime Minister’s Disaster Relief Fund.',
    from: '2026-08-31-auto-2026-08-31-padma-jyoti-group-contributes-rs-10-million-to-disaste'
  },
  {
    giver: 'The Cabinet of Nepal',
    origin: 'domestic',
    kind: 'money',
    stated: 'One month’s salary each',
    what: 'The Prime Minister and every member of the Council of Ministers to give a month’s pay to the relief fund. The Cabinet also approved a government-to-government purchase of 25,000 tonnes of DAP fertiliser from India for farmers who lost supplies.',
    from: '2026-08-28-cabinet-relief-package'
  }
];

/** What the flood destroyed, and who counted it. */
export const DESTROYED = [
  {
    what: 'Roads and bridges',
    figure: 'Rs 200 billion',
    detail: 'Physical Infrastructure and Transport Minister Sunil Lamsal’s preliminary estimate, given on the day of the flood. It covers roads and bridges only, not hydropower and not private property, and four districts were still being surveyed when it was given, so it is expected to rise.',
    from: '2026-08-29-damage-cost'
  },
  {
    what: 'The Betrawati to Rasuwagadhi road',
    figure: '42 km destroyed',
    detail: 'The whole road to the Chinese border crossing, destroyed at multiple points, plus 16 km more elsewhere on the corridor.',
    from: '2026-08-27-damage-infra'
  },
  {
    what: 'Hydropower',
    figure: '14 projects, about 748 MW',
    detail: 'Nine operating plants totalling 354 MW and five under construction totalling 394 MW, on the Nepal Electricity Authority’s count. A same-day Ministry of Energy estimate put the loss at 431 MW, a measure of how fast the assessment was moving.',
    from: '2026-08-29-damage-cost'
  },
  {
    what: 'Bridges inside Rasuwa',
    figure: '13 swept away',
    detail: 'Plus two more outside the district. Rasuwa was cut off from the road network entirely until an alternative light-vehicle route via Tokha and Kalikasthan reopened on 28 August.',
    from: '2026-08-28-rasuwa-isolation'
  },
  {
    what: 'Schools',
    figure: '18 destroyed, 20 damaged',
    detail: 'Across Rasuwa, Nuwakot and Dhading, on UNICEF’s count, wider than the 8 damaged schools reported in Rasuwa and Nuwakot the day before. UNICEF says at least 17,000 children are affected and about 10,000 need temporary classrooms and replacement books.',
    from: '2026-08-29-damage-cost'
  },
  {
    what: 'Bank branches',
    figure: '9 swept away',
    detail: 'At Timure, Syabrubesi and the Rasuwagadhi crossing, in the first hour of the flood. Twenty-six bank employees were reported out of contact.',
    from: '2026-08-27-rasuwa-flood'
  },
  {
    what: 'Mobile network',
    figure: '120 sites knocked out',
    detail: 'Nepal Telecom had restored 80 of them by 29 August, flying technicians into the most remote towers by helicopter. Phone lines being down is the main reason families cannot reach relatives in the flood zone.',
    from: '2026-08-29-mobile-service-restored'
  },
  {
    what: 'People affected',
    figure: 'At least 93,000',
    detail: 'The IFRC’s head of delegation in Nepal, David Fisher, on 28 August. The broadest estimate published so far, wider than the confirmed dead, missing and rescued counts, and not confirmed by the Nepali government.',
    from: '2026-08-28-red-cross-93000-affected'
  }
];

/** Groups of people counted as unaccounted for, and who is doing the counting.
    Deliberately not summed: the counts overlap, use different cut-offs, and
    several are the counting body's own estimate rather than a police figure. */
export const UNACCOUNTED = [
  {
    group: 'Hydropower project staff',
    figure: '898 at 11 projects',
    counter: 'Independent Power Producers’ Association, Nepal',
    detail: 'IPPAN’s own count on 29 August, across Rasuwa and Nuwakot. 361 people had been evacuated and around 300 were believed trapped in the Upper Trishuli-1 tunnel. NDRRMA separately put 933 hydropower workers among the missing.',
    from: '2026-08-28-hydropower-workers-out-of-contact'
  },
  {
    group: 'Truck drivers, helpers and traders',
    figure: 'More than 1,000',
    counter: 'Nepal Truck Container Transportation Service',
    detail: 'The transport association’s own estimate, alongside more than 400 container trucks missing on the Rasuwagadhi to Kerung and Trishuli corridor. Not confirmed by Nepal Police or NDRRMA.',
    from: '2026-08-28-container-trucks-workers-unaccounted'
  },
  {
    group: 'Foreign travellers',
    figure: '420 out of contact',
    counter: 'Nepal Tourism Board',
    detail: '184 foreign tourists rescued and three more back in contact as of 29 August. The board’s list is separate from NDRRMA’s wider list of 2,426 people.',
    from: '2026-08-29-tourists-rescued-accounted'
  },
  {
    group: 'Indian nationals',
    figure: '320 uncontactable',
    counter: 'India’s Ministry of External Affairs',
    detail: 'Plus about 100 more people of Indian origin. About 400 Indians stranded on the Chinese side were confirmed safe, 96 of them already back across into Nepal, and 63 Indian workers were rescued from Trishuli-1.',
    from: '2026-08-28-india-mea-320-uncontactable'
  },
  {
    group: 'Australian nationals',
    figure: '41 unaccounted for',
    counter: 'Australia’s Department of Foreign Affairs and Trade',
    detail: 'The count moved from 35 to 39 to 38 to 41 in three days. Most were on pilgrimages and tour groups heading for Mount Kailash.',
    from: '2026-08-29-australia-missing-aid'
  },
  {
    group: 'Canadian nationals',
    figure: '32 unaccounted for',
    counter: 'Global Affairs Canada',
    detail: 'None among the confirmed dead. About 858 Canadians were registered as being in Nepal and 18 in the Tibet Autonomous Region.',
    from: '2026-08-28-canada-missing-aid'
  },
  {
    group: 'School students',
    figure: 'Hundreds being traced',
    counter: 'Uttargaya Public School, Bidur',
    detail: 'More than 370 students were in the school when the flood hit. The vice principal said about 40 percent had been contacted and the school no longer holds records for the rest.',
    from: '2026-08-28-schools-swept-students-unaccounted'
  },
  {
    group: 'Customs officers',
    figure: '15 out of contact',
    counter: 'Rasuwa customs office, Timure',
    detail: 'The customs post at the border crossing was among the first buildings the water reached.',
    from: '2026-08-27-rasuwa-flood'
  }
];

/** What nobody has published. Kept as a standing list because the gaps are
    as much a finding as the figures are. */
export const UNKNOWNS = [
  {
    q: 'How many people are displaced?',
    a: 'No government or humanitarian body has published a consolidated figure for people displaced, sheltering or in need. UN OCHA named it as the priority information gap. The nearest thing is the IFRC’s "at least 93,000 affected", which measures something wider.'
  },
  {
    q: 'What actually caused it?',
    a: 'No government has confirmed a cause. Two preliminary explanations are on the table. One is an ice-and-rock avalanche that dammed the Lhende Khola and then burst; the other is an ice and rock fall off Langtang Lirung that generated the surge directly. They are not the same mechanism.'
  },
  {
    q: 'Did the barrier lake on the Chinese side burst?',
    a: 'The Kathmandu Post reported a breach on 28 August. Nepal’s government spokesperson said the same afternoon that Nepal had only been told glaciers broke and sent water over the top, not that a dam failed. The two accounts have never been reconciled.'
  },
  {
    q: 'Why do the missing counts disagree?',
    a: 'Nepal Police, NDRRMA and the Tourism Board count different populations with different cut-offs, and foreign ministries keep their own lists of their own nationals. NDRRMA widened who it counts on 28 August, which nearly doubled the number overnight. None of these lists has been merged.'
  },
  {
    q: 'What will it cost to rebuild?',
    a: 'The only figure published is Rs 200 billion for roads and bridges, called preliminary by the minister who gave it, with four districts still unsurveyed and energy infrastructure and private property excluded.'
  }
];
