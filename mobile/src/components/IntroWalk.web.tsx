import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, serif } from "./quiet-ui";
import BrandMark from "./BrandMark";
import {
  CHURCH_SIZE,
  GROUND_DROP,
  INTRO_MOMENTS,
  ROAD_HALF,
  churchOnRoad,
  introCopy,
  introMotes,
  introStars,
  lanternLit,
  lanternSpots,
  placeOnRoad,
  treeSpots,
  type IntroChurch,
  type IntroWalkProps,
  type Placed,
} from "../lib/intro-walk";

// The first-visit intro, drawn for the web: a road at night leads to a lit
// church. Each press of the button walks closer; the last one arrives at the
// door. The night scene is artwork with its own colours; the words and the
// buttons use the Candlelight palette.

const NIGHT = "#05060C";
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const WALK_MS = 2400;
const WALK = `${WALK_MS}ms cubic-bezier(.45,.05,.25,1)`;
const EASE = "cubic-bezier(.4,0,.2,1)";
const KEYFRAMES = `
@keyframes gg-walk-a{0%,40%,80%,100%{transform:translateY(0)}20%,60%{transform:translateY(5px)}}
@keyframes gg-walk-b{0%,40%,80%,100%{transform:translateY(0)}20%,60%{transform:translateY(5px)}}
@keyframes gg-twinkle{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes gg-pulse{0%,100%{opacity:.7}50%{opacity:1}}
@keyframes gg-mote{0%{transform:translate(0,0);opacity:0}15%{opacity:.9}100%{transform:translate(14px,-110px);opacity:0}}
`;
const fill: CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
};
const art: CSSProperties = {
  position: "absolute",
  left: -150,
  top: -400,
  overflow: "visible",
};

// People who ask their device for less motion see each moment at once.
function prefersCalm() {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export default function IntroWalk({
  language,
  church,
  onDone,
}: IntroWalkProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [calm] = useState(prefersCalm);
  const [moment, setMoment] = useState(0);
  // awake: the night has faded in. shown: the moment whose words have started
  // to appear. instant: a tap asked for the rest of them at once.
  const [awake, setAwake] = useState(false);
  const [shown, setShown] = useState(-1);
  const [instant, setInstant] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stars = useMemo(() => introStars(), []);
  const motes = useMemo(() => introMotes(), []);

  useEffect(() => {
    const wake = setTimeout(() => setAwake(true), 80);
    return () => clearTimeout(wake);
  }, []);
  // The words wait until the walk has almost arrived.
  useEffect(() => {
    timer.current = setTimeout(() => setShown(moment), 1500);
    return () => clearTimeout(timer.current);
  }, [moment]);

  const animate = !calm;
  const last = moment === INTRO_MOMENTS - 1;
  const copy = introCopy[language] ?? introCopy.en;
  const [title, body, action] = copy.moments[moment];

  // The stage is a phone-shaped column. The words and the button keep a
  // fixed space at the bottom; the scene above them is scaled to fit.
  const W = Math.min(width, 480);
  const H = height;
  const horizon = Math.max(220, H - 364 - insets.bottom);
  const scale = Math.min(W / 390, horizon / 470);

  const glide = animate ? `transform ${WALK}, opacity 1400ms ease` : undefined;
  const placed = (spot: Placed): CSSProperties => ({
    position: "absolute",
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    transformOrigin: "0 0",
    transform: `translate(${spot.x.toFixed(1)}px, ${spot.y.toFixed(1)}px) scale(${spot.size.toFixed(4)})`,
    opacity: spot.passed ? 0 : 1,
    transition: glide,
  });
  const churchSpot = churchOnRoad(moment);
  const k = churchSpot.size;
  const doorstep = GROUND_DROP * CHURCH_SIZE[INTRO_MOMENTS - 1];

  const wordsOn = !animate || shown === moment;
  const wordsNow = instant === moment;
  // One piece appearing: a long, gentle fade and a small rise. Pieces overlap,
  // so a line arrives as one soft wave; the large words also come into focus.
  const appear = (delay: number, ms: number, focus = false): CSSProperties => {
    if (!animate) return {};
    if (wordsNow) return { opacity: 1, transition: "opacity 250ms ease" };
    if (!wordsOn)
      return {
        opacity: 0,
        transform: `translateY(${focus ? 8 : 5}px)`,
        filter: focus ? "blur(4px)" : undefined,
        transition: "none",
      };
    const timing = `${ms}ms ${EASE} ${delay}ms`;
    return {
      opacity: 1,
      transform: "translateY(0)",
      filter: focus ? "blur(0)" : undefined,
      transition: `opacity ${timing}, transform ${timing}${focus ? `, filter ${timing}` : ""}`,
    };
  };
  const words = title.split(" ");
  const wordGap = 180;

  const step = () => (last ? onDone() : setMoment(moment + 1));
  // A tap anywhere shows the rest of the words straight away.
  const showWords = () => {
    if (!animate || wordsNow) return;
    clearTimeout(timer.current);
    setShown(moment);
    setInstant(moment);
  };

  return (
    <div
      onClick={showWords}
      style={{
        ...fill,
        overflow: "hidden",
        background: NIGHT,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <style>{KEYFRAMES}</style>
      <div
        style={{
          position: "relative",
          width: W,
          height: H,
          overflow: "hidden",
          color: colors.ink,
          fontFamily: SANS,
        }}
      >
        <div
          aria-hidden
          style={{
            ...fill,
            // A small dip with each footstep while walking.
            animation:
              animate && moment > 0
                ? `${moment % 2 ? "gg-walk-a" : "gg-walk-b"} ${WALK_MS}ms ease-in-out`
                : undefined,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: horizon + 2,
              background:
                "linear-gradient(180deg, #05060C 0%, #0B0C17 40%, #1A1521 70%, #33231B 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: horizon,
              opacity: [1, 0.95, 0.85, 0.7, 0][moment],
              transition: glide,
            }}
          >
            {stars.map((star, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${(star.across * 100).toFixed(1)}%`,
                  top: `${(star.down * 100).toFixed(1)}%`,
                  width: star.size,
                  height: star.size,
                  borderRadius: "50%",
                  background: "#FFF5DE",
                  opacity: star.opacity,
                  animation: animate
                    ? `gg-twinkle ${star.seconds.toFixed(1)}s ease-in-out ${star.delay.toFixed(1)}s infinite`
                    : undefined,
                }}
              />
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              left: W * 0.6,
              top: horizon * 0.25,
              width: 34 * scale,
              height: 34 * scale,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 36% 34%, #FFF8E2, #E6D4A8)",
              boxShadow: "0 0 44px 14px rgba(255,240,200,0.16)",
              transform: `translateY(${-8 * moment}px)`,
              opacity: last ? 0 : 1,
              transition: glide,
            }}
          />
          <svg
            width={W}
            height={60 * scale}
            viewBox="0 0 390 60"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              left: 0,
              top: horizon - 48 * scale,
              transformOrigin: `${W / 2}px ${48 * scale}px`,
              transform: `scale(${(1 + 0.09 * moment).toFixed(2)})`,
              transition: glide,
            }}
          >
            <path
              d="M0 40C40 26 84 20 132 31c40 9 70-12 120-6 50 6 90-14 138 2v33H0z"
              fill="#100E14"
            />
            <path
              d="M0 50c50-10 96-8 150-3 60 6 110-8 160-6 34 1 58 4 80 8v11H0z"
              fill="#0B0A0C"
            />
          </svg>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: horizon,
              width: "100%",
              bottom: 0,
              background:
                "linear-gradient(180deg, #15110E 0%, #0C0907 45%, #070504 100%)",
            }}
          />
          {/* Everything below is drawn from the point on the horizon the road leads to. */}
          <div
            style={{
              position: "absolute",
              left: W / 2,
              top: horizon,
              width: 0,
              height: 0,
              transformOrigin: "0 0",
              transform: `scale(${scale.toFixed(4)})`,
            }}
          >
            {/* The light seen from far away, growing as the church comes near. */}
            <div
              style={{
                position: "absolute",
                left: -210,
                top: -210,
                width: 420,
                height: 420,
                transform: `translateY(${(-55 * k).toFixed(1)}px) scale(${[0.26, 0.4, 0.62, 1, 1.7][moment]})`,
                opacity: [1, 0.95, 0.85, 0.5, 0.3][moment],
                transition: glide,
              }}
            >
              <div
                style={{
                  width: 420,
                  height: 420,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(255,196,110,0.6) 0%, rgba(255,170,80,0.2) 28%, rgba(255,170,80,0) 64%)",
                  animation: animate
                    ? "gg-pulse 4.5s ease-in-out infinite"
                    : undefined,
                }}
              />
            </div>
            <div
              style={{
                position: "absolute",
                left: -1100,
                top: 0,
                width: 2200,
                height: 700,
                background:
                  "linear-gradient(180deg, rgba(168,124,74,0.62) 0px, rgba(92,70,48,0.6) 120px, rgba(44,33,24,0.55) 374px)",
                clipPath: `polygon(1100px 0px, ${1100 + (ROAD_HALF / GROUND_DROP) * 700}px 700px, ${1100 - (ROAD_HALF / GROUND_DROP) * 700}px 700px)`,
              }}
            />
            {/* At the door, light from inside falls across the ground. */}
            <div
              style={{
                position: "absolute",
                left: -1100,
                top: 0,
                width: 2200,
                height: 440,
                background: `linear-gradient(180deg, rgba(255,214,150,0) ${doorstep - 2}px, rgba(255,214,150,0.46) ${doorstep}px, rgba(255,200,130,0.12) 250px, rgba(255,200,130,0.03) 440px)`,
                clipPath: `polygon(${1100 - 57}px ${doorstep - 2}px, ${1100 + 57}px ${doorstep - 2}px, 1380px 440px, 820px 440px)`,
                opacity: last ? 1 : 0,
                transition: animate
                  ? `opacity 1600ms ease ${last ? 1500 : 0}ms`
                  : undefined,
              }}
            />
            <div style={placed(churchSpot)}>
              <ChurchArt church={church} />
              <DoorArt />
            </div>
            {treeSpots.map((spot, i) => (
              <div
                key={i}
                style={placed(placeOnRoad(moment, spot.side, spot.along))}
              >
                <svg
                  width={70}
                  height={150}
                  viewBox="0 0 70 150"
                  style={{ position: "absolute", left: -35, top: -150 }}
                >
                  <path
                    d="M33 150v-26C8 122 14 62 35 4c21 58 27 118 2 120v26z"
                    fill="#070606"
                  />
                </svg>
              </div>
            ))}
            {lanternSpots.map((spot, i) => {
              const at = placeOnRoad(moment, spot.side, spot.along);
              const lit = lanternLit(moment, at);
              const fade = animate ? "opacity 1200ms ease 500ms" : undefined;
              return (
                <div key={i} style={placed(at)}>
                  <div
                    style={{
                      position: "absolute",
                      left: -36,
                      top: -94,
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      background:
                        "radial-gradient(circle, rgba(255,200,112,0.6), rgba(255,200,112,0) 68%)",
                      opacity: lit ? 1 : 0,
                      transition: fade,
                    }}
                  />
                  <svg
                    width={24}
                    height={72}
                    viewBox="0 0 24 72"
                    style={{
                      position: "absolute",
                      left: -12,
                      top: -72,
                      overflow: "visible",
                    }}
                  >
                    <path
                      d="M11 72V22h2v50zM6 22h12l-2-3H8zM6 8l6-6 6 6zM9 72h6v-2H9z"
                      fill="#0A0807"
                    />
                    <path
                      d="M7.5 8h9v11h-9z"
                      fill="#1A130E"
                      stroke="#0A0807"
                      strokeWidth={1}
                    />
                  </svg>
                  <div
                    style={{
                      position: "absolute",
                      left: -3.5,
                      top: -63,
                      width: 7,
                      height: 9,
                      borderRadius: 2,
                      background: "#FFE2A6",
                      opacity: lit ? 1 : 0.1,
                      transition: fade,
                    }}
                  />
                </div>
              );
            })}
          </div>
          {animate &&
            moment > 0 &&
            motes.map((mote, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${(mote.across * 100).toFixed(1)}%`,
                  top: horizon + mote.down * scale,
                  width: 3,
                  height: 3,
                  borderRadius: "50%",
                  background: "#FFD591",
                  boxShadow: "0 0 6px 2px rgba(255,200,110,0.55)",
                  opacity: 0,
                  animation: `gg-mote ${mote.seconds.toFixed(1)}s linear ${mote.delay.toFixed(1)}s infinite`,
                }}
              />
            ))}
        </div>
        {/* Shade behind the name at the top and the words at the bottom. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: 150,
            background:
              "linear-gradient(180deg, rgba(3,3,6,0.92), rgba(3,3,6,0.6) 55%, rgba(3,3,6,0))",
            pointerEvents: "none",
            opacity: last ? 1 : 0.6,
            transition: glide,
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: horizon + 30,
            width: "100%",
            bottom: 0,
            background:
              "linear-gradient(180deg, rgba(8,6,5,0) 0%, rgba(8,6,5,0.5) 40%, rgba(8,6,5,0.82) 100%)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            ...fill,
            background: "#000",
            pointerEvents: "none",
            opacity: !animate || awake ? 0 : 1,
            transition: animate ? "opacity 2400ms ease" : undefined,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 24,
            right: 24,
            top: insets.top + 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BrandMark size={26} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 3,
                color: colors.ink,
              }}
            >
              GRACE &amp; GATHER
            </span>
          </div>
          {!last && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDone();
              }}
              style={{
                minHeight: 44,
                padding: "0 18px",
                borderRadius: 22,
                border: `1px solid ${colors.line}`,
                background: "rgba(10,8,8,0.55)",
                color: colors.ink,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {copy.skip}
            </button>
          )}
        </div>
        <div
          aria-live="polite"
          style={{
            position: "absolute",
            left: 26,
            right: 26,
            height: 190,
            bottom: 112 + insets.bottom,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            textAlign: "center",
          }}
        >
          <h1
            aria-label={title}
            style={{
              margin: 0,
              fontFamily: `${serif}, 'Times New Roman', serif`,
              fontWeight: 400,
              fontSize: 29,
              lineHeight: "36px",
              letterSpacing: -0.3,
              color: colors.ink,
              textShadow: "0 1px 12px rgba(0,0,0,0.7)",
            }}
          >
            {words.map((word, i) => (
              <span
                key={`${moment}-${i}`}
                aria-hidden
                style={{
                  display: "inline-block",
                  margin: "0 0.14em",
                  ...appear(i * wordGap, 1100, true),
                }}
              >
                {word}
              </span>
            ))}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 17,
              lineHeight: "26px",
              color: colors.ink,
              textWrap: "balance",
              textShadow: "0 1px 10px rgba(0,0,0,0.75)",
              ...appear(words.length * wordGap + 350, 1200),
            }}
          >
            {body}
          </p>
        </div>
        <div
          style={{
            position: "absolute",
            left: 28,
            right: 28,
            bottom: 40 + insets.bottom,
          }}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              step();
            }}
            style={{
              width: "100%",
              minHeight: 52,
              padding: "0 22px",
              borderRadius: 26,
              border: "none",
              background: colors.green,
              color: colors.paper,
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {action}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Artwork ---------------------------------------------------------------
// Each church is drawn in a 300 by 400 box that stands on the middle of its
// bottom edge; the door (shared by all three) is drawn over it.
const WALL = {
  fill: "url(#ggWall)",
  stroke: colors.gold,
  strokeOpacity: 0.3,
  strokeWidth: 1,
};
const thin = { vectorEffect: "non-scaling-stroke" } as const;
const BARS = { stroke: "#3A2414", strokeWidth: 1.1, fill: "none" };
const COURSES = {
  ...thin,
  stroke: colors.ink,
  strokeOpacity: 0.05,
  strokeWidth: 1,
  fill: "none",
};

function ChurchArt({ church }: { church: IntroChurch }) {
  return (
    <svg width={300} height={400} viewBox="0 0 300 400" style={art}>
      <defs>
        <linearGradient id="ggWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0D0B0C" />
          <stop offset=".7" stopColor="#17110E" />
          <stop offset="1" stopColor="#241A13" />
        </linearGradient>
        <radialGradient id="ggWin" cx=".5" cy=".65" r=".75">
          <stop offset="0" stopColor="#FFE9B5" />
          <stop offset="1" stopColor="#D88F3D" />
        </radialGradient>
        <radialGradient id="ggHalo">
          <stop offset="0" stopColor="#FFC670" stopOpacity=".5" />
          <stop offset="1" stopColor="#FFC670" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ggDome" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F3D793" />
          <stop offset=".45" stopColor={colors.gold} />
          <stop offset="1" stopColor="#5E4820" />
        </linearGradient>
      </defs>
      {church === "orthodox" ? (
        <>
          <g {...WALL}>
            <path {...thin} d="M128 226v-76h44v76z" />
            <path {...thin} d="M80 226v-40h24v40zM196 226v-40h24v40z" />
            <path {...thin} d="M22 400v-90a18 18 0 0 1 36 0v90z" />
            <path {...thin} d="M278 400v-90a18 18 0 0 0-36 0v90z" />
            <path
              {...thin}
              d="M58 400V236a30.67 30.67 0 0 1 61.33 0 30.67 30.67 0 0 1 61.34 0 30.67 30.67 0 0 1 61.33 0v164z"
            />
          </g>
          <g fill="url(#ggDome)" stroke="#2A1D0C" strokeWidth={0.6}>
            <path d="M128 150c-24-22-4-46 22-80 26 34 46 58 22 80z" />
            <path d="M80 186c-14-14-2-28 12-48 14 20 26 34 12 48z" />
            <path d="M196 186c-14-14-2-28 12-48 14 20 26 34 12 48z" />
          </g>
          <path
            {...thin}
            d="M150 38v32M146 45h8M141 52h18M145 60l10 4M92 118v20M87 125h10M208 118v20M203 125h10"
            stroke="#E6C987"
            strokeWidth={1.5}
            fill="none"
          />
          <path {...COURSES} d="M58 262h184M58 300h184M58 338h184M58 374h184" />
          <circle cx="150" cy="276" r="30" fill="url(#ggHalo)" />
          <circle cx="80" cy="326" r="30" fill="url(#ggHalo)" />
          <circle cx="220" cy="326" r="30" fill="url(#ggHalo)" />
          <circle cx="150" cy="186" r="30" fill="url(#ggHalo)" />
          <g fill="url(#ggWin)">
            <path d="M137 204v-30a3 3 0 0 1 6 0v30zM147 204v-30a3 3 0 0 1 6 0v30zM157 204v-30a3 3 0 0 1 6 0v30z" />
            <path d="M89.5 214v-18a2.5 2.5 0 0 1 5 0v18zM205.5 214v-18a2.5 2.5 0 0 1 5 0v18z" />
            <path d="M141 288v-20a9 9 0 0 1 18 0v20z" />
            <path d="M72 352v-50a8 8 0 0 1 16 0v50z" />
            <path d="M212 352v-50a8 8 0 0 1 16 0v50z" />
            <path d="M35 366v-36a5 5 0 0 1 10 0v36z" />
            <path d="M255 366v-36a5 5 0 0 1 10 0v36z" />
          </g>
          <path {...BARS} d="M80 295v57M220 295v57M72 322h16M212 322h16" />
        </>
      ) : church === "protestant" ? (
        <>
          <g {...WALL}>
            <path {...thin} d="M24 400v-74l46-22v96z" />
            <path {...thin} d="M276 400v-74l-46-22v96z" />
            <path {...thin} d="M131 200v-82h38v82z" />
            <path {...thin} d="M126 120h48l-5-8h-38z" />
            <path {...thin} d="M131 112l19-70 19 70z" />
            <path {...thin} d="M70 400V250l80-70 80 70v150z" />
          </g>
          <path
            {...thin}
            d="M150 14v28M141 23h18"
            stroke={colors.goldInk}
            strokeWidth={1.8}
            fill="none"
          />
          <path
            {...COURSES}
            d="M70 270h160M70 290h160M70 310h160M70 330h160M70 350h160M70 370h160M70 386h160M24 350h46M230 350h46M24 370h46M230 370h46"
          />
          <circle cx="150" cy="256" r="28" fill="url(#ggHalo)" />
          <circle cx="90" cy="326" r="32" fill="url(#ggHalo)" />
          <circle cx="210" cy="326" r="32" fill="url(#ggHalo)" />
          <g fill="url(#ggWin)">
            <path d="M143 166v-22a7 7 0 0 1 14 0v22z" opacity={0.55} />
            <circle cx="150" cy="256" r="12" />
            <path d="M82 358v-62a8 8 0 0 1 16 0v62z" />
            <path d="M202 358v-62a8 8 0 0 1 16 0v62z" />
            <path d="M42 372v-26h12v26zM246 372v-26h12v26z" />
          </g>
          <path
            {...BARS}
            d="M150 244v24M138 256h24M90 289v69M210 289v69M82 322h16M202 322h16M48 346v26M252 346v26"
          />
        </>
      ) : (
        <>
          <g {...WALL}>
            <path {...thin} d="M20 400V292l40-24v132z" />
            <path {...thin} d="M280 400V292l-40-24v132z" />
            <path {...thin} d="M132 152V76h36v76z" />
            <path {...thin} d="M128 78l22-54 22 54z" />
            <path {...thin} d="M54 208l6-36 6 36zM234 208l6-36 6 36z" />
            <path {...thin} d="M60 400V206l90-92 90 92v194z" />
          </g>
          <path
            {...thin}
            d="M150 4v20M143 11h14"
            stroke={colors.goldInk}
            strokeWidth={1.6}
            fill="none"
          />
          <path
            {...COURSES}
            d="M60 262h180M60 300h180M60 338h180M60 374h180M20 338h40M240 338h40M20 374h40M240 374h40"
          />
          <circle cx="150" cy="232" r="48" fill="url(#ggHalo)" />
          <circle cx="80" cy="326" r="30" fill="url(#ggHalo)" />
          <circle cx="220" cy="326" r="30" fill="url(#ggHalo)" />
          <circle
            cx="150"
            cy="232"
            r="26"
            fill="url(#ggWin)"
            stroke="#0A0706"
            strokeWidth={2.5}
          />
          <path
            d="M150 206v52M124 232h52M131.6 213.6l36.8 36.8M168.4 213.6l-36.8 36.8"
            stroke="#3A2414"
            strokeWidth={1.2}
            fill="none"
          />
          <circle
            cx="150"
            cy="232"
            r="8"
            fill="#FFE9B5"
            stroke="#3A2414"
            strokeWidth={1.4}
          />
          <g fill="url(#ggWin)">
            <path d="M145 124v-24a5 5 0 0 1 10 0v24z" />
            <path d="M72 352v-50a8 8 0 0 1 16 0v50z" />
            <path d="M212 352v-50a8 8 0 0 1 16 0v50z" />
            <path d="M34 362v-32a6 6 0 0 1 12 0v32z" />
            <path d="M254 362v-32a6 6 0 0 1 12 0v32z" />
          </g>
          <path
            {...BARS}
            d="M80 295v57M220 295v57M72 322h16M212 322h16M40 325v37M260 325v37"
          />
        </>
      )}
    </svg>
  );
}

function DoorArt() {
  return (
    <svg width={300} height={400} viewBox="0 0 300 400" style={art}>
      <defs>
        <radialGradient id="ggDoorGlow" cx=".5" cy=".9" r=".9">
          <stop offset="0" stopColor="#FFE9B5" />
          <stop offset="1" stopColor="#D88F3D" />
        </radialGradient>
        <radialGradient id="ggDoorHalo">
          <stop offset="0" stopColor="#FFC670" stopOpacity=".55" />
          <stop offset="1" stopColor="#FFC670" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ggDoorWash">
          <stop offset="0" stopColor="#FFB45A" stopOpacity=".22" />
          <stop offset="1" stopColor="#FFB45A" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="150" cy="352" rx="78" ry="70" fill="url(#ggDoorWash)" />
      <path d="M104 400v-4h92v4z" fill="#2B2119" />
      <path d="M110 396v-4h80v4z" fill="#3A2D22" />
      <path
        {...thin}
        d="M116 392v-60a34 34 0 0 1 68 0v60z"
        fill="#0A0706"
        stroke={colors.gold}
        strokeOpacity={0.6}
        strokeWidth={1}
      />
      <path d="M123 335a27 27 0 0 1 54 0z" fill="url(#ggDoorGlow)" />
      <path
        d="M150 308v27M131 316l19 19M169 316l-19 19"
        stroke="#2A1A10"
        strokeWidth={1.2}
        fill="none"
      />
      <path d="M123 337h26v55h-26zM151 337h26v55h-26z" fill="#412A18" />
      <path
        d="M127 342h18v20h-18zM127 366h18v22h-18zM155 342h18v20h-18zM155 366h18v22h-18z"
        fill="none"
        stroke="#63432A"
        strokeWidth={0.8}
      />
      {/* Light from inside shows between the doors and under them. */}
      <path d="M149 337h2v55h-2z" fill="#FFE7B0" />
      <path d="M123 390.8h54v1.2h-54z" fill="#FFE7B0" opacity={0.9} />
      <circle cx="146.5" cy="365" r="1.2" fill={colors.goldInk} />
      <circle cx="153.5" cy="365" r="1.2" fill={colors.goldInk} />
      <circle cx="104" cy="346" r="16" fill="url(#ggDoorHalo)" />
      <circle cx="196" cy="346" r="16" fill="url(#ggDoorHalo)" />
      <path d="M102 343h4v7h-4zM194 343h4v7h-4z" fill="#FFDFA0" />
      <path d="M100 343l4-4 4 4zM192 343l4-4 4 4z" fill="#0A0706" />
    </svg>
  );
}
