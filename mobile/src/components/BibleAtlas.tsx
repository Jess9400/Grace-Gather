import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { Body, External, colors } from "./quiet-ui";
import { StudyAction, StudyHeader } from "./StudyControls";
import {
  loadTerrain,
  loadAtlasPlaces,
  createAtlasRenderer,
  atlasPlaceProjection,
  type Terrain,
  type AtlasPlace,
  type AtlasRegion,
} from "../lib/study-atlas";
import { releaseContext } from "../lib/gl-recovery";
import atlasSources from "../generated/study-atlas/sources.json";
import type { Language } from "../lib/content";
// Expo GL recreates its web context when this object changes identity.
const WEB_CONTEXT_ATTRIBUTES = { alpha: false, antialias: true };
const copy = {
  en: {
    controls: [
      "Rotate left",
      "Rotate right",
      "Zoom in",
      "Zoom out",
      "Change tilt",
    ],
    title: "World of this passage",
    close: "Close",
    hint: "Tilt and rotate the terrain. Select a place below.",
    note: "Modern terrain with ancient place references from this book. Relief is exaggerated; ancient coastlines, borders and routes are not reconstructed. Some identifications are disputed. Names follow the source.",
    none: "No identified places from this book in this region.",
    more: "More places",
    sources: "Map data",
    error: "The 3D map could not load. Place names remain available.",
    regions: ["Galilee & Judea", "Ancient Near East", "Mediterranean"],
  },
  pt: {
    controls: [
      "Girar à esquerda",
      "Girar à direita",
      "Aproximar",
      "Afastar",
      "Mudar inclinação",
    ],
    title: "O mundo desta passagem",
    close: "Fechar",
    hint: "Incline e gire o relevo. Selecione um lugar abaixo.",
    note: "Relevo atual com referências a lugares antigos deste livro. A altitude é exagerada; litoral, fronteiras e rotas antigos não foram reconstruídos. Algumas localizações são discutidas. Os nomes seguem a fonte.",
    none: "Nenhum lugar identificado deste livro nesta região.",
    more: "Mais lugares",
    sources: "Dados do mapa",
    error:
      "Não foi possível abrir o mapa 3D. Os nomes dos lugares continuam disponíveis.",
    regions: ["Galileia e Judeia", "Antigo Oriente Próximo", "Mediterrâneo"],
  },
  es: {
    controls: [
      "Girar a la izquierda",
      "Girar a la derecha",
      "Acercar",
      "Alejar",
      "Cambiar inclinación",
    ],
    title: "El mundo de este pasaje",
    close: "Cerrar",
    hint: "Inclina y gira el relieve. Selecciona un lugar abajo.",
    note: "Relieve actual con referencias a lugares antiguos de este libro. Altitud exagerada; no se reconstruyen costas, fronteras ni rutas antiguas. Algunas ubicaciones son discutidas. Los nombres siguen la fuente.",
    none: "No hay lugares identificados de este libro en esta región.",
    more: "Más lugares",
    sources: "Datos del mapa",
    error: "No se pudo cargar el mapa 3D. Los nombres siguen disponibles.",
    regions: ["Galilea y Judea", "Antiguo Oriente Próximo", "Mediterráneo"],
  },
  ru: {
    controls: [
      "Повернуть влево",
      "Повернуть вправо",
      "Приблизить",
      "Отдалить",
      "Изменить наклон",
    ],
    title: "Мир этого отрывка",
    close: "Закрыть",
    hint: "Наклоняйте и поворачивайте рельеф. Выберите место ниже.",
    note: "Современный рельеф с названиями древних мест из этой книги. Высоты преувеличены; древние берега, границы и маршруты не реконструированы. Часть мест определена предположительно. Названия взяты из источника.",
    none: "В этом регионе нет определённых мест из этой книги.",
    more: "Ещё места",
    sources: "Данные карты",
    error: "Не удалось загрузить 3D-карту. Названия мест остаются доступны.",
    regions: ["Галилея и Иудея", "Древний Ближний Восток", "Средиземноморье"],
  },
};
export default function BibleAtlas({
  book,
  region: initial,
  language,
  onClose,
}: {
  book: string;
  region: AtlasRegion;
  language: Language;
  onClose: () => void;
}) {
  const c = copy[language];
  const [region, setRegion] = useState(initial),
    [terrain, setTerrain] = useState<Terrain | null>(null),
    [places, setPlaces] = useState<AtlasPlace[]>([]),
    [camera, setCamera] = useState({ yaw: 0.15, zoom: 1.5, tilt: 0.3 }),
    [size, setSize] = useState({ width: 1, height: 300 }),
    [failed, setFailed] = useState(false),
    [ready, setReady] = useState(false),
    [selected, setSelected] = useState(0),
    [limit, setLimit] = useState(10),
    [showSources, setShowSources] = useState(false);
  const renderer = useRef<ReturnType<typeof createAtlasRenderer> | null>(null),
    ctx = useRef<ExpoWebGLRenderingContext | null>(null);
  useEffect(() => {
    let live = true;
    void loadTerrain(region)
      .then(async (value) => {
        const next = await loadAtlasPlaces(book, value);
        if (live) {
          setTerrain(value);
          setPlaces(next);
          setSelected(0);
          setLimit(10);
        }
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [book, region]);
  useEffect(() => {
    if (!ready || !renderer.current || !ctx.current) return;
    try {
      renderer.current.draw(size.width, size.height, camera);
      ctx.current.endFrameEXP();
    } catch (error) {
      console.error("Atlas draw failed", error);
      void Promise.resolve().then(() => setFailed(true));
    }
  }, [camera, size, ready]);
  useEffect(
    () => () => {
      try {
        renderer.current?.dispose();
      } catch {}
      releaseContext(ctx.current);
    },
    [],
  );
  const active = places[selected];
  const projected =
    terrain && active
      ? atlasPlaceProjection(terrain, active, size.width / size.height, camera)
      : null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: "#000b",
          padding: 14,
        }}
      >
        <View
          style={{
            backgroundColor: colors.paper,
            borderRadius: 22,
            maxHeight: "94%",
            width: "100%",
            maxWidth: 760,
            alignSelf: "center",
            padding: 18,
            gap: 12,
          }}
        >
          <StudyHeader title={c.title} closeLabel={c.close} onClose={onClose} />
          <ScrollView contentContainerStyle={{ gap: 14 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
              {(["levant", "east", "mediterranean"] as const).map((r, i) => (
                <Pressable
                  key={r}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: r === region }}
                  onPress={() => {
                    if (r === region) return;
                    setReady(false);
                    setTerrain(null);
                    setFailed(false);
                    setRegion(r);
                  }}
                >
                  <Text
                    style={{
                      color: r === region ? colors.goldInk : colors.muted,
                      paddingVertical: 10,
                    }}
                  >
                    {c.regions[i]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View
              style={{
                height: 300,
                overflow: "hidden",
                borderRadius: 16,
                backgroundColor: colors.white,
              }}
              onLayout={(e) =>
                setSize({
                  width: e.nativeEvent.layout.width,
                  height: e.nativeEvent.layout.height,
                })
              }
            >
              {terrain && !failed && (
                <GLView
                  key={region}
                  style={{ flex: 1 }}
                  msaaSamples={0}
                  {...(Platform.OS === "web"
                    ? {
                        webglContextAttributes: WEB_CONTEXT_ATTRIBUTES,
                      }
                    : {})}
                  onContextCreate={(gl) => {
                    try {
                      renderer.current?.dispose();
                      if (ctx.current !== gl) releaseContext(ctx.current);
                      ctx.current = gl;
                      renderer.current = createAtlasRenderer(
                        gl as unknown as WebGLRenderingContext,
                        terrain,
                      );
                      renderer.current.draw(size.width, size.height, camera);
                      gl.endFrameEXP();
                      setReady(true);
                    } catch (error) {
                      console.error("Atlas initialization failed", error);
                      setFailed(true);
                    }
                  }}
                />
              )}
              {!terrain && !failed && (
                <ActivityIndicator color={colors.goldInk} />
              )}
              {ready &&
                !failed &&
                projected &&
                projected.x > 0 &&
                projected.x < 1 &&
                projected.y > 0 &&
                projected.y < 1 && (
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: Math.max(
                        8,
                        Math.min(size.width - 160, projected.x * size.width),
                      ),
                      top: projected.y * size.height,
                      gap: 2,
                    }}
                  >
                    <Text style={{ color: colors.goldInk, fontSize: 22 }}>
                      ●
                    </Text>
                    <Text
                      style={{
                        color: colors.ink,
                        backgroundColor: colors.white,
                        padding: 5,
                        fontSize: 14,
                      }}
                    >
                      {active.name}
                      {active.uncertain ? " ?" : ""}
                    </Text>
                  </View>
                )}
            </View>
            {failed && <Body small>{c.error}</Body>}
            <Body small>{c.hint}</Body>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[
                [-0.3, "↶"],
                [0.3, "↷"],
              ].map(([d, label], i) => (
                <StudyAction
                  key={String(label)}
                  secondary
                  title={String(label)}
                  accessibilityLabel={c.controls[i]}
                  onPress={() =>
                    setCamera((v) => ({ ...v, yaw: v.yaw + Number(d) }))
                  }
                />
              ))}
              <StudyAction
                secondary
                title="+"
                accessibilityLabel={c.controls[2]}
                onPress={() =>
                  setCamera((v) => ({
                    ...v,
                    zoom: Math.min(2.1, v.zoom + 0.15),
                  }))
                }
              />
              <StudyAction
                secondary
                title="−"
                accessibilityLabel={c.controls[3]}
                onPress={() =>
                  setCamera((v) => ({
                    ...v,
                    zoom: Math.max(0.65, v.zoom - 0.15),
                  }))
                }
              />
              <StudyAction
                secondary
                title="3D ↕"
                accessibilityLabel={c.controls[4]}
                onPress={() =>
                  setCamera((v) => ({ ...v, tilt: v.tilt > 0.6 ? -0.5 : 1.2 }))
                }
              />
            </View>
            {!places.length && terrain && <Body small>{c.none}</Body>}
            {places.slice(0, limit).map((p, i) => (
              <Pressable
                key={`${p.name}:${p.lon}:${p.lat}`}
                onPress={() => setSelected(i)}
                accessibilityRole="button"
                style={{
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderColor: colors.line,
                }}
              >
                <Text
                  style={{
                    color: selected === i ? colors.goldInk : colors.ink,
                  }}
                >
                  {p.name}
                  {p.uncertain ? " ?" : ""}
                </Text>
              </Pressable>
            ))}
            {places.length > limit && (
              <StudyAction
                secondary
                title={c.more}
                onPress={() => setLimit(limit + 10)}
              />
            )}
            <Body small>{c.note}</Body>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showSources }}
              onPress={() => setShowSources(!showSources)}
            >
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {c.sources} {showSources ? "⌃" : "⌄"}
              </Text>
            </Pressable>
            {showSources && (
              <View style={{ gap: 10 }}>
                <Body small>
                  OpenBible.info (CC BY) · © OpenStreetMap contributors (ODbL) ·
                  Natural Earth (public domain) · USGS SRTM/GMTED2010 · NOAA
                  ETOPO1 · EU Copernicus EU-DEM. Terrain Tiles / Mapzen. Sampled
                  and simplified for this viewer.
                </Body>
                {atlasSources.sources.map((url, i) => (
                  <External
                    key={url}
                    title={
                      [
                        "OpenBible.info",
                        "CC BY 4.0",
                        "OpenStreetMap / ODbL",
                        "Terrain Tiles",
                        "Terrain attribution",
                        "Natural Earth",
                      ][i]
                    }
                    url={url}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
