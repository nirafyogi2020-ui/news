/* ============================================================================
   Nepali edition pages.

   Four pages, hand-written. Figures are imported from src/content.mjs, so the
   Nepali and English editions cannot disagree about a casualty count: change
   the number once and both languages move together.
   ========================================================================= */

import { SITE, SITE_NAME, CONTACT_EMAIL, page, esc, faqBlock, nptLong } from './template.mjs';
import * as C from './content.mjs';
import { ne, NE_DISTRICTS, NE_MISSING_GROUPS, NE_EMERGENCY, NE_MISSING_STEPS, NE_HAZARD_STEPS } from './content-ne.mjs';

const ORG = { '@id': `${SITE}/#organization` };

/** "२०२६ अगस्ट २७, दिउँसो २:३० बजे" */
function neTime(iso) {
  const en = nptLong(iso);
  const m = en.match(/^(\d+) (\w+) (\d+), (\d+):(\d+) (am|pm) NPT$/);
  if (!m) return en;
  const [, d, mon, y, h, min, ap] = m;
  const MON = {
    January: 'जनवरी', February: 'फेब्रुअरी', March: 'मार्च', April: 'अप्रिल',
    May: 'मे', June: 'जुन', July: 'जुलाई', August: 'अगस्ट',
    September: 'सेप्टेम्बर', October: 'अक्टोबर', November: 'नोभेम्बर', December: 'डिसेम्बर',
  };
  const part = ap === 'am' ? (Number(h) < 5 ? 'राति' : 'बिहान') : (Number(h) < 4 || Number(h) === 12 ? 'दिउँसो' : 'साँझ');
  return `${ne(y)} ${MON[mon] || mon} ${ne(d)}, ${part} ${ne(h)}:${ne(min)} बजे`;
}

const TOLL_NE = neTime(C.TOLL_AS_OF);
const MISSING_NE = neTime(C.MISSING_AS_OF);
/* The tables below carry their own bulletin times so they cannot drift from
   the headline totals. */
const BODIES_NE = neTime(C.BODIES_AS_OF);
const MISSING_BREAKDOWN_NE = neTime(C.MISSING_BREAKDOWN_AS_OF);

function table(head, rows, caption) {
  return `<div class="table-scroll"><table>${caption ? `<caption>${caption}</caption>` : ''}<thead><tr>${
    head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${
    rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

const DIAL_STRIP = `<div class="callout callout-alert">
  <p class="callout-title">अहिल्यै खतरामा हुनुहुन्छ?</p>
  <p><strong>१००</strong> (नेपाल प्रहरी) वा मोबाइलबाट <strong>११२</strong> मा फोन गर्नुहोस्। यो पृष्ठको अरू केही लोड हुन नपर्खनुहोस्।</p>
  <div class="dialrow" style="margin-top:12px;margin-bottom:0;">
    <a class="dial" href="tel:100"><b>१००</b><span>प्रहरी</span></a>
    <a class="dial" href="tel:112"><b>११२</b><span>मोबाइलबाट</span></a>
    <a class="dial" href="tel:102"><b>१०२</b><span>एम्बुलेन्स</span></a>
    <a class="dial" href="tel:1149"><b>११४९</b><span>विपद् हटलाइन</span></a>
  </div>
  <p class="faint" style="margin-top:10px;margin-bottom:0;"><a href="/ne/aapatkalin-number/">सबै आपतकालीन नम्बर र कुन कामका लागि हो</a></p>
</div>`;

const LAKE_WARNING = `<div class="callout callout-alert">
  <p class="callout-title">दोस्रो बाढी अझै सम्भव छ: माथि नयाँ ताल बनेको छ</p>
  <p>चीनको जलस्रोत मन्त्रालयका अनुसार तिब्बतभित्र, नेपाल सीमा नजिकै छोचेन खोला र पुरेपु त्साङ्पो नदीको संगमस्थल वरिपरि नदी थुनिएर <strong>कृत्रिम ताल</strong> बनेको छ। चिनियाँ सञ्चारमाध्यम सीसीटीभीका अनुसार बिहीबार बिहानसम्म त्यहाँ करिब <strong>२० लाख घनमिटर</strong> पानी जम्मा भइसकेको थियो, र त्यो फुट्न सक्ने चेतावनी दिइएको छ।</p>
  <p>यी दुवै नदी त्रिशूली नदी प्रणालीका माथिल्ला सहायक नदी हुन्। फुटेमा पानी २६ अगस्टकै बाटो हुँदै रसुवा र नुवाकोट झर्छ। भोटेकोशी र त्रिशूलीका अधिकांश जलमापक पहिलो बाढीमै बगेकाले चेतावनी सामान्यभन्दा ढिलो आउँछ।</p>
  <p><strong>अधिकारीले सुरक्षित भनेको नभनेसम्म भोटेकोशी, त्रिशूली र नारायणीको किनारमा नजानुहोस्।</strong> तल भारततर्फ बिहारका अधिकारीले सतर्कताका रूपमा गण्डकको वाल्मीकिनगर ब्यारेज खोलेका छन् र १०,००० देखि १२,००० मानिस सार्ने तयारी गरेका छन्।</p>
  <p class="faint" style="margin-bottom:0;">स्रोत: चीनको जलस्रोत मन्त्रालय, सीसीटीभी र ग्लोबल टाइम्स मार्फत, २७ अगस्ट २०२६।</p>
</div>`;

function numbersNe() {
  return `<div class="numgrid">
    <div class="statbox"><span class="n crit">${ne(C.TOLL.deadNepal)}</span><span class="l">नेपालमा मृत्यु पुष्टि</span><span class="src">नेपाल प्रहरी, ${esc(TOLL_NE)}</span></div>
    <div class="statbox"><span class="n crit">${ne(C.TOLL.missing)}</span><span class="l">नेपालमा बेपत्ता सूचीमा</span><span class="src">NDRRMA, ${esc(MISSING_NE)}</span></div>
    <div class="statbox"><span class="n">${ne(C.TOLL.missingChina)}</span><span class="l">चीनतर्फ बेपत्ता</span><span class="src">सीसीटीभी, ग्याइरोङ बन्दरगाह</span></div>
    <div class="statbox"><span class="n">${ne(C.TOLL.injured)}</span><span class="l">घाइते</span><span class="src">प्राधिकरण र नेपाल प्रहरी</span></div>
    <div class="statbox"><span class="n">${ne(C.TOLL.rescued)}</span><span class="l">उद्धार गरिएका</span><span class="src">NDRRMA, ${esc(MISSING_NE)}</span></div>
    <div class="statbox"><span class="n">${ne(C.DAMAGE.hydropowerProjects)}</span><span class="l">जलविद्युत् आयोजना क्षतिग्रस्त, करिब ${ne(C.DAMAGE.hydropowerMW)} मेगावाट</span><span class="src">नेपाल विद्युत् प्राधिकरण</span></div>
    <div class="statbox"><span class="n sm">रु २०० अर्ब</span><span class="l">सडक र पुल क्षति, प्रारम्भिक अनुमान</span><span class="src">मन्त्री सुनिल लामसाल, २६ अगस्ट</span></div>
    <div class="statbox"><span class="n sm">रु १ अर्ब</span><span class="l">राहत कोषमा निकासा</span><span class="src">नेपाल सरकार</span></div>
  </div>
  <p class="updated-line"><strong>दुई मुख्य सङ्ख्या आफ्नै घडीसँग पढ्नुहोस्।</strong> नेपाल प्रहरीको ${esc(TOLL_NE)} को बुलेटिनमा मृत्यु सङ्ख्या ${ne(C.TOLL.deadNepal)} छ। NDRRMA को ${esc(MISSING_NE)} को अपडेटमा ${ne(C.TOLL.missing)} जना सम्पर्कविहीन छन्। सम्पर्कविहीन हुनु मृत्यु पुष्टि हुनु होइन।</p>`;
}

/* -- /ne/ : the event briefing --------------------------------------------- */

export function neEvent(ctx) {
  const path = '/ne/';
  const faq = faqBlock([
    {
      q: 'रसुवामा के भयो?',
      a: `<p>२०२६ अगस्ट २६ को बिहान करिब ९ बजे तिब्बततर्फबाट भोटेकोशी नदी हुँदै अचानक बाढी रसुवा जिल्लामा पस्यो। तिमुरे, स्याफ्रुबेसी, रसुवागढी नाका र उत्तरी रसुवाका करिब एक दर्जन नदी किनारका बस्ती सबैभन्दा बढी प्रभावित भए। पानी त्रिशूली हुँदै नारायणीसम्म पुग्यो। ${esc(TOLL_NE)} सम्म NDRRMA ले ${ne(C.TOLL.deadNepal)} जनाको मृत्यु पुष्टि गरेको छ।</p>`,
    },
    {
      q: 'बाढीको कारण के हो?',
      a: '<p>कुनै पनि सरकारले कारण पुष्टि गरेको छैन। नेपालको जलविज्ञान तथा मौसम विज्ञान विभाग र स्वतन्त्र हिमनदी विज्ञहरूले ICIMOD मार्फत प्राप्त उपग्रह तस्बिर हेरेर दिएको प्रारम्भिक व्याख्या यो हो: हिउँ र ढुंगाको पहिरोले मितेरी पुलभन्दा करिब २० किलोमिटर माथि ल्हेन्दे खोला थुन्यो, पछाडि अस्थायी ताल बन्यो, र त्यो फुट्यो। बाढीभन्दा केही मिनेट अघि रेकर्ड भएको हल्लोलाई अमेरिकी भूगर्भ सर्वेक्षणले अहिले ५.२ म्याग्निच्युडको हिउँ खस्ने घटना भनेको छ, भूकम्प होइन। रसुवामा भारी वर्षा भएको थिएन।</p>',
    },
    {
      q: 'कुन कुन जिल्ला प्रभावित भए?',
      a: '<p>रसुवा सबैभन्दा बढी प्रभावित भयो। त्यसपछि पानी नुवाकोटको बेत्रावती र त्रिशूली बजार, धादिङको गल्छी र ढुंगे बजार हुँदै मुग्लिन पार गरेर नारायणीमा पुग्यो। चितवन, नवलपरासी पूर्व र पश्चिम, गोरखा र तनहुँमा पनि शव फेला परेका छन्।</p>',
    },
    {
      q: 'काठमाडौंमा असर परेको छ?',
      a: '<p>काठमाडौंमा बाढी आएको छैन। क्षति भोटेकोशी र त्रिशूली नदीको बेँसीमा, रसुवा र नुवाकोटतिर छ। रसुवागढी हुँदै चीन जोड्ने सडक भने गम्भीर रूपमा क्षतिग्रस्त छ।</p>',
    },
    {
      q: 'बेपत्ता व्यक्तिको खबर कसरी गर्ने?',
      a: '<p>नजिकको जिल्ला प्रहरी कार्यालय वा १०० मा फोन गर्नुहोस्, र त्यही विवरण स्थानीय वडा कार्यालयमा पनि दर्ता गर्नुहोस्। <a href="/ne/bepatta/">पूरा तरिका यहाँ छ</a>।</p>',
    },
    {
      q: 'राहतका लागि पैसा कहाँ पठाउने?',
      a: '<p>नेपाल सरकारकै प्रधानमन्त्री प्राकृतिक विपद् उद्धार कोषमा। बैंक खाता र आधिकारिक QR <a href="/ne/rahat/">राहत पृष्ठमा</a> छन्। विपद्को केही घण्टामै नक्कली अपिल आउँछन्, त्यसैले पैसा पठाउनुअघि खाताको नाम जाँच्नुहोस्।</p>',
    },
  ]);

  const body = `
${DIAL_STRIP}

<h2>सङ्ख्या अहिले कहाँ छ</h2>
${numbersNe()}

${LAKE_WARNING}

<h2>के भयो</h2>
<p><strong>२०२६ अगस्ट २६ को बिहान करिब ९ बजे</strong> रसुवागढीमा भोटेकोशी नदी अचानक बढ्यो। रसुवामा पानी परेको थिएन। केही मिनेटमै पानी तिमुरे पुग्यो र त्यहाँका नौ बैंक शाखा र भन्सार कार्यालय बगायो। त्रिशूलीसँग भोटेकोशी मिसिने ठाउँ स्याफ्रुबेसीको हेलिप्याड भत्कियो, जसले पहिलो दिनको हवाई उद्धार ढिलो बनायो, जुन दिन त्यो सबैभन्दा जरुरी थियो।</p>
<p>बाढी जिल्लाको सिमानामा रोकिएन। भोटेकोशी स्याफ्रुबेसीमा त्रिशूलीसँग मिसिन्छ, र त्रिशूली नारायणीमा। पानी नुवाकोटको बेत्रावती र त्रिशूली बजार, धादिङको गल्छी र ढुंगे बजार हुँदै मुग्लिन पार गर्‍यो। सशस्त्र प्रहरी बलका अनुसार बिहीबार दिउँसोसम्म नारायणी नदीबाट मात्रै ${ne(C.TOLL.narayaniRecovered)} शव निकालिएका छन्।</p>
<p>पहिलो दुई दिनमा सङ्ख्या बारम्बार बढ्यो, किनभने खोजी टोली सम्पर्कविहीन भएका ठाउँमा पुग्दै गए। बुधबार साँझ प्रधानमन्त्री कार्यालयले ९५ र प्राधिकरणले ७२ भनेको थियो; शनिबार बिहान ६ बजे नेपाल प्रहरीको सङ्ख्या ${ne(C.TOLL.deadNepalEarlier)} पुग्यो, र ${esc(TOLL_NE)} को प्रहरी बुलेटिनमा <strong>${ne(C.TOLL.deadNepal)}</strong> पुग्यो। यही कारण यहाँको हरेक सङ्ख्या अस्थायी हो।</p>

<h3>कुन जिल्लामा कति शव फेला परे</h3>
${table(['जिल्ला', 'शव फेला परेको'], C.BODIES_BY_DISTRICT.map(([d, n]) => [esc(NE_DISTRICTS[d] || d), `<span class="num">${ne(n)}</span>`]).concat([['<strong>यो सूचीको जम्मा</strong>', `<strong class="num">${ne(C.BODIES_BY_DISTRICT.reduce((a, [, n]) => a + n, 0))}</strong>`]]), `नेपाल प्रहरी, ${esc(BODIES_NE)}। जिल्लागत विवरणको जम्मा माथिको राष्ट्रिय कुलसँग मिल्छ। तालिकामा भएको जिल्ला शव फेला परेको ठाउँ हो, मृतकको स्थायी ठेगाना होइन।`)}
<p>चीनतर्फ ग्याइरोङ नजिक थप <strong>${ne(C.TOLL.deadChina)} जना</strong>को मृत्यु पुष्टि भएको छ।</p>

<h2>बेपत्ता</h2>
<p>NDRRMA को ${esc(MISSING_NE)} को अपडेटमा <strong>${ne(C.TOLL.missing)} जना</strong> सम्पर्कविहीन सूचीमा छन्।</p>
${table(['समूह', 'बेपत्ता सूचीमा'], C.MISSING_BREAKDOWN.map(([k, n]) => [esc(NE_MISSING_GROUPS[k] || k), `<span class="num">${ne(n)}</span>`]), `नेपाल प्रहरी, ${esc(MISSING_BREAKDOWN_NE)}। त्यस बेला सूचीमा ${ne(C.MISSING_BREAKDOWN_TOTAL)} जना थिए।`)}
<p>बेपत्ता विदेशी यात्रुहरूमध्ये धेरैजसो तिब्बत हुँदै कैलाश मानसरोवर जाने बाटोमा थिए। भारतका कम्तीमा ${ne(C.TOLL.missingIndian)}, मलेसियाका ५५, अमेरिकाका ४७, अष्ट्रेलियाका ३४, बेलायतका ३३ र क्यानडाका २४ नागरिक सूचीमा छन्।</p>
<p>चिनियाँ सञ्चारमाध्यमका अनुसार तिब्बततर्फ ग्याइरोङ बन्दरगाह वरिपरि थप <strong>${ne(C.TOLL.missingChina)} जना</strong> बेपत्ता छन्, जसमध्ये ${ne(C.TOLL.missingChinaForeign)} विदेशी नागरिक हुन्।</p>
<div class="callout">
  <p class="callout-title">सम्पर्कविहीन हुनु भनेको मृत्यु होइन</p>
  <p>भोटेकोशी र त्रिशूली बेँसीभरि फोन, बिजुली र इन्टरनेट बन्द छ र बिस्तारै मात्र फर्किँदै छ। यो सूचीको ठूलो हिस्सा कसैले सम्पर्क गर्न नसकेका मानिस हुन्, पानीमा परेको थाहा भएका होइनन्। हरेक दिन कोही न कोही जीवितै भेटिएर सूचीबाट हट्छन्।</p>
  <p style="margin-bottom:0;"><a href="/ne/bepatta/"><strong>बेपत्ता व्यक्तिको खबर कसरी गर्ने</strong></a></p>
</div>

<h2>क्षति</h2>
<p>नेपाल विद्युत् प्राधिकरणका अनुसार करिब <strong>${ne(C.DAMAGE.hydropowerMW)} मेगावाट</strong> क्षमताका <strong>${ne(C.DAMAGE.hydropowerProjects)} जलविद्युत् आयोजना</strong> क्षतिग्रस्त भएका छन्: सञ्चालनमा रहेका ९ वटा (३५४ मेगावाट) र निर्माणाधीन ५ वटा (३९४ मेगावाट)। नाम खुलेकामा रसुवागढी, चिलिमे, सान्जेन खोला, माथिल्लो त्रिशूली-१, त्रिशूली र देवीघाट, र एउटा २२० केभी सबस्टेसन छन्।</p>
<p>सडक विभागका अनुसार बेत्रावतीदेखि रसुवागढी नाकासम्मको <strong>पूरै ४२ किलोमिटर सडक</strong> धेरै ठाउँमा भत्किएको छ, केही कङ्क्रिट पुलसहित। सीमा नजिकको थप १६ किलोमिटर खण्ड, जुन भर्खरै चिनियाँ सरकारको लगानीमा स्तरोन्नति गरिएको थियो, त्यो पनि बगेको छ।</p>
<p>नौ वाणिज्य बैंक शाखा बगेका छन् र तिनका २६ कर्मचारी सम्पर्कविहीन छन्। तिमुरेको रसुवा भन्सार कार्यालयका १५ कर्मचारीसँग सम्पर्क टुटेको छ।</p>
<p>भौतिक पूर्वाधार तथा यातायात मन्त्री सुनिल लामसालले २६ अगस्टमा सडक र पुलको क्षति करिब <strong>रु २०० अर्ब</strong> हुनसक्ने बताए, र त्यसलाई प्रारम्भिक भने। त्यसमा जलविद्युत् र निजी सम्पत्ति समावेश छैन।</p>
<p>कति मानिस विस्थापित भए भन्ने कुनै सरकारी वा मानवीय निकायले अझै सङ्ख्या सार्वजनिक गरेको छैन।</p>

<h2>उद्धार र प्रतिकार्य</h2>
<p>नेपाली सेना, सशस्त्र प्रहरी बल र नेपाल प्रहरीले सैनिक तथा निजी हेलिकप्टरसहित खोजी र उद्धार गरिरहेका छन्। NDRRMA का अनुसार ${esc(MISSING_NE)} सम्म <strong>${ne(C.TOLL.rescued)} जना</strong> उद्धार गरिएका छन्। पहिले सार्वजनिक भएको नामसहितको सूची ११३ जनाको मात्र हो, त्यसैले त्यो नयाँ कुलको विवरण होइन।</p>
<p>मन्त्रिपरिषद्ले घाइतेको निःशुल्क उपचार, मृतकका परिवारलाई आर्थिक सहायता, र सडक खोल्ने, बिजुली र सञ्चार पुनःस्थापना गर्ने तथा विस्थापितलाई खाना र आश्रय दिने निर्णय गरेको छ। नेपालले चीन र भारतसँग सहयोग मागेको छ।</p>

<h2>प्रायः सोधिने प्रश्न</h2>
${faq.html}

<h2>यो पृष्ठ कसरी बनेको हो</h2>
<p>मृत्यु र सम्पर्कविहीनको पछिल्लो सङ्ख्या NDRRMA को १० बजे स्थितिगत अपडेटबाट लिइएको हो। क्षति, उद्धार र प्रतिकार्यका पुराना विवरण संयुक्त राष्ट्रसंघीय OCHA को २७ अगस्टको स्थिति विवरणबाट लिइएका हुन्। दुई स्रोत बाझिए कम भएको तर पुष्टि भएको सङ्ख्या राखिन्छ, स्रोत र समयसहित।</p>
<p>यहाँ केही गलत भेट्नुभयो भने <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> मा लेख्नुहोस्। सच्याइन्छ वा हटाइन्छ।</p>
<p><a href="/nepal-flood/rasuwa/">This briefing in English, with the map and full damage assessment</a></p>
`;

  const title = `रसुवा बाढी: ${ne(C.TOLL.deadNepal)} जनाको मृत्यु, ताजा अपडेट`;
  const desc = `रसुवा बाढी अपडेट: नेपाल प्रहरीका अनुसार ${ne(C.TOLL.deadNepal)} जनाको मृत्यु पुष्टि, ${ne(C.TOLL.missing)} जना बेपत्ता सूचीमा। जिल्लागत विवरण, कारण, क्षति, आपतकालीन नम्बर र राहत।`;
  return {
    path, title, description: desc, lastmod: ctx.modified, priority: '0.9', changefreq: 'hourly',
    alternates: [{ hreflang: 'en', path: '/nepal-flood/rasuwa/' }, { hreflang: 'ne', path: '/ne/' }],
    html: page({
      path, lang: 'ne', title, description: desc,
      h1: 'रसुवा बाढी, २०२६',
      lede: '२०२६ अगस्ट २६ मा तिब्बततर्फबाट भोटेकोशी हुँदै रसुवामा बाढी पस्यो। के पुष्टि भयो, के अझै थाहा छैन, र कसलाई फोन गर्ने, यहाँ छ।',
      crumbs: [{ label: 'नेपाल डिजास्टर अपडेट', href: '/' }, { label: 'रसुवा बाढी' }],
      statusPill: 'live',
      updatedNote: `<b>${esc(SITE_NAME)}</b><span>आधिकारिक बुलेटिन र नाम खुलेका सञ्चारमाध्यमबाट</span><span>अन्तिम जाँच ${esc(neTime(ctx.modified))}</span>`,
      published: '2026-08-26T12:00:00+05:45',
      modified: ctx.modified,
      alternates: [
        { hreflang: 'en', path: '/nepal-flood/rasuwa/' },
        { hreflang: 'ne', path: '/ne/' },
      ],
      body,
      schema: [
        {
          '@type': 'NewsArticle',
          '@id': `${SITE}${path}#article`,
          headline: `रसुवा बाढी: ${ne(C.TOLL.deadNepal)} जनाको मृत्यु पुष्टि`,
          description: desc,
          inLanguage: 'ne-NP',
          isAccessibleForFree: true,
          datePublished: '2026-08-26T12:00:00+05:45',
          dateModified: ctx.modified,
          author: ORG,
          publisher: ORG,
          mainEntityOfPage: { '@id': `${SITE}${path}#webpage` },
          image: [`${SITE}/og-image.png`],
          about: [
            {
              '@type': 'Event',
              name: '2026 Rasuwa flash flood',
              startDate: '2026-08-26T09:00:00+05:45',
              eventStatus: 'https://schema.org/EventScheduled',
              eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
              location: {
                '@type': 'Place',
                name: 'Rasuwa District, Bagmati Province, Nepal',
                address: { '@type': 'PostalAddress', addressRegion: 'Bagmati Province', addressCountry: 'NP' },
                geo: { '@type': 'GeoCoordinates', latitude: 28.15, longitude: 85.35 },
              },
            },
          ],
        },
        faq.node,
      ],
    }),
  };
}

/* -- /ne/aapatkalin-number/ ------------------------------------------------- */

export function neEmergency(ctx) {
  const path = '/ne/aapatkalin-number/';
  const faq = faqBlock([
    {
      q: 'नेपालको आपतकालीन नम्बर कति हो?',
      a: '<p><strong>१००</strong> नेपाल प्रहरीको नम्बर हो र सामान्य आपतकालका लागि यही हो। कुनै पनि मोबाइलबाट <strong>११२</strong> ले पनि आपतकालीन सेवा जोड्छ। कुन नम्बर हो सम्झिन नसक्दा यही थिच्नुहोस्। एम्बुलेन्सका लागि <strong>१०२</strong>, आगलागीका लागि <strong>१०१</strong>।</p>',
    },
    {
      q: 'विपद्को हटलाइन कति हो?',
      a: '<p><strong>११४९</strong> राष्ट्रिय आपतकालीन कार्य सञ्चालन केन्द्र (NEOC) को विपद् हटलाइन हो। <strong>११५५</strong> नेपाल प्रहरीको निःशुल्क सार्वजनिक हेल्पलाइन हो। दुवै राष्ट्रिय नम्बर हुन् र निःशुल्क छन्।</p>',
    },
    {
      q: 'पर्यटकका लागि छुट्टै नम्बर छ?',
      a: '<p>छ। <strong>११४४</strong> पर्यटक प्रहरीको नम्बर हो। प्रभावित क्षेत्रमा पदयात्रा गरिरहेको कसैको खोजी गर्नुपरे यो नम्बर र काठमाडौंस्थित सम्बन्धित देशको दूतावास दुवैतिर सम्पर्क गर्नुहोस्।</p>',
    },
    {
      q: 'विदेशी सिमकार्डबाट यी नम्बर लाग्छन्?',
      a: '<p>११२ कुनै पनि नेटवर्कको कुनै पनि मोबाइल हयान्डसेटबाट लाग्ने गरी बनाइएको हो। बाँकी छोटो नम्बर (१००, १०१, १०२, १०३, ११४४, ११४९, ११५५) नेपालभित्र एरिया कोडबिना नै लाग्छन्। ठूलो घटनाका बेला लाइन व्यस्त हुन सक्छ; त्यस्तो अवस्थामा १०० वा ११२ प्रयास गर्नुहोस्।</p>',
    },
  ]);

  const body = `
${DIAL_STRIP}

<h2>सबै राष्ट्रिय आपतकालीन नम्बर</h2>
${table(['नम्बर', 'कसले उठाउँछ', 'कुन कामका लागि'], NE_EMERGENCY.map(([nd, raw, who, note]) =>
    [`<a href="tel:${raw}"><strong class="num">${nd}</strong></a>`, esc(who), esc(note)]),
    'नेपालभित्र जहाँबाट पनि एरिया कोडबिना लाग्ने राष्ट्रिय नम्बर।')}
<p class="faint">१००, १०१, १०२, १०३ र ११२ सार्वजनिक आपतकालीन नम्बर दर्तासँग मिलाएर जाँचिएका हुन्। ११४९, ११५५ र ११४४ राष्ट्रिय आपतकालीन कार्य सञ्चालन केन्द्र र नेपाल प्रहरीका प्रकाशित हटलाइन हुन्। लाइन व्यस्त भए १०० वा ११२ प्रयास गर्नुहोस्।</p>

<h2>जिल्ला र अस्पतालका नम्बर</h2>
<p>राष्ट्रिय नम्बरभन्दा तलका नम्बर जिल्ला र अस्पतालअनुसार फरक हुन्छन् र फेरिइरहन्छन्। त्यसैले यहाँ अङ्क छापिएको छैन। बरु ती नम्बर आफैँ प्रकाशित र अद्यावधिक गर्ने आधिकारिक निर्देशिकाका लिङ्क छन्। हरेक लिङ्क सरकारी वा रेडक्रसको पृष्ठ हो।</p>
<div class="sourcelinks">
  <a href="https://neoc.gov.np/" target="_blank" rel="noopener nofollow">राष्ट्रिय आपतकालीन कार्य सञ्चालन केन्द्र &#8599;</a>
  <a href="https://bipad.gov.np/" target="_blank" rel="noopener nofollow">BIPAD पोर्टल, जिल्लागत सम्पर्क &#8599;</a>
  <a href="https://www.nepalpolice.gov.np/index.php/contact-us" target="_blank" rel="noopener nofollow">नेपाल प्रहरी, जिल्ला कार्यालय निर्देशिका &#8599;</a>
  <a href="https://www.nrcs.org/" target="_blank" rel="noopener nofollow">नेपाल रेडक्रस सोसाइटी &#8599;</a>
  <a href="https://mohp.gov.np/" target="_blank" rel="noopener nofollow">स्वास्थ्य मन्त्रालय, अस्पताल निर्देशिका &#8599;</a>
  <a href="https://www.aponepal.gov.np/" target="_blank" rel="noopener nofollow">सशस्त्र प्रहरी बल नेपाल &#8599;</a>
  <a href="https://www.nepalarmy.mil.np/" target="_blank" rel="noopener nofollow">नेपाली सेना &#8599;</a>
</div>

<h2>आपत् आउनुअघि गर्ने काम</h2>
<p>यो पृष्ठको सबैभन्दा उपयोगी काम यही हो: पढ्न छाडेर १००, ११२ र ११४९ अहिल्यै फोनमा सेभ गर्नुहोस्। घटना हुँदा नेटवर्क व्यस्त हुन्छ र वेब पृष्ठ फोनमा सबैभन्दा ढिलो कुरा हो। सेभ गरिएको सम्पर्कलाई नेटवर्क चाहिँदैन।</p>
<div class="checklist">
${NE_HAZARD_STEPS.map((s, i) => `<div class="check-row"><span class="mark">${ne(String(i + 1).padStart(2, '0'))}</span><p>${esc(s)}</p></div>`).join('\n')}
</div>

<h2>प्रायः सोधिने प्रश्न</h2>
${faq.html}

<p><a href="/nepal-flood/emergency-numbers/">This page in English</a></p>
`;

  const title = 'नेपालका आपतकालीन नम्बर: प्रहरी १००, एम्बुलेन्स १०२, विपद् ११४९';
  const desc = 'नेपालका सबै राष्ट्रिय आपतकालीन नम्बर र कुन कामका लागि हो: प्रहरी १००, मोबाइलबाट ११२, एम्बुलेन्स १०२, दमकल १०१, विपद् हटलाइन ११४९, हेल्पलाइन ११५५, पर्यटक प्रहरी ११४४।';
  return {
    path, title, description: desc, lastmod: ctx.buildDay, priority: '0.8', changefreq: 'monthly',
    alternates: [{ hreflang: 'en', path: '/nepal-flood/emergency-numbers/' }, { hreflang: 'ne', path: '/ne/aapatkalin-number/' }],
    html: page({
      path, lang: 'ne', title, description: desc,
      h1: 'नेपालका आपतकालीन नम्बर',
      lede: 'कुनै पनि नम्बरमा थिच्नासाथ फोन लाग्छ। यी राष्ट्रिय नम्बर हुन् र नेपालभित्र जुनसुकै फोनबाट लाग्छन्। यी विपद्अनुसार फेरिँदैनन्। अहिल्यै सेभ गर्नुहोस्।',
      crumbs: [{ label: 'नेपाल डिजास्टर अपडेट', href: '/' }, { label: 'रसुवा बाढी', href: '/ne/' }, { label: 'आपतकालीन नम्बर' }],
      published: '2026-08-26T12:00:00+05:45',
      modified: ctx.modified,
      alternates: [
        { hreflang: 'en', path: '/nepal-flood/emergency-numbers/' },
        { hreflang: 'ne', path: '/ne/aapatkalin-number/' },
      ],
      body,
      schema: [faq.node],
    }),
  };
}

/* -- /ne/bepatta/ ----------------------------------------------------------- */

export function neMissing(ctx) {
  const path = '/ne/bepatta/';
  const body = `
<div class="callout callout-alert">
  <p class="callout-title">अहिल्यै खबर गर्न</p>
  <p>नजिकको जिल्ला प्रहरी कार्यालय वा <strong>१००</strong> मा फोन गर्नुहोस्। नेपालबाहिरबाट भए पहिले काठमाडौंस्थित आफ्नो देशको दूतावासमा सम्पर्क गर्नुहोस्। दूतावासले विदेशी नागरिकबारे नेपाल प्रहरीसँग सिधै समन्वय गर्छ।</p>
  <div class="dialrow" style="margin-top:12px;margin-bottom:0;">
    <a class="dial" href="tel:100"><b>१००</b><span>नेपाल प्रहरी</span></a>
    <a class="dial" href="tel:1155"><b>११५५</b><span>प्रहरी हेल्पलाइन</span></a>
    <a class="dial" href="tel:1144"><b>११४४</b><span>पर्यटक प्रहरी</span></a>
    <a class="dial" href="tel:1149"><b>११४९</b><span>विपद् हटलाइन</span></a>
  </div>
</div>

<h2>बेपत्ता सूचीमा को छन्</h2>
<p>NDRRMA को ${esc(MISSING_NE)} को अपडेटमा नेपालभित्र <strong>${ne(C.TOLL.missing)} जना</strong> सम्पर्कविहीन सूचीमा छन्।</p>
${table(['समूह', 'बेपत्ता सूचीमा'], C.MISSING_BREAKDOWN.map(([k, n]) => [esc(NE_MISSING_GROUPS[k] || k), `<span class="num">${ne(n)}</span>`]).concat([['<strong>त्यो सूचीको जम्मा</strong>', `<strong class="num">${ne(C.MISSING_BREAKDOWN_TOTAL)}</strong>`]]), `नेपाल प्रहरी, ${esc(MISSING_BREAKDOWN_NE)}। NDRRMA को पछिल्लो सङ्ख्या ${ne(C.TOLL.missing)} हो, तर नयाँ विवरण आएको छैन।`)}
<p>बेपत्ता ५७९ यात्रुमध्ये ४६६ विदेशी र ११३ नेपाली नागरिक हुन्। विदेशी यात्रुहरूमध्ये धेरैजसो तिब्बत हुँदै <strong>कैलाश मानसरोवर</strong> जाने बाटोमा थिए, जुन रसुवागढी नाका हुँदै जान्छ। भारतका कम्तीमा ${ne(C.TOLL.missingIndian)}, मलेसियाका ५५, अमेरिकाका ४७, अष्ट्रेलियाका ३४, बेलायतका ३३ र क्यानडाका २४ नागरिक सूचीमा छन्।</p>
<p>यसबाहेक ६० जलविद्युत् आयोजनाका कामदार, २६ बैंक कर्मचारी र तिमुरेको भन्सार कार्यालयका १५ कर्मचारी छुट्टै सम्पर्कविहीन भनिएका छन्। तिनलाई माथिको जम्मामा नजोड्नुहोस्।</p>
<p>चिनियाँ सञ्चारमाध्यमका अनुसार तिब्बततर्फ ग्याइरोङ बन्दरगाह वरिपरि थप <strong>${ne(C.TOLL.missingChina)} जना</strong> बेपत्ता छन्, जसमध्ये ${ne(C.TOLL.missingChinaForeign)} विदेशी नागरिक हुन्।</p>

<div class="callout">
  <p class="callout-title">यो सङ्ख्या पढ्दा दुई कुरा मनमा राख्नुहोस्</p>
  <p><strong>सम्पर्कविहीन हुनु भनेको मृत्यु होइन।</strong> भोटेकोशी र त्रिशूली बेँसीभरि फोन, बिजुली र इन्टरनेट बन्द छ र बिस्तारै मात्र फर्किँदै छ। सूचीको ठूलो हिस्सा कसैले सम्पर्क गर्न नसकेका मानिस हुन्।</p>
  <p><strong>यो सङ्ख्या र मृत्यु सङ्ख्या एउटै NDRRMA अपडेटका हुन्।</strong> सम्पर्कविहीन हुनु मृत्यु पुष्टि हुनु होइन। नयाँ समूहगत विवरण आएको छैन, र यो साइटले अनुमान गर्दैन।</p>
</div>

<h2>बेपत्ता व्यक्तिको खबर कसरी गर्ने</h2>
<div class="checklist">
${NE_MISSING_STEPS.map((s, i) => `<div class="check-row"><span class="mark">${ne(String(i + 1).padStart(2, '0'))}</span><p>${esc(s)}</p></div>`).join('\n')}
</div>

<h3>के-के जानकारी तयार राख्ने</h3>
<ul>
  <li>नागरिकता वा राहदानीमा लेखिएको पूरा नाम, र स्थानीय रूपमा प्रयोग हुने अरू नाम वा हिज्जे।</li>
  <li>उमेर, र भएमा हालैको फोटो।</li>
  <li>अन्तिम पटक कहाँ थिए र कति बजे सम्पर्क भएको थियो। अनुमानित घण्टाले पनि खोजी क्षेत्र साँघुरो बनाउँछ।</li>
  <li>के लगाएका थिए, र चिनिने कुनै कुरा: झोला, ज्याकेटको रङ, गाडीको नम्बर।</li>
  <li>उनीहरूको मोबाइल नम्बर र नेटवर्क, र सँगै यात्रा गरेकाहरूको नम्बर।</li>
  <li>रसुवागढीबाट चीनतर्फ गएका थिए वा जाने योजना थियो कि थिएन।</li>
</ul>

<h2>विदेशी नागरिक र विदेशमा भएका परिवार</h2>
<p>खोजिएको व्यक्ति नेपाली नागरिक होइन भने सबैभन्दा छिटो बाटो जिल्ला प्रहरी कार्यालय होइन, काठमाडौंस्थित उनीहरूकै देशको दूतावास हो। दूतावाससँग यसैका लागि नेपाल प्रहरीसँग स्थायी माध्यम हुन्छ, र अध्यागमन विभागसँग व्यक्ति साँच्चै त्यो जिल्लामा पसेको थियो कि थिएन भन्ने अभिलेख हुन्छ।</p>
<div class="sourcelinks">
  <a href="https://mofa.gov.np/foreign-mission-in-nepal/" target="_blank" rel="noopener nofollow">नेपालका दूतावासहरूको आधिकारिक सूची &#8599;</a>
  <a href="https://www.immigration.gov.np/" target="_blank" rel="noopener nofollow">अध्यागमन विभाग &#8599;</a>
  <a href="https://www.nepalpolice.gov.np/index.php/contact-us" target="_blank" rel="noopener nofollow">नेपाल प्रहरी जिल्ला कार्यालय &#8599;</a>
</div>

<h2>यो साइटले बेपत्ताको नामावली किन छाप्दैन</h2>
<p>सामाजिक सञ्जालबाट नाम टिपेर यहाँ राख्न सजिलो हुन्थ्यो, र त्यो गलत हुन्थ्यो। पुष्टि नभएका नामहरू सार्वजनिक गर्दा तीन किसिमको हानि हुन्छ: परिवार ठगी र नचाहेको प्रचारमा पर्छन्, व्यक्ति भेटिइसकेपछि पनि नाम घुमिरहन्छ, र उद्धार टोलीले वास्तवमा प्रयोग गर्ने आधिकारिक सूचीसँग यो प्रतिस्पर्धा गर्छ।</p>
<p>काम लाग्ने सूची नेपाल प्रहरी र वडा कार्यालयसँग भएको सूची हो। कसैको बारेमा जानकारी छ भने, देखेको होस्, कुनै आश्रयस्थलमा पुगेको होस्, वा सकुशल भएको खबर होस्, त्यो जुन प्रहरी कार्यालयमा उजुरी दर्ता भएको थियो त्यहीँ दिनुहोस्। सूची छोटो बनाउने त्यही हो।</p>

<h2>ठगीबाट जोगिनुहोस्</h2>
<p>"तपाईंको आफन्त भेटियो, ओसारपसारका लागि पैसा पठाउनुहोस्" भन्ने नक्कली सन्देश हरेक विपद्पछि आउँछन्। नेपाल प्रहरीले बेपत्ता व्यक्ति खोज्न पैसा माग्दैन। कुनै पनि वैध उद्धार संस्थाले माग्दैन। त्यस्तो सन्देश आए जुन प्रहरी कार्यालयमा दर्ता गर्नुभएको थियो, त्यहीँ जानकारी दिनुहोस्।</p>

<p><a href="/nepal-flood/rasuwa/missing-persons/">This page in English</a></p>
`;

  const title = `रसुवा बाढी: बेपत्ता व्यक्तिको खबर कसरी गर्ने`;
  const desc = `रसुवा बाढीपछि नेपालमा ${ne(C.TOLL.missing)} जना बेपत्ता सूचीमा छन्, चीनतर्फ थप ${ne(C.TOLL.missingChina)}। नेपाल प्रहरीमा बेपत्ता व्यक्तिको खबर कसरी गर्ने, के जानकारी चाहिन्छ, र विदेशी नागरिकका लागि बाटो।`;
  return {
    path, title, description: desc, lastmod: ctx.modified, priority: '0.8', changefreq: 'daily',
    alternates: [{ hreflang: 'en', path: '/nepal-flood/rasuwa/missing-persons/' }, { hreflang: 'ne', path: '/ne/bepatta/' }],
    html: page({
      path, lang: 'ne', title, description: desc,
      h1: 'बेपत्ता व्यक्ति: रसुवा बाढी',
      lede: `नेपाल प्रहरीको सूचीमा ${ne(C.TOLL.missing)} जना छन्। यो सूचीमा को छन्, यो सङ्ख्याको अर्थ के हो, र खबर गर्ने ठ्याक्कै तरिका, नेपालभित्र र बाहिरबाट दुवै।`,
      crumbs: [{ label: 'नेपाल डिजास्टर अपडेट', href: '/' }, { label: 'रसुवा बाढी', href: '/ne/' }, { label: 'बेपत्ता' }],
      statusPill: 'live',
      updatedNote: `<b>${esc(SITE_NAME)}</b><span>नेपाल प्रहरीका बुलेटिनबाट</span><span>अन्तिम जाँच ${esc(neTime(ctx.modified))}</span>`,
      published: '2026-08-26T16:00:00+05:45',
      modified: ctx.modified,
      alternates: [
        { hreflang: 'en', path: '/nepal-flood/rasuwa/missing-persons/' },
        { hreflang: 'ne', path: '/ne/bepatta/' },
      ],
      body,
      schema: [{
        '@type': 'NewsArticle',
        '@id': `${SITE}${path}#article`,
        headline: title,
        description: desc,
        inLanguage: 'ne-NP',
        isAccessibleForFree: true,
        datePublished: '2026-08-26T16:00:00+05:45',
        dateModified: ctx.modified,
        author: ORG, publisher: ORG,
        mainEntityOfPage: { '@id': `${SITE}${path}#webpage` },
        image: [`${SITE}/og-image.png`],
      }],
    }),
  };
}

/* -- /ne/rahat/ ------------------------------------------------------------- */

export function neRelief(ctx) {
  const path = '/ne/rahat/';
  const bankTable = (rows) => table(['बैंक', 'खाता नम्बर'], rows.map(([b, accs]) =>
    [esc(b), accs.map(a => `<span class="num">${esc(a)}</span>`).join('<br>')]));

  const body = `
<div class="callout">
  <p class="callout-title">यो साइटले पैसा लिँदैन</p>
  <p>यहाँ कुनै दान बटन छैन र कुनै भुक्तानी प्रणाली छैन। तलका सबै खाता नेपाल सरकारका हुन्, प्रधानमन्त्री कार्यालयले आफैँ प्रकाशित गरेको सामग्रीबाट २६ अगस्ट २०२६ मा हातैले उतारिएका। पैसा पठाउनुअघि बैंकमा खाताको नाम मिल्छ कि मिल्दैन जाँच्नुहोस्।</p>
</div>

<h2>प्रधानमन्त्री प्राकृतिक विपद् उद्धार कोष</h2>
<p>विपद्को उद्धार र पुनर्निर्माणका लागि नेपाल सरकारकै कोष, प्रधानमन्त्री तथा मन्त्रिपरिषद्को कार्यालयले चलाउने। यो साइटले सिफारिस गर्ने एउटै माध्यम यही हो, किनभने खाता आधिकारिक प्रकाशित स्रोतसँग मिलाएर जाँच्न सकिने यही एउटा हो।</p>
<div class="callout">
  <p class="callout-title">विदेशबाट कार्डबाट सहयोग गर्ने बाटो</p>
  <p>सरकारले २७ अगस्ट २०२६ मा अनलाइन दान गेटवे खोलेको छ: <a href="${esc(C.RELIEF_PORTAL.url)}" target="_blank" rel="noopener"><span class="num">${esc(C.RELIEF_PORTAL.host)}</span></a>। यो प्रधानमन्त्री तथा मन्त्रिपरिषद्को कार्यालयका लागि नेपाल क्लियरिङ हाउसले चलाउँछ। अन्तर्राष्ट्रिय र नेपाली कार्ड, NepalPay QR, connectIPS, मोबाइल बैंकिङ र वालेट चल्छन्। रकम नेपाली रुपैयाँमा काटिन्छ, त्यसैले तपाईंको बैंकले आफ्नै दरमा साट्छ।</p>
  <p>यो साइटमा भएको एक मात्र भुक्तानी लिंक यही हो, र यो यहाँ छ किनभने प्रधानमन्त्री कार्यालयले आफैँले प्रकाशित गरेको हो। बाढीको नाममा पैसा माग्ने अरू कुनै सन्देशको जिम्मा यो साइट लिँदैन।</p>
  <p class="faint">पुरानो ठेगाना <span class="num">pmrelief.opmcm.gov.np</span> अझै खुल्दैन, २८ अगस्ट २०२६ मा जाँचिएको।</p>
</div>
${bankTable(C.RELIEF_BANKS)}
<p class="faint">प्रधानमन्त्री राहत कोष (सामान्य कोष, विपद्-विशेष होइन):</p>
${bankTable(C.RELIEF_BANKS_GENERAL)}

<h3>आधिकारिक QR</h3>
<p><img src="/qr-pmo-nepal.png" alt="नेपाल सरकारको प्रधानमन्त्री तथा मन्त्रिपरिषद्को कार्यालयले प्रकाशित गरेको प्राकृतिक विपद् उद्धार कोषको आधिकारिक दान QR" width="556" height="472" loading="lazy" decoding="async" style="max-width:340px;height:auto;border:1px solid var(--border);border-radius:14px;padding:10px;background:#fff;"></p>
<p class="faint">प्रधानमन्त्री तथा मन्त्रिपरिषद्को कार्यालयबाट, २६ अगस्ट २०२६ मा लिइएको।</p>

<h2>सरकारले अहिलेसम्म निकासा गरेको</h2>
${table(['कहाँ', 'रकम'], [
    ['केन्द्रीय विपद् राहत कोष', '<span class="num">रु १ अर्ब</span>'],
    ['रसुवा जिल्ला', '<span class="num">रु १ करोड</span>'],
    ['नुवाकोट जिल्ला', '<span class="num">रु १ करोड</span>'],
    ['धादिङ जिल्ला', '<span class="num">रु ५० लाख</span>'],
  ], '२६ अगस्ट २०२६ मा घोषणा। आधिकारिक जम्मा प्रकाशित नभएसम्म सर्वसाधारणको दान यहाँ गनिँदैन।')}
<p>यसलाई क्षतिको सङ्ख्यासँग नमिसाउनुहोस्। <strong>रु २०० अर्ब</strong> भनेको बाढीले सडक र पुलमा गरेको <em>क्षति</em>को प्रारम्भिक अनुमान हो; <strong>रु १ अर्ब</strong> भनेको राहतका लागि <em>निकासा</em> भएको रकम। यी दुई फरक कुरा हुन् र यो साइटमा कहिल्यै जोडिँदैनन्।</p>

<h2>पैसाबाहेकको सहयोग</h2>
<div class="cards">
  <div class="card"><h3>रगत</h3><p>कुनै पनि विपद्पछि रगत चाहिन्छ। नेपाल रेडक्रस सोसाइटीले काठमाडौं र जिल्लाहरूमा सङ्कलन गर्छ।</p></div>
  <div class="card"><h3>पुष्टि भएको जानकारी</h3><p>मिति र ठाउँ खुलेको स्थानीय फोटो, प्रहरीलाई दिइएको बेपत्ताको विवरण, र आश्रयस्थलको खबर। उद्धार टोलीले काम गर्ने यही आधारमा हो। पहिलो हप्तामा सही जानकारी पैसाभन्दा दुर्लभ हुन्छ।</p></div>
  <div class="card"><h3>खुला इजाजतका फोटो</h3><p>प्रभावित क्षेत्रको फोटो खिच्नुभएको छ भने Wikimedia Commons मा खुला इजाजतसहित राख्नुहोस्। त्यसपछि एउटा मात्र होइन, हरेक सञ्चारमाध्यम र सहयोग संस्थाले प्रयोग गर्न पाउँछन्।</p></div>
</div>

<h2>नक्कली अपिल कसरी चिन्ने</h2>
<p>नेपालमा हरेक विपद्को केही घण्टामै नक्कली राहत अपिल आउँछन्, र तिनी विश्वास लाग्ने खालका हुन्छन्। धेरैजसो यी पाँच जाँचमा फस्छन्:</p>
<ul>
  <li><strong>खाता नम्बर होइन, खाताको नाम जाँच्नुहोस्।</strong> वैध कोषको खाता कुनै व्यक्तिको नाममा हुँदैन, संस्थाकै नाममा हुन्छ।</li>
  <li><strong>व्यक्तिगत वालेटमा शङ्का गर्नुहोस्।</strong> राहत कोषले व्यक्तिगत मोबाइल वालेट नम्बरबाट पैसा उठाउँदैन।</li>
  <li><strong>समयसीमालाई वास्ता नगर्नुहोस्।</strong> "आजै पठाउनुस्, नत्र ढिलो हुन्छ" भन्नु दबाब दिने तरिका हो, राहत सञ्चालन होइन।</li>
  <li><strong>वेबसाइटको ठेगाना ध्यानले हेर्नुहोस्।</strong> एउटा अक्षर वा ड्यास फरक पारेको मिल्दोजुल्दो ठेगाना सबैभन्दा पुरानो चलखेल हो।</li>
  <li><strong>सरकारी स्रोतसँग मिलाउनुहोस्।</strong> अपिललाई आधिकारिक प्रकाशित पृष्ठसम्म पछ्याउन सकिँदैन भने त्यसलाई अपुष्ट मान्नुहोस्।</li>
</ul>
<p>नेपाल प्रहरीले बेपत्ता व्यक्ति खोज्न पैसा माग्दैन। कुनै पनि वैध उद्धार संस्थाले माग्दैन।</p>

<div class="sourcelinks">
  <a href="https://www.opmcm.gov.np/" target="_blank" rel="noopener nofollow">प्रधानमन्त्री तथा मन्त्रिपरिषद्को कार्यालय &#8599;</a>
  <a href="https://ndrrma.gov.np/" target="_blank" rel="noopener nofollow">राष्ट्रिय विपद् जोखिम न्यूनीकरण तथा व्यवस्थापन प्राधिकरण &#8599;</a>
  <a href="https://www.nrcs.org/" target="_blank" rel="noopener nofollow">नेपाल रेडक्रस सोसाइटी &#8599;</a>
</div>

<p><a href="/nepal-flood/relief/">This page in English</a></p>
`;

  const title = 'बाढी राहत: सरकारी कोषमा सुरक्षित तरिकाले सहयोग कसरी गर्ने';
  const desc = 'प्रधानमन्त्री प्राकृतिक विपद् उद्धार कोषमा सहयोग कसरी गर्ने: प्रधानमन्त्री कार्यालयकै सामग्रीबाट लिइएका आधिकारिक बैंक खाता र QR, सरकारले निकासा गरेको रकम, र नक्कली अपिल कसरी चिन्ने।';
  return {
    path, title, description: desc, lastmod: ctx.buildDay, priority: '0.8', changefreq: 'weekly',
    alternates: [{ hreflang: 'en', path: '/nepal-flood/relief/' }, { hreflang: 'ne', path: '/ne/rahat/' }],
    html: page({
      path, lang: 'ne', title, description: desc,
      h1: 'राहत: कसरी सहयोग गर्ने',
      lede: 'यहाँका सबै लिङ्क नेपाल सरकारकै कोषमा जान्छन्। यो साइटले पैसा लिँदैन, र कुन विवरण मिलाएर जाँच्न सकिएन भन्ने कुरा खुलस्त लेख्छ।',
      crumbs: [{ label: 'नेपाल डिजास्टर अपडेट', href: '/' }, { label: 'रसुवा बाढी', href: '/ne/' }, { label: 'राहत' }],
      published: '2026-08-26T12:00:00+05:45',
      modified: ctx.modified,
      alternates: [
        { hreflang: 'en', path: '/nepal-flood/relief/' },
        { hreflang: 'ne', path: '/ne/rahat/' },
      ],
      body,
      schema: [],
    }),
  };
}
