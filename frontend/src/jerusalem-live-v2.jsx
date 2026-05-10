// Jerusalem.live — Task A complete
// Google Maps dark-style redesign: floating chips on map, teardrop pins, navy palette

import { useState, useRef, useCallback, useEffect, useMemo } from "react";

const CATEGORIES = {
  party:   { label: "Parties",     color: "#FF3366", icon: "🎉" },
  music:   { label: "Live Music",  color: "#FF9500", icon: "🎸" },
  market:  { label: "Markets",     color: "#30D158", icon: "🛍️" },
  outdoor: { label: "Outdoor",     color: "#64D2FF", icon: "🌿" },
  culture: { label: "Culture",     color: "#BF5AF2", icon: "🎨" },
};

// Week of May 3–9 2026 (day = date number in May)
const DAYS = [
  { day:3, name:"ראשון", date:"3/5" },
  { day:4, name:"שני",   date:"4/5" },
  { day:5, name:"שלישי", date:"5/5" },
  { day:6, name:"רביעי", date:"6/5" },
  { day:7, name:"חמישי", date:"7/5" },
  { day:8, name:"שישי",  date:"8/5" },
  { day:9, name:"שבת",   date:"9/5" },
];

// Real events — המדריך לירושלמי האלטרנטיבי, week of May 3–9 2026
// day = date number in May (3=Sun, 4=Mon … 9=Sat)
const EVENTS = [
  // Sunday 03/05
  { id:1,  day:3, name:"מסע נשימה מעגלית",          en:"Circular Breathwork Journey",              cat:"outdoor", start:10, end:12, x:50,y:40, neighborhood:"City Center",      desc:"לנשום, לשחרר, להרגיש, להביע — עם אליסה קייגן" },
  // Monday 04/05
  { id:2,  day:4, name:"שני ללא תחתית 🍺",          en:"Bottomless Monday @ Shoshana Bar",         cat:"party",   start:20, end:26, x:50,y:37, neighborhood:"Nahalat Shiva",    desc:"משקאות ללא הגבלה. כל יום שני בשושנה בר" },
  { id:3,  day:4, name:"הסטנדאפ האינטרגלקטי",       en:"Intergalactic Stand-Up — Free!",           cat:"culture", start:21, end:23, x:40,y:38, neighborhood:"Mahane Yehuda",    desc:"חוזרים בעונה חדשה — חינם! בר הסמטה" },
  { id:4,  day:4, name:"משחקי קופסא בפאב",          en:"Board Games Night @ HaMifletzet",          cat:"culture", start:19, end:23, x:51,y:35, neighborhood:"City Center",      desc:"ערב משחקי קופסא בפאב המפלצת" },
  { id:5,  day:4, name:"הילולה במגדל דוד ✨",        en:"Lag B'Omer Hilula @ Tower of David",       cat:"party",   start:21, end:26, x:54,y:41, neighborhood:"Old City",         desc:"חפלה מסורתית בל\"ג בעומר — תחריר" },
  { id:6,  day:4, name:"יום הולדת 5 לבארמון 🎉",    en:"Barmon 5th Birthday + DJ Yotam Yariv",     cat:"party",   start:22, end:27, x:65,y:65, neighborhood:"Armon HaNatziv",   desc:"DJ יותם יברוב — בארמון, פאב קהילתי" },
  { id:7,  day:4, name:"ירושלים צוחקת בבלייז",      en:"Jerusalem Laughs @ Blaze Bar",             cat:"culture", start:21, end:23, x:48,y:36, neighborhood:"City Center",      desc:"באים לצחוק, לשתות ולהנות :)" },
  // Tuesday 05/05
  { id:8,  day:5, name:"קריוקי שלישי בשושנה 🎤",    en:"Tuesday Karaoke @ Shoshana Bar",           cat:"music",   start:21, end:25, x:50,y:37, neighborhood:"Nahalat Shiva",    desc:"שרות, מזייפות, חוגגות — קריוקי שבועי" },
  { id:9,  day:5, name:"רונית שחר — מופע אינטימי",  en:"Ronit Shachar — Intimate Concert",         cat:"music",   start:20, end:22, x:51,y:35, neighborhood:"City Center",      desc:"שירים מוכרים וחדשים — פאב המפלצת" },
  { id:10, day:5, name:"ערב סטנדאפ בבסרביה",        en:"Stand-Up Night @ Bessarabia",              cat:"culture", start:21, end:23, x:41,y:37, neighborhood:"Mahane Yehuda",    desc:"ערב הסטנדאפ החמים" },
  { id:11, day:5, name:"עוּד, קאנון ונשיפה — מזקקה", en:"Oud, Kanon & Winds @ Mazkeka",            cat:"music",   start:20, end:22, x:50,y:33, neighborhood:"Russian Compound", desc:"מסע מוזיקלי עכשווי — שורשים, קצב וחדשנות" },
  // Wednesday 06/05
  { id:12, day:6, name:"איך מספרים מלחמה?",         en:"How Do We Tell War? — Discussion Series",  cat:"culture", start:18, end:21, x:33,y:41, neighborhood:"Givat Ram",        desc:"שלושה מבטים — מוזיאון ארצות המקרא" },
  { id:13, day:6, name:"ערב רווקים רווקות 30+",     en:"Singles Night 30+ @ Glen Bar",             cat:"party",   start:20, end:24, x:49,y:37, neighborhood:"City Center",      desc:"ערב מפגש לבני 30+ — גלן בר ויסקי" },
  { id:14, day:6, name:"בוריס שולמן — גיטרה סולו",  en:"Boris Schulman — Solo Guitar Show",        cat:"music",   start:21, end:23, x:51,y:35, neighborhood:"City Center",      desc:"גיטריסט וירטואוז, זמר ויוצר — פאב המפלצת" },
  // Thursday 07/05
  { id:15, day:7, name:"סדנת סריגת פרחים",          en:"Flower Knitting Workshop @ Hansen House",  cat:"culture", start:17, end:20, x:46,y:50, neighborhood:"German Colony",    desc:"בהשראת ״רקמה של כאב וחוטים״ — בית הנסן" },
  { id:16, day:7, name:"שירים להפסיק את האש",       en:"Songs to Stop the Fire — Poetry & Music",  cat:"culture", start:19, end:21, x:21,y:57, neighborhood:"Ein Karem",        desc:"צוף / זוהר / ענבל בהופעה והקראת שירה — בית הגת" },
  { id:17, day:7, name:"MITCH EL — אלקטרו פופ",     en:"MITCH EL — Live Electro Pop",              cat:"music",   start:21, end:24, x:51,y:35, neighborhood:"City Center",      desc:"אלקטרו פופ חי, חושי ומסעיר — פאב המפלצת" },
  { id:18, day:7, name:"הליכות ג'יין ירושלים 🚶",   en:"Jane's Walk Jerusalem Festival",           cat:"outdoor", start:9,  end:17, x:48,y:38, neighborhood:"City Center",      desc:"פסטיבל הליכות עירוניות מונחות ברחבי ירושלים" },
  { id:19, day:7, name:"יהוא ירון ולהקת-העל",       en:"Yahu Yaron Super Band — Rock",             cat:"music",   start:21, end:24, x:50,y:33, neighborhood:"Russian Compound", desc:"רוק עוצמתי, בלדות חודרות, מסע רגשי — מזקקה" },
  // Friday 08/05
  { id:23, day:8, name:"הליכות ג'יין ירושלים 🚶",   en:"Jane's Walk Jerusalem Festival",           cat:"outdoor", start:9,  end:17, x:48,y:38, neighborhood:"City Center",      desc:"פסטיבל הליכות עירוניות מונחות ברחבי ירושלים" },
  // Saturday 09/05
  { id:20, day:9, name:"סדנת עיסוי בטבע 🌿",        en:"Outdoor Massage Workshop @ Beit HaKerem",  cat:"outdoor", start:10, end:13, x:29,y:44, neighborhood:"Beit HaKerem",     desc:"הפחתת סטרס עם מיכאל רוסלר" },
  { id:21, day:9, name:"גיבורות על הפלמ\"ח",        en:"Feminist Walking Tour — Palmach St.",      cat:"outdoor", start:10, end:12, x:43,y:50, neighborhood:"Katamon",          desc:"שיטוט ברחוב הכי פמיניסטי בעולם — שישי בעשר" },
  { id:22, day:9, name:"תמר אפק והטריו החדש 🎸",    en:"Tamar Epek New Trio — Rock @ Mazkeka",    cat:"music",   start:21, end:24, x:50,y:33, neighborhood:"Russian Compound", desc:"רוקנרול מדויק, פרוע ומיוזע במזקקה!" },
  { id:24, day:9, name:"הליכות ג'יין ירושלים 🚶",   en:"Jane's Walk Jerusalem Festival",           cat:"outdoor", start:9,  end:17, x:48,y:38, neighborhood:"City Center",      desc:"פסטיבל הליכות עירוניות מונחות ברחבי ירושלים" },
];

const NEIGHBORHOODS = [
  { name:"Mahane Yehuda",   x:35,y:36 }, { name:"Nachlaot",        x:30,y:44 },
  { name:"Nahalat Shiva",   x:51,y:35 }, { name:"German Colony",   x:44,y:55 },
  { name:"Musrara",         x:58,y:26 }, { name:"Talpiot",         x:60,y:62 },
  { name:"Ein Karem",       x:20,y:54 }, { name:"Katamon",         x:42,y:50 },
  { name:"Russian Compound",x:50,y:32 }, { name:"Givat Ram",       x:33,y:40 },
  { name:"Old City",        x:56,y:42 }, { name:"Armon HaNatziv",  x:65,y:63 },
  { name:"Beit HaKerem",    x:29,y:43 }, { name:"City Center",     x:50,y:37 },
];

// Google Maps dark palette
const MAP_NAVY    = "#1a1c2e";
const MAP_ROAD    = "#2d3047";
const MAP_BLOCK   = "#1e2035";
const MAP_WATER   = "#172033";
const MAP_PARK    = "#1a2a1e";

const STREET_PATHS = [
  "M10,30 Q35,27 55,32 Q70,36 88,29","M8,45 Q30,42 52,44 Q70,46 90,41",
  "M10,58 Q33,55 56,57 Q74,59 88,54","M28,15 Q31,35 34,52 Q36,65 37,82",
  "M47,12 Q49,30 50,48 Q51,62 52,80","M64,18 Q63,36 61,52 Q60,65 62,80",
  "M20,37 Q40,35 62,39","M23,52 Q42,50 64,53","M34,26 Q48,40 56,57",
  "M41,28 Q37,44 39,62","M57,33 Q61,47 59,63","M18,22 Q45,20 72,24",
];

// City block polygons for Google Maps feel
const CITY_BLOCKS = [
  "M30,20 L45,18 L47,30 L32,32 Z",
  "M50,22 L65,20 L66,32 L51,33 Z",
  "M20,35 L33,33 L34,45 L21,46 Z",
  "M48,36 L62,34 L63,47 L49,48 Z",
  "M33,48 L46,47 L47,58 L34,59 Z",
  "M52,50 L66,48 L67,60 L53,61 Z",
  "M22,50 L32,49 L32,58 L22,57 Z",
  "M63,22 L75,20 L76,32 L64,33 Z",
];

const NOW_HOUR  = 21;
const DAY_START = 6;
const DAY_END   = 30;
const USER_X = 50, USER_Y = 45;
const TICK_H = 24;
const LONG_PRESS_MS = 400;

function dist(ev) { return Math.sqrt((ev.x-USER_X)**2+(ev.y-USER_Y)**2); }
function hourLabel(h) { const r=((h%24)+24)%24; return r===0?"00:00":r<10?`0${r}:00`:`${r}:00`; }
function normStart(ev) { return ev.start < DAY_START ? ev.start+24 : ev.start; }
function normEnd(ev)   { return ev.end <= ev.start   ? ev.end+24   : ev.end; }
function eventInRange(ev,rs,re) { return normStart(ev)<re && normEnd(ev)>rs; }

function getMapBounds(scale, offset) {
  const halfW=50/scale, halfH=50/scale;
  const cx=50-offset.x/scale, cy=50-offset.y/scale;
  return { minX:cx-halfW, maxX:cx+halfW, minY:cy-halfH, maxY:cy+halfH };
}
function isInMapBounds(ev,b){ return ev.x>=b.minX&&ev.x<=b.maxX&&ev.y>=b.minY&&ev.y<=b.maxY; }

function assignLanes(events) {
  const sorted=[...events].sort((a,b)=>dist(a)-dist(b));
  const lanes=[], laneMap={};
  for (const ev of sorted) {
    const s=normStart(ev),e=normEnd(ev);
    let placed=false;
    for (let li=0;li<lanes.length;li++) {
      if (!lanes[li].some(seg=>s<seg.e&&e>seg.s)) {
        lanes[li].push({s,e}); laneMap[ev.id]=li; placed=true; break;
      }
    }
    if (!placed) { lanes.push([{s,e}]); laneMap[ev.id]=lanes.length-1; }
  }
  return { laneMap, laneCount:lanes.length };
}

// Google Maps-style teardrop pin component
function TearDropPin({ cat, active, selected, hovered, size = 36 }) {
  const color = cat.color;
  const scale = selected ? 1.4 : hovered ? 1.2 : active ? 1 : 0.75;
  const s = size * scale;

  return (
    <svg
      width={s} height={s * 1.35}
      viewBox="0 0 36 49"
      style={{
        filter: selected
          ? `drop-shadow(0 2px 8px ${color}) drop-shadow(0 0 2px rgba(0,0,0,0.8))`
          : hovered
          ? `drop-shadow(0 2px 6px ${color}99) drop-shadow(0 1px 3px rgba(0,0,0,0.7))`
          : active
          ? `drop-shadow(0 2px 5px ${color}66) drop-shadow(0 1px 3px rgba(0,0,0,0.6))`
          : `drop-shadow(0 1px 3px rgba(0,0,0,0.5))`,
        transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        display: "block",
        transformOrigin: "bottom center",
      }}
    >
      {/* Pin shadow ellipse */}
      <ellipse cx="18" cy="47" rx="7" ry="2.5" fill="rgba(0,0,0,0.35)" />
      {/* Pin body teardrop */}
      <path
        d="M18 2 C9.16 2 2 9.16 2 18 C2 28 18 44 18 44 C18 44 34 28 34 18 C34 9.16 26.84 2 18 2 Z"
        fill={selected ? "#fff" : color}
        stroke={selected ? color : "rgba(255,255,255,0.25)"}
        strokeWidth={selected ? 2 : 1}
      />
      {/* White circle inside */}
      <circle cx="18" cy="18" r="11"
        fill={selected ? color : "rgba(255,255,255,0.95)"}
      />
      {/* Icon rendered as text */}
      <text x="18" y="23" textAnchor="middle" fontSize="13" fontFamily="Arial">
        {cat.icon}
      </text>
    </svg>
  );
}

export default function App() {
  const [activeFilters, setActiveFilters] = useState(new Set(Object.keys(CATEGORIES)));
  const [selectedDay, setSelectedDay]   = useState(4); // default Monday — most events
  const [rangeStart, setRangeStart] = useState(6);
  const [rangeEnd,   setRangeEnd]   = useState(30);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [sheetOpen, setSheetOpen]   = useState(false);
  const [layout, setLayout]         = useState("both");
  const [mapScale, setMapScale]     = useState(1);
  const [mapOffset, setMapOffset]   = useState({x:0,y:0});
  const [hoveredId, setHoveredId]   = useState(null);

  const showMap = layout === "map"  || layout === "both";
  const showTL  = layout === "timeline" || layout === "both";
  const tlOnly  = layout === "timeline";

  const PILL_H  = tlOnly ? 30 : 14;
  const PILL_GAP = tlOnly ? 6 : 3;
  const LANE_H  = PILL_H + PILL_GAP;

  const mapRef  = useRef(null);
  const tlRef   = useRef(null);
  const tlDrag  = useRef(null);
  const mapDrag = useRef(null);
  const lpTimer  = useRef(null);
  const lpFired  = useRef(false);
  const lpDownXY = useRef(null);

  const toggleFilter = cat => setActiveFilters(prev=>{
    const n=new Set(prev); n.has(cat)?n.delete(cat):n.add(cat); return n;
  });

  const mapBounds = useMemo(()=>getMapBounds(mapScale,mapOffset),[mapScale,mapOffset]);
  const visibleEvents = EVENTS.filter(ev=>ev.day===selectedDay && activeFilters.has(ev.cat));
  const isActive  = ev => activeFilters.has(ev.cat) && eventInRange(ev,rangeStart,rangeEnd);
  const isInBounds= ev => isInMapBounds(ev,mapBounds);
  const tlEvents  = useMemo(()=>visibleEvents.filter(ev=>isInBounds(ev)),[visibleEvents,mapBounds]);
  const { laneMap, laneCount } = useMemo(()=>assignLanes(tlEvents),[tlEvents]);

  const hToPct = h => ((h-DAY_START)/(DAY_END-DAY_START))*100;
  const pctToH = p => (p/100)*(DAY_END-DAY_START)+DAY_START;

  const clampOff = useCallback((ox,oy,sc)=>{
    const m=(sc-1)*50; return {x:Math.max(-m,Math.min(m,ox)),y:Math.max(-m,Math.min(m,oy))};
  },[]);

  const changeScale = useCallback((delta)=>{
    setMapScale(s=>{ const n=Math.max(1,Math.min(4,s+delta)); setMapOffset(o=>clampOff(o.x,o.y,n)); return n; });
  },[clampOff]);

  useEffect(()=>{
    const el=mapRef.current; if(!el) return;
    const h=e=>{ e.preventDefault(); changeScale(-e.deltaY*0.005); };
    el.addEventListener('wheel',h,{passive:false});
    return ()=>el.removeEventListener('wheel',h);
  },[changeScale]);

  const onMapDown = e=>{
    if(e.button!==0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    mapDrag.current={sx:e.clientX,sy:e.clientY,so:{...mapOffset},moved:false};
  };
  const onMapMove = e=>{
    if(!mapDrag.current||!mapRef.current) return;
    const dx=e.clientX-mapDrag.current.sx,dy=e.clientY-mapDrag.current.sy;
    if(Math.abs(dx)>3||Math.abs(dy)>3) mapDrag.current.moved=true;
    const {width,height}=mapRef.current.getBoundingClientRect();
    setMapOffset(clampOff(mapDrag.current.so.x+dx/width*100,mapDrag.current.so.y+dy/height*100,mapScale));
  };
  const onMapUp = ()=>{ mapDrag.current=null; };

  const onTLMove = e=>{
    if(!tlDrag.current||!tlRef.current) return;
    const rect=tlRef.current.getBoundingClientRect();
    const pct=Math.max(0,Math.min(100,((e.clientX-rect.left)/rect.width)*100));
    const hr=Math.round(pctToH(pct));
    if(tlDrag.current==='start') setRangeStart(Math.min(hr,rangeEnd-1));
    else setRangeEnd(Math.max(hr,rangeStart+1));
  };
  const onTLUp = ()=>{ tlDrag.current=null; };

  const selectEvent = ev=>{ setSelectedEvent(ev); setSheetOpen(true); setHoveredId(null); };
  const closeSheet  = ()=>{ setSheetOpen(false); setTimeout(()=>setSelectedEvent(null),300); };

  const makeEventHandlers = (ev) => ({
    onMouseEnter: () => setHoveredId(ev.id),
    onMouseLeave: () => setHoveredId(null),
    onTouchStart: (e) => {
      lpFired.current = false;
      lpDownXY.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lpTimer.current = setTimeout(() => { lpFired.current = true; setHoveredId(ev.id); }, LONG_PRESS_MS);
    },
    onTouchMove: (e) => {
      const dx = Math.abs(e.touches[0].clientX - (lpDownXY.current?.x ?? 0));
      const dy = Math.abs(e.touches[0].clientY - (lpDownXY.current?.y ?? 0));
      if (dx > 8 || dy > 8) { clearTimeout(lpTimer.current); lpFired.current = false; }
    },
    onTouchEnd: () => {
      clearTimeout(lpTimer.current);
      if (lpFired.current) { setHoveredId(null); lpFired.current = false; }
    },
    onClick: () => { if (!lpFired.current) selectEvent(ev); },
  });

  return (
    <div style={{width:"100%",height:"100dvh",background:MAP_NAVY,display:"flex",flexDirection:"column",fontFamily:"'DM Sans',sans-serif",overflow:"hidden",position:"relative"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

        {/* ── MAP ── */}
        {showMap && (
          <div style={{position:"relative",flex:1,minHeight:0}}>
            <div
              ref={mapRef}
              onPointerDown={onMapDown}
              onPointerMove={onMapMove}
              onPointerUp={onMapUp}
              onPointerCancel={onMapUp}
              style={{
                position:"absolute",inset:0,
                background:MAP_NAVY,
                cursor:mapScale>1?"grab":"default",
                touchAction:"none",
                overflow:"hidden",
              }}
            >
              {/* Map tile */}
              <div style={{
                position:"absolute",inset:0,
                transform:`scale(${mapScale}) translate(${mapOffset.x}%,${mapOffset.y}%)`,
                transformOrigin:"center center",
              }}>
                {/* SVG Map — Google Maps dark style */}
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={{position:"absolute",inset:0}}>
                  {/* Base fill */}
                  <rect width="100" height="100" fill={MAP_NAVY}/>

                  {/* Water body (bottom-left) */}
                  <ellipse cx="12" cy="72" rx="18" ry="14" fill={MAP_WATER} opacity="0.7"/>
                  <ellipse cx="8" cy="65" rx="10" ry="7" fill={MAP_WATER} opacity="0.5"/>

                  {/* Parks (Google Maps green) */}
                  <ellipse cx="24" cy="56" rx="9" ry="7" fill={MAP_PARK} opacity="0.8"/>
                  <ellipse cx="68" cy="34" rx="7" ry="5" fill={MAP_PARK} opacity="0.6"/>
                  <ellipse cx="45" cy="72" rx="6" ry="4" fill={MAP_PARK} opacity="0.6"/>

                  {/* City blocks */}
                  {CITY_BLOCKS.map((d,i)=>(
                    <path key={i} d={d} fill={MAP_BLOCK} opacity="0.9"/>
                  ))}

                  {/* Minor roads */}
                  {STREET_PATHS.slice(6).map((d,i)=>(
                    <path key={`minor-${i}`} d={d} stroke="#232540" strokeWidth="0.6" fill="none" opacity="0.8"/>
                  ))}

                  {/* Major roads */}
                  {STREET_PATHS.slice(0,6).map((d,i)=>(
                    <path key={`major-${i}`} d={d} stroke={MAP_ROAD} strokeWidth={i<3?1.6:1.1} fill="none" strokeLinecap="round"/>
                  ))}

                  {/* Road labels (white, tiny) */}
                  <text x="37" y="27" fill="rgba(255,255,255,0.22)" fontSize="2.2" fontFamily="DM Sans" textAnchor="middle">Jaffa Rd</text>
                  <text x="49" y="43" fill="rgba(255,255,255,0.18)" fontSize="1.8" fontFamily="DM Sans" textAnchor="middle" transform="rotate(-8,49,43)">King George St</text>
                  <text x="63" y="39" fill="rgba(255,255,255,0.16)" fontSize="1.7" fontFamily="DM Sans" textAnchor="middle" transform="rotate(-85,63,39)">Nevi'im St</text>
                </svg>

                {/* Neighborhood labels — Google Maps style */}
                {NEIGHBORHOODS.map(nb=>(
                  <div key={nb.name} style={{
                    position:"absolute",
                    left:`${nb.x}%`,top:`${nb.y}%`,
                    transform:"translate(-50%,-50%)",
                    color:"rgba(255,255,255,0.28)",
                    fontSize:8.5,fontWeight:600,
                    letterSpacing:1.1,
                    textTransform:"uppercase",
                    pointerEvents:"none",
                    whiteSpace:"nowrap",
                    textShadow:"0 1px 3px rgba(0,0,0,0.8)",
                    userSelect:"none",
                  }}>{nb.name}</div>
                ))}

                {/* User location dot — Google Maps blue */}
                <div style={{
                  position:"absolute",
                  left:`${USER_X}%`,top:`${USER_Y}%`,
                  transform:"translate(-50%,-50%)",
                  width:14,height:14,borderRadius:"50%",
                  background:"#4285F4",
                  border:"2.5px solid #fff",
                  boxShadow:"0 2px 8px rgba(66,133,244,0.6)",
                  animation:"gmPulse 2.5s infinite",
                  zIndex:50,
                }}>
                  {/* Accuracy circle */}
                  <div style={{
                    position:"absolute",top:"50%",left:"50%",
                    transform:"translate(-50%,-50%)",
                    width:48,height:48,borderRadius:"50%",
                    background:"rgba(66,133,244,0.12)",
                    border:"1px solid rgba(66,133,244,0.25)",
                    pointerEvents:"none",
                  }}/>
                </div>

                {/* Event pins — Google Maps teardrop style */}
                {[...visibleEvents].sort((a,b)=>normStart(b)-normStart(a)).map(ev=>{
                  const active  = isActive(ev);
                  const inBounds= isInBounds(ev);
                  const sel     = selectedEvent?.id===ev.id;
                  const hov     = hoveredId===ev.id;
                  const cat     = CATEGORIES[ev.cat];
                  const zIdx    = sel?999:hov?998:100-normStart(ev)+DAY_START;
                  const opacity = sel||hov?1:(active&&inBounds)?1:0.18;

                  return (
                    <div key={ev.id}
                      {...makeEventHandlers(ev)}
                      style={{
                        position:"absolute",
                        left:`${ev.x}%`,top:`${ev.y}%`,
                        transform:"translate(-50%,-100%)",
                        zIndex:zIdx, cursor:"pointer",
                        transition:"opacity 0.2s",
                        opacity,
                        userSelect:"none",
                      }}>
                      <TearDropPin
                        cat={cat}
                        active={active && inBounds}
                        selected={sel}
                        hovered={hov}
                        size={30}
                      />
                      {/* Hover tooltip — Google Maps callout style */}
                      {hov&&!sel&&(
                        <div style={{
                          position:"absolute",bottom:"calc(100% + 6px)",left:"50%",
                          transform:"translateX(-50%)",
                          background:"#fff",
                          borderRadius:6,
                          padding:"6px 10px",
                          whiteSpace:"nowrap",
                          pointerEvents:"none",
                          boxShadow:"0 2px 12px rgba(0,0,0,0.45)",
                          zIndex:100,
                          minWidth:120,
                        }}>
                          <div style={{color:"#202124",fontSize:11,fontWeight:700,marginBottom:2}}>{ev.en}</div>
                          <div style={{color:"#5f6368",fontSize:10}}>{ev.neighborhood} · {hourLabel(normStart(ev))}–{hourLabel(normEnd(ev))}</div>
                          {/* Tooltip arrow */}
                          <div style={{
                            position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",
                            width:0,height:0,
                            borderLeft:"6px solid transparent",
                            borderRight:"6px solid transparent",
                            borderTop:"6px solid #fff",
                          }}/>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── FLOATING CATEGORY CHIPS ON MAP — Google Maps style ── */}
              <div style={{
                position:"absolute",top:50, left:0, right:0,
                display:"flex",gap:8,
                padding:"0 14px",
                zIndex:40,
                overflowX:"auto",
                scrollbarWidth:"none",
                pointerEvents:"auto",
                direction:"ltr",
              }}>
                {Object.entries(CATEGORIES).map(([key,cat])=>{
                  const on=activeFilters.has(key);
                  return (
                    <button key={key} onClick={()=>toggleFilter(key)} style={{
                      flexShrink:0,
                      display:"flex",alignItems:"center",gap:5,
                      padding:"7px 13px 7px 9px",
                      borderRadius:20,
                      border:"none",
                      background: on ? "#fff" : "rgba(26,28,46,0.92)",
                      color: on ? "#202124" : "rgba(255,255,255,0.75)",
                      fontSize:12,fontWeight:600,cursor:"pointer",
                      fontFamily:"'DM Sans',sans-serif",
                      boxShadow: on
                        ? `0 2px 10px rgba(0,0,0,0.35),0 0 0 2px ${cat.color}`
                        : "0 2px 8px rgba(0,0,0,0.45),inset 0 0 0 1px rgba(255,255,255,0.08)",
                      transition:"all 0.18s ease",
                      backdropFilter:"blur(8px)",
                      whiteSpace:"nowrap",
                    }}>
                      {/* Color dot — Google Maps style indicator */}
                      <div style={{
                        width:8,height:8,borderRadius:"50%",
                        background:cat.color,
                        flexShrink:0,
                        boxShadow: on ? `0 0 0 2px ${cat.color}44` : "none",
                      }}/>
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Google Maps style zoom controls */}
              <div style={{
                position:"absolute",right:12,top:12,
                background:"rgba(26,28,46,0.92)",
                borderRadius:8,
                overflow:"hidden",
                boxShadow:"0 2px 10px rgba(0,0,0,0.5),inset 0 0 0 1px rgba(255,255,255,0.08)",
                backdropFilter:"blur(8px)",
                zIndex:30,
              }}>
                {[
                  {l:"+", fn:()=>changeScale(0.5)},
                  {l:"−", fn:()=>changeScale(-0.5)},
                ].map(({l,fn},i)=>(
                  <button key={l} onClick={fn} style={{
                    display:"block",width:32,height:32,border:"none",
                    background:"transparent",cursor:"pointer",
                    color:"rgba(255,255,255,0.8)",
                    fontSize:18,fontWeight:300,
                    borderBottom:i===0?"1px solid rgba(255,255,255,0.1)":"none",
                    fontFamily:"'DM Sans',sans-serif",
                    lineHeight:1,
                    transition:"background 0.15s",
                  }}>{l}</button>
                ))}
              </div>

              {/* Header overlay — floating on map */}
              <div style={{
                position:"absolute",top:0,left:0,right:0,
                display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"6px 14px",
                zIndex:35,
                pointerEvents:"none",
              }}>
                {/* Jerusalem logo */}
                <div style={{
                  background:"rgba(26,28,46,0.88)",
                  backdropFilter:"blur(12px)",
                  borderRadius:12,
                  padding:"6px 12px",
                  boxShadow:"0 2px 12px rgba(0,0,0,0.5),inset 0 0 0 1px rgba(255,255,255,0.1)",
                  pointerEvents:"auto",
                }}>
                  <div style={{color:"#fff",fontSize:15,fontWeight:700,letterSpacing:-0.3,lineHeight:1}}>
                    ירושלים <span style={{color:"#FF3366",fontSize:12}}>•</span>
                  </div>
                  <div style={{color:"rgba(255,255,255,0.4)",fontSize:9,marginTop:1,letterSpacing:0.3}}>
                    {tlEvents.filter(isActive).length} events now
                  </div>
                </div>

                {/* Layout toggle */}
                <div style={{
                  display:"flex",gap:2,
                  background:"rgba(26,28,46,0.88)",
                  backdropFilter:"blur(12px)",
                  borderRadius:10,padding:3,
                  boxShadow:"0 2px 12px rgba(0,0,0,0.5),inset 0 0 0 1px rgba(255,255,255,0.1)",
                  pointerEvents:"auto",
                }}>
                  {[
                    {k:"map",      icon:"🗺️", title:"Map only"},
                    {k:"both",     icon:"⊟",  title:"Map + Timeline"},
                    {k:"timeline", icon:"⏱️", title:"Timeline only"},
                  ].map(({k,icon,title})=>(
                    <button key={k} title={title} onClick={()=>setLayout(k)} style={{
                      width:32,height:26,borderRadius:7,border:"none",cursor:"pointer",
                      background:layout===k?"rgba(255,255,255,0.2)":"transparent",
                      color:layout===k?"#fff":"rgba(255,255,255,0.4)",
                      fontSize:14,fontFamily:"'DM Sans',sans-serif",
                      transition:"all 0.15s",
                    }}>{icon}</button>
                  ))}
                </div>
              </div>

              {/* Bottom gradient fade into timeline */}
              {showTL && (
                <div style={{
                  position:"absolute",bottom:0,left:0,right:0,height:56,
                  background:`linear-gradient(to top,${MAP_NAVY},transparent)`,
                  pointerEvents:"none",zIndex:20,
                }}/>
              )}
            </div>
          </div>
        )}

        {/* ── TIMELINE ── */}
        {showTL && (
          <div style={{
            ...(showMap
              ? { flexShrink:0, height:240 }
              : { flex:1, minHeight:0 }
            ),
            background:MAP_NAVY,
            borderTop: showMap?"1px solid rgba(255,255,255,0.05)":"none",
            display:"flex", flexDirection:"column",
            paddingTop:4,
          }}>
            {!showMap && (
              <div style={{padding:"8px 16px 4px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{color:"#fff",fontSize:16,fontWeight:700,letterSpacing:-0.3}}>
                  ירושלים <span style={{color:"#FF3366",fontSize:13}}>•</span>
                </div>
                <div style={{
                  display:"flex",gap:2,
                  background:"rgba(255,255,255,0.07)",
                  borderRadius:10,padding:3,
                }}>
                  {[
                    {k:"map",icon:"🗺️"},{k:"both",icon:"⊟"},{k:"timeline",icon:"⏱️"},
                  ].map(({k,icon})=>(
                    <button key={k} onClick={()=>setLayout(k)} style={{
                      width:32,height:26,borderRadius:7,border:"none",cursor:"pointer",
                      background:layout===k?"rgba(255,255,255,0.2)":"transparent",
                      color:layout===k?"#fff":"rgba(255,255,255,0.4)",
                      fontSize:14,fontFamily:"'DM Sans',sans-serif",
                    }}>{icon}</button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Day picker (Google Calendar–style week strip) ── */}
            <div style={{
              flexShrink:0,
              display:"flex",
              overflowX:"auto",
              scrollbarWidth:"none",
              borderBottom:"1px solid rgba(255,255,255,0.06)",
              paddingBottom:0,
              direction:"ltr",
            }}>
              {DAYS.map(({day,name,date})=>{
                const sel = day === selectedDay;
                const count = EVENTS.filter(e=>e.day===day).length;
                const hasDot = count > 0;
                return (
                  <button
                    key={day}
                    onClick={()=>{
                      setSelectedDay(day);
                      setSelectedEvent(null);
                      setSheetOpen(false);
                      // reset range to show full day
                      setRangeStart(6);
                      setRangeEnd(30);
                    }}
                    style={{
                      flex:"1 0 0",
                      minWidth:44,
                      padding:"6px 4px 8px",
                      border:"none",
                      background:"transparent",
                      cursor:"pointer",
                      display:"flex",
                      flexDirection:"column",
                      alignItems:"center",
                      gap:2,
                      position:"relative",
                      opacity: count===0 ? 0.3 : 1,
                    }}
                  >
                    {/* Day name */}
                    <span style={{
                      fontSize:10,
                      fontWeight:600,
                      letterSpacing:0.3,
                      color: sel ? "#fff" : "rgba(255,255,255,0.45)",
                      fontFamily:"'DM Sans',sans-serif",
                      direction:"rtl",
                    }}>{name}</span>
                    {/* Date circle */}
                    <span style={{
                      width:28, height:28,
                      borderRadius:"50%",
                      background: sel ? "#4285F4" : "transparent",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:13,
                      fontWeight: sel ? 700 : 400,
                      color: sel ? "#fff" : "rgba(255,255,255,0.6)",
                      fontFamily:"'DM Sans',sans-serif",
                      transition:"background 0.15s",
                    }}>{date.split("/")[0]}</span>
                    {/* Event count dot */}
                    {hasDot && (
                      <span style={{
                        width:4, height:4, borderRadius:"50%",
                        background: sel ? "#4285F4" : "rgba(255,255,255,0.3)",
                        transition:"background 0.15s",
                      }}/>
                    )}
                    {/* Selected underline */}
                    {sel && (
                      <span style={{
                        position:"absolute", bottom:0, left:"20%", right:"20%",
                        height:2, borderRadius:2,
                        background:"#4285F4",
                      }}/>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{flex:1,minHeight:0,overflow:"hidden"}}>
              <div
                ref={tlRef}
                onPointerMove={onTLMove}
                onPointerUp={onTLUp}
                onPointerCancel={onTLUp}
                style={{
                  position:"relative",
                  height: showMap ? laneCount*LANE_H+TICK_H : undefined,
                  minHeight: laneCount*LANE_H+TICK_H,
                  margin:"0 14px",
                  userSelect:"none", touchAction:"none",
                }}
              >
                {/* Lane stripes */}
                {Array.from({length:laneCount}).map((_,li)=>(
                  <div key={li} style={{
                    position:"absolute",left:0,right:0,
                    top:li*LANE_H,height:PILL_H,
                    background:li%2===0?"rgba(255,255,255,0.018)":"transparent",
                    borderRadius:4,pointerEvents:"none",
                  }}/>
                ))}

                {/* Active range highlight */}
                <div style={{
                  position:"absolute",top:0,height:laneCount*LANE_H,
                  left:`${hToPct(rangeStart)}%`,width:`${hToPct(rangeEnd)-hToPct(rangeStart)}%`,
                  background:"rgba(255,255,255,0.035)",
                  borderRadius:4,pointerEvents:"none",
                  borderLeft:"1px solid rgba(255,255,255,0.08)",
                  borderRight:"1px solid rgba(255,255,255,0.08)",
                }}/>

                {/* Pills */}
                {tlEvents.map(ev=>{
                  const s=normStart(ev),e=normEnd(ev);
                  const l=Math.max(0,hToPct(s));
                  const w=Math.max(1.5,hToPct(e)-hToPct(s));
                  const lane=laneMap[ev.id]??0;
                  const active=isActive(ev);
                  const sel=selectedEvent?.id===ev.id;
                  const hov=hoveredId===ev.id;
                  const cat=CATEGORIES[ev.cat];
                  const pillOpacity=sel||hov?1:active?0.9:0.2;
                  const pillGlow=sel?`0 0 0 1.5px white,0 0 12px ${cat.color}`
                                :hov?`0 0 0 1.5px ${cat.color},0 0 10px ${cat.color}88`:"none";
                  const pillWidthPx=(w/100)*340;
                  const showTitle=tlOnly&&PILL_H>=22&&pillWidthPx>55;

                  return (
                    <div key={ev.id}
                      {...makeEventHandlers(ev)}
                      style={{
                        position:"absolute",
                        left:`${l}%`,width:`${w}%`,
                        top:lane*LANE_H,height:PILL_H,
                        borderRadius:tlOnly?7:3,
                        background:active||hov?cat.color:"rgba(255,255,255,0.09)",
                        opacity:pillOpacity,
                        cursor:"pointer",
                        transition:"opacity 0.15s,box-shadow 0.15s,transform 0.12s",
                        transform:hov?"scaleY(1.06)":"scaleY(1)",
                        boxShadow:pillGlow,
                        display:"flex",alignItems:"center",
                        paddingLeft:showTitle?7:3,
                        overflow:"hidden", gap:4,
                        filter:active||hov?"none":"grayscale(0.6)",
                      }}>
                      <span style={{fontSize:tlOnly?12:7,lineHeight:1,flexShrink:0}}>{cat.icon}</span>
                      {showTitle&&(
                        <span style={{
                          fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.95)",
                          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.2,
                        }}>{ev.name}</span>
                      )}
                    </div>
                  );
                })}

                {/* NOW line */}
                <div style={{
                  position:"absolute",left:`${hToPct(NOW_HOUR)}%`,
                  top:0,height:laneCount*LANE_H,
                  width:2,background:"#4285F4",boxShadow:"0 0 8px #4285F4",
                  borderRadius:1,pointerEvents:"none",zIndex:20,
                }}>
                  <div style={{position:"absolute",top:-3,left:"50%",transform:"translateX(-50%)",
                    width:8,height:8,borderRadius:"50%",background:"#4285F4",boxShadow:"0 0 8px #4285F4"}}/>
                </div>

                {/* Range handles — Google Maps-ish style */}
                {[['start',hToPct(rangeStart)],['end',hToPct(rangeEnd)]].map(([type,pct])=>(
                  <div key={type}
                    onPointerDown={e=>{e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);tlDrag.current=type;}}
                    style={{
                      position:"absolute",left:`${pct}%`,
                      top:0,height:laneCount*LANE_H,
                      width:3,background:"rgba(255,255,255,0.5)",
                      cursor:"ew-resize",zIndex:25,
                      transform:"translateX(-50%)",borderRadius:2,
                    }}
                  >
                    <div style={{
                      position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
                      width:18,height:18,borderRadius:"50%",
                      background:"#fff",
                      boxShadow:"0 2px 8px rgba(0,0,0,0.5)",
                      border:"2px solid rgba(0,0,0,0.1)",
                    }}/>
                  </div>
                ))}

                {/* Hour ticks */}
                <div style={{
                  position:"absolute",top:laneCount*LANE_H,
                  left:0,right:0,height:TICK_H,
                  pointerEvents:"none",
                }}>
                  {[6,9,12,15,18,21,24,27,30].map(h=>(
                    <div key={h} style={{
                      position:"absolute",left:`${hToPct(h)}%`,top:0,
                      transform:"translateX(-50%)",
                      display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                    }}>
                      <div style={{width:1,height:4,background:"rgba(255,255,255,0.15)"}}/>
                      <span style={{
                        color:h>=rangeStart&&h<=rangeEnd?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.18)",
                        fontSize:8,fontWeight:500,fontFamily:"'DM Mono',monospace",whiteSpace:"nowrap",
                      }}>{hourLabel(h)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Range label */}
            <div style={{flexShrink:0,padding:"3px 16px 0",display:"flex",justifyContent:"space-between"}}>
              <span style={{color:"rgba(255,255,255,0.3)",fontSize:9,fontWeight:600,fontFamily:"'DM Mono',monospace"}}>
                {hourLabel(rangeStart)} → {hourLabel(rangeEnd)}
              </span>
              <span style={{color:"rgba(255,255,255,0.2)",fontSize:9}}>
                {tlEvents.filter(isActive).length} active · {tlEvents.length} in view
              </span>
            </div>
            <div style={{display:"flex",justifyContent:"center",padding:"5px 0 4px",flexShrink:0}}>
              <div style={{width:100,height:3,borderRadius:2,background:"rgba(255,255,255,0.14)"}}/>
            </div>
          </div>
        )}

        {/* ── BOTTOM SHEET ── */}
        <div style={{
          position:"absolute",bottom:0,left:0,right:0,
          background:"#16192e",borderRadius:"20px 20px 0 0",
          transform:sheetOpen?"translateY(0)":"translateY(110%)",
          transition:"transform 0.35s cubic-bezier(0.32,0.72,0,1)",
          zIndex:200,
          boxShadow:"0 -4px 32px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.06)",
          maxHeight:"62%",overflow:"hidden",display:"flex",flexDirection:"column",
        }}>
          {selectedEvent&&(()=>{
            const cat=CATEGORIES[selectedEvent.cat];
            const s=normStart(selectedEvent),e=normEnd(selectedEvent);
            const pad=n=>String(n).padStart(2,'0');
            const today=new Date();
            const yr=today.getFullYear();
            const mo=pad(today.getMonth()+1);
            const dy=pad(today.getDate());
            const sH=normStart(selectedEvent)%24;
            const eH=normEnd(selectedEvent)%24;
            const eDay=normEnd(selectedEvent)>=24?pad(today.getDate()+1):dy;
            const calUrl=`https://calendar.google.com/calendar/render?action=TEMPLATE`
              +`&text=${encodeURIComponent(selectedEvent.en)}`
              +`&dates=${yr}${mo}${dy}T${pad(sH)}0000/${yr}${mo}${eDay}T${pad(eH)}0000`
              +`&details=${encodeURIComponent(selectedEvent.desc)}`
              +`&location=${encodeURIComponent(selectedEvent.neighborhood+', Jerusalem')}`;
            const mapsUrl=`https://maps.google.com/?q=${encodeURIComponent(selectedEvent.neighborhood+' Jerusalem')}`;
            return (<>
              {/* Drag handle */}
              <div style={{width:36,height:4,borderRadius:2,background:"rgba(255,255,255,0.18)",margin:"10px auto 0",flexShrink:0}}/>

              {/* Sheet header with category color accent */}
              <div style={{
                padding:"12px 18px 10px",
                background:`linear-gradient(160deg,${cat.color}20,transparent 60%)`,
                borderBottom:`1px solid ${cat.color}22`,
                display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexShrink:0,
              }}>
                <div style={{flex:1,minWidth:0}}>
                  {/* Category pill */}
                  <div style={{display:"inline-flex",alignItems:"center",gap:5,
                    background:`${cat.color}1a`,borderRadius:20,padding:"3px 10px",marginBottom:7,
                    border:`1px solid ${cat.color}33`}}>
                    {/* Category color dot — Google Maps style */}
                    <div style={{width:7,height:7,borderRadius:"50%",background:cat.color,flexShrink:0}}/>
                    <span style={{color:cat.color,fontSize:11,fontWeight:600}}>{cat.label}</span>
                  </div>
                  <div style={{color:"#fff",fontSize:15,fontWeight:700,lineHeight:1.3,marginBottom:2,direction:"rtl",textAlign:"right"}}>
                    {selectedEvent.name}
                  </div>
                  <div style={{color:"rgba(255,255,255,0.4)",fontSize:12}}>{selectedEvent.neighborhood} · Jerusalem</div>
                </div>
                <button onClick={closeSheet} style={{
                  width:26,height:26,borderRadius:"50%",background:"rgba(255,255,255,0.08)",
                  border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.7)",cursor:"pointer",fontSize:12,
                  flexShrink:0,marginLeft:10,fontFamily:"'DM Sans',sans-serif",
                  display:"flex",alignItems:"center",justifyContent:"center",
                }}>✕</button>
              </div>

              {/* Sheet body */}
              <div style={{padding:"12px 18px 28px",overflowY:"auto"}}>
                {/* Time row */}
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontSize:13}}>🕐</span>
                  <span style={{color:"rgba(255,255,255,0.75)",fontSize:13,fontWeight:500}}>
                    {hourLabel(s)} – {hourLabel(e)}
                  </span>
                  {isActive(selectedEvent)&&(
                    <span style={{
                      background:"#FF3366",color:"#fff",fontSize:9,fontWeight:700,
                      padding:"2px 7px",borderRadius:10,letterSpacing:0.8,
                    }}>LIVE NOW</span>
                  )}
                </div>

                {/* Description */}
                <p style={{
                  color:"rgba(255,255,255,0.6)",fontSize:13,lineHeight:1.65,
                  margin:"0 0 8px",direction:"rtl",textAlign:"right",
                }}>{selectedEvent.desc}</p>
                <p style={{color:"rgba(255,255,255,0.3)",fontSize:11,margin:"0 0 18px"}}>{selectedEvent.en}</p>

                {/* Action buttons */}
                <div style={{display:"flex",gap:8}}>
                  {[
                    { label:"📍 Directions", href:mapsUrl, primary:true },
                    { label:"📅 Add to Cal", href:calUrl,  primary:false },
                    { label:"📲 Share",       href:null,    primary:false, onClick:()=>navigator.share?.({title:selectedEvent.en,text:selectedEvent.desc}) },
                  ].map(btn=>(
                    btn.href
                      ? <a key={btn.label} href={btn.href} target="_blank" rel="noreferrer" style={{
                          display:"flex",alignItems:"center",justifyContent:"center",flex:1,
                          padding:"11px 4px",borderRadius:12,fontWeight:700,fontSize:12,
                          cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textDecoration:"none",
                          background:btn.primary?cat.color:"rgba(255,255,255,0.07)",
                          color:"#fff",
                          border:btn.primary?"none":"1px solid rgba(255,255,255,0.1)",
                        }}>{btn.label}</a>
                      : <button key={btn.label} onClick={btn.onClick} style={{
                          display:"flex",alignItems:"center",justifyContent:"center",flex:1,
                          padding:"11px 4px",borderRadius:12,fontWeight:700,fontSize:12,
                          cursor:"pointer",fontFamily:"'DM Sans',sans-serif",
                          background:"rgba(255,255,255,0.07)",color:"#fff",
                          border:"1px solid rgba(255,255,255,0.1)",
                        }}>{btn.label}</button>
                  ))}
                </div>
              </div>
            </>);
          })()}
        </div>

        {/* Sheet backdrop */}
        {sheetOpen&&<div onClick={closeSheet} style={{
          position:"absolute",inset:0,
          background:"rgba(0,0,0,0.4)",
          zIndex:150,
          backdropFilter:"blur(1px)",
        }}/>}

        <style>{`
          @keyframes gmPulse {
            0%,100% { box-shadow: 0 2px 8px rgba(66,133,244,0.6), 0 0 0 0 rgba(66,133,244,0.3); }
            50%      { box-shadow: 0 2px 8px rgba(66,133,244,0.6), 0 0 0 14px rgba(66,133,244,0); }
          }
          ::-webkit-scrollbar { display:none; }
        `}</style>
    </div>
  );
}
