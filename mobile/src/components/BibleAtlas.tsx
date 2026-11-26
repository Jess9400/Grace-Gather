import { useState } from "react";
import { View, Text, Image, Modal, ScrollView, Pressable } from "react-native";
import { Body, External, colors } from "./quiet-ui";
import { StudyAction, StudyHeader } from "./StudyControls";
import { atlasImages, atlasSize, type AtlasRegion } from "../lib/study-atlas";
import type { Language } from "../lib/content";
const copy = {
  en: {
    error: "Could not load this map.",
    retry: "Try again",
    title: "World of this passage",
    close: "Close",
    zoom: "Enlarge map",
    fit: "Fit map",
    hint: "Enlarge to read the labels. Scroll to explore the enlarged image.",
    note: "Regional reference map. Ancient place names on a present-day physical base; no ancient borders or routes are reconstructed.",
    sources: "Sources & notes",
    regions: ["Galilee & Judea", "Ancient Near East", "Mediterranean"],
  },
  pt: {
    error: "Não foi possível carregar o mapa.",
    retry: "Tentar novamente",
    title: "O mundo desta passagem",
    close: "Fechar",
    zoom: "Ampliar mapa",
    fit: "Ajustar mapa",
    hint: "Amplie para ler os nomes. Role para explorar a imagem ampliada.",
    note: "Mapa de referência regional. Nomes antigos sobre uma base física atual; sem reconstrução de fronteiras ou rotas antigas.",
    sources: "Fontes e notas",
    regions: ["Galileia e Judeia", "Antigo Oriente Próximo", "Mediterrâneo"],
  },
  es: {
    error: "No se pudo cargar el mapa.",
    retry: "Reintentar",
    title: "El mundo de este pasaje",
    close: "Cerrar",
    zoom: "Ampliar mapa",
    fit: "Ajustar mapa",
    hint: "Amplía para leer los nombres. Desplázate por la imagen ampliada.",
    note: "Mapa regional de referencia. Nombres antiguos sobre una base física actual; no se reconstruyen fronteras ni rutas antiguas.",
    sources: "Fuentes y notas",
    regions: ["Galilea y Judea", "Antiguo Oriente Próximo", "Mediterráneo"],
  },
  ru: {
    error: "Не удалось загрузить карту.",
    retry: "Повторить",
    title: "Мир этого отрывка",
    close: "Закрыть",
    zoom: "Увеличить карту",
    fit: "Вписать карту",
    hint: "Увеличьте карту, чтобы читать названия. Прокручивайте увеличенное изображение.",
    note: "Региональная справочная карта. Древние названия на современной физической основе; без реконструкции древних границ и маршрутов.",
    sources: "Источники и примечания",
    regions: ["Галилея и Иудея", "Древний Ближний Восток", "Средиземноморье"],
  },
};
export default function BibleAtlas({
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
    [zoom, setZoom] = useState(false),
    [width, setWidth] = useState(320),
    [sources, setSources] = useState(false),
    [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0);
  const [w, h] = atlasSize[region];
  const imageWidth = zoom
    ? Math.max(width, 1100)
    : Math.min(width, (400 * w) / h);
  const imageHeight = (imageWidth * h) / w;
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
            maxWidth: 900,
            alignSelf: "center",
            padding: 18,
            gap: 12,
          }}
        >
          <StudyHeader title={c.title} closeLabel={c.close} onClose={onClose} />
          <ScrollView contentContainerStyle={{ gap: 14 }}>
            <View
              accessibilityRole="tablist"
              style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}
            >
              {(["levant", "east", "mediterranean"] as const).map((r, i) => (
                <Pressable
                  key={r}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: r === region }}
                  onPress={() => {
                    setRegion(r);
                    setZoom(false);
                    setFailed(false);
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
              onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
              style={{
                borderRadius: 14,
                overflow: "hidden",
                backgroundColor: "#f4ebd8",
              }}
            >
              <ScrollView
                key={`${region}:${zoom}`}
                style={{ height: Math.min(zoom ? 480 : 600, imageHeight) }}
                nestedScrollEnabled
              >
                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  contentContainerStyle={{
                    width: Math.max(width, imageWidth),
                    height: imageHeight,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image
                    key={`${region}:${language}:${retry}`}
                    accessibilityLabel={
                      c.regions[
                        (["levant", "east", "mediterranean"] as const).indexOf(
                          region,
                        )
                      ]
                    }
                    source={atlasImages[region][language]}
                    resizeMode="contain"
                    style={{ width: imageWidth, height: imageHeight }}
                    onError={() => setFailed(true)}
                  />
                </ScrollView>
              </ScrollView>
            </View>
            {failed && (
              <View style={{ gap: 10 }}>
                <Body small>{c.error}</Body>
                <StudyAction
                  secondary
                  title={c.retry}
                  onPress={() => {
                    setFailed(false);
                    setRetry((v) => v + 1);
                  }}
                />
              </View>
            )}
            <StudyAction
              secondary
              icon={zoom ? "contract-outline" : "expand-outline"}
              title={zoom ? c.fit : c.zoom}
              onPress={() => setZoom(!zoom)}
            />
            {zoom && <Body small>{c.hint}</Body>}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: sources }}
              onPress={() => setSources(!sources)}
            >
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {c.sources} {sources ? "⌃" : "⌄"}
              </Text>
            </Pressable>
            {sources && (
              <View style={{ gap: 10 }}>
                <Body small>{c.note}</Body>
                <Body small>
                  Natural Earth (public domain) · OpenBible.info (CC BY) · ©
                  OpenStreetMap contributors (ODbL). Grace & Gather.
                </Body>
                <External
                  title="Natural Earth"
                  url="https://www.naturalearthdata.com/about/terms-of-use/"
                />
                <External
                  title="OpenBible.info"
                  url="https://www.openbible.info/geo/"
                />
                <External
                  title="OpenStreetMap / ODbL"
                  url="https://www.openstreetmap.org/copyright"
                />
                <External
                  title="CC BY 4.0"
                  url="https://creativecommons.org/licenses/by/4.0/"
                />
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
