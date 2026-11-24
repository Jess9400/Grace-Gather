import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Heading, Body, Card, Button, colors, serif } from "../components/quiet-ui";

const benefits = [
  ["book-outline", "Study with trusted sources", "Explore deeper commentary, historical context and clearly attributed study notes."],
  ["language-outline", "Closer to the original words", "Compare Greek, Hebrew and Aramaic vocabulary, with translation notes and source references."],
  ["sparkles-outline", "Ask, reflect, understand", "Ask follow-up questions grounded in the passage and its study sources."],
  ["heart-outline", "More room for your journal", "A proposed 3 guided entries and 10 follow-up replies each day."],
] as const;
const plans = [
  { title: "Begin with Mark", days: 16, time: "8 minutes a day", text: "Meet Jesus through the shortest Gospel. Read one chapter each day.", passage: "Mark 1", prompt: "What does this chapter show you about Jesus?" },
  { title: "Hope for today", days: 7, time: "5 minutes a day", text: "A devotional rhythm of Scripture, reflection and prayer.", passage: "Romans 15:13", prompt: "Where would you like to welcome hope today? Take a moment to pray about it." },
];
export default function Pro() {
  const [annual, setAnnual] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [day, setDay] = useState(1);
  const [trial, setTrial] = useState(false);
  return <Screen>
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={s.back}><Ionicons name="chevron-back" size={22} color={colors.ink} /><Body> Bible Study</Body></Pressable>
    <View style={s.label}><Ionicons name="sparkles" size={14} color={colors.goldInk} /><Text style={s.gold}>GRACE & GATHER PRO</Text></View>
    <Heading>Make room for deeper understanding.</Heading>
    <Body>A thoughtful path through Scripture, with sources to explore and space for your questions.</Body>
    <Body small>Design preview · Proposed features and prices</Body>
    {benefits.map(([icon, title, description]) => <View key={title} style={s.feature}><Ionicons name={icon} size={23} color={colors.goldInk} /><View style={s.copy}><Text style={s.title}>{title}</Text><Body small>{description}</Body></View></View>)}
    <Heading>Find your rhythm</Heading>
    <Body small>A reading plan organizes passages over several days. A devotional adds a reflection and a prayer.</Body>
    {plans.map((plan, index) => <Pressable key={plan.title} accessibilityRole="button" onPress={() => {setSelected(index); setDay(1);}}><Card><Text style={s.title}>{plan.title}</Text><Body small>{plan.days} days · {plan.time}</Body><Body>{plan.text}</Body><Text style={s.gold}>Preview plan →</Text></Card></Pressable>)}
    <Card><Text style={s.title}>Free, with room to grow</Text><Body>Your Bible reader and community remain free. Proposed daily guidance includes 1 journal entry, 2 follow-up replies and 1 verse study. Pro adds 10 verse studies a day, reading plans and devotionals.</Body></Card>
    <View style={s.options}>{[false, true].map(value => <Pressable key={String(value)} accessibilityRole="radio" accessibilityState={{checked: annual === value}} onPress={() => setAnnual(value)} style={[s.option, annual === value && s.selected]}><Text style={s.title}>{value ? "$48 / year" : "$5 / month"}</Text><Body small>{value ? "Save 20% · $4/month equivalent" : "Billed monthly"}</Body></Pressable>)}</View>
    <Button title="Preview 3-day free trial" onPress={() => setTrial(true)} />
    <Body small>Proposed offer for eligible new subscribers. Then {annual ? "$48/year" : "$5/month"}, renewing automatically until canceled. This preview creates no subscription.</Body>
    <Body small>Licensed materials will be included when publisher agreements are secured. Original-language tools support study and do not confer a theology qualification.</Body>
    <Modal visible={selected !== null || trial} transparent animationType="fade" onRequestClose={() => {setSelected(null);setTrial(false);}}><View style={s.shade}><View style={s.sheet}>
      {selected !== null ? <><Text style={s.title}>{plans[selected].title}</Text><Body small>Day {day} of {plans[selected].days} · Sample plan</Body><Text style={s.reading}>{selected === 0 ? `Mark ${day}` : plans[selected].passage}</Text><Body>{plans[selected].prompt}</Body><Button title={day < plans[selected].days ? "Mark read · Next day" : "Plan complete"} disabled={day === plans[selected].days} onPress={() => setDay(day + 1)} /></> : <><Heading>Your study, a little deeper.</Heading><Body>The proposed trial gives eligible subscribers three days to explore Pro. Purchases, licensed resources and usage limits are still being prepared.</Body><Body small>{annual ? "$48/year" : "$5/month"} after the proposed trial.</Body></>}
      <Button title="Close preview" secondary onPress={() => {setSelected(null);setTrial(false);}} />
    </View></View></Modal>
  </Screen>;
}
const s = StyleSheet.create({
 back:{flexDirection:"row",alignItems:"center",paddingVertical:10}, label:{flexDirection:"row",gap:8,alignItems:"center",marginTop:20}, gold:{color:colors.goldInk,fontSize:13,letterSpacing:1}, feature:{flexDirection:"row",gap:16,paddingVertical:18,borderBottomWidth:1,borderColor:colors.line},copy:{flex:1,gap:6},title:{color:colors.ink,fontSize:19,fontWeight:"600"},options:{gap:10},option:{padding:18,gap:6,borderWidth:1,borderColor:colors.line,borderRadius:18},selected:{borderColor:colors.goldInk,backgroundColor:colors.white},shade:{flex:1,justifyContent:"center",padding:24,backgroundColor:"#0009"},sheet:{padding:24,gap:20,borderRadius:24,backgroundColor:colors.paper},reading:{fontFamily:serif,fontSize:28,color:colors.ink}
});
