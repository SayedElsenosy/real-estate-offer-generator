import React from "react";
import { Document, Page, Text, View, Image, Svg, Path, StyleSheet } from "@react-pdf/renderer";
import type { InventoryUnit } from "@/lib/sheets";
import type { ScheduleRow } from "@/lib/payment";

export type FloorGeometry = { viewBox: string; backgroundData: string | null; shapes: { unitCode: string; d: string; status: "AVAILABLE" | "UNAVAILABLE" | "SOLD_OUT" }[] } | null;
export type OfferSchedule = {
  name: string; totalPrice: string; downPayment: string; maintenance: string;
  deliveryDate: string | null; deliveryCollection: string; deliveryCollectionPct: string;
  totalIncludingMaintenance: string; rows: ScheduleRow[]
};
const st = StyleSheet.create({
  page: { padding: 38, fontFamily: "Helvetica", fontSize: 10, color: "#1e3047" },
  bar: { paddingBottom: 15, borderBottomWidth: 2, borderBottomColor: "#b49a68", marginBottom: 24 },
  brand: { letterSpacing: 2, fontSize: 12, color: "#aa895b" },
  title: { fontFamily: "Helvetica-Bold", fontSize: 29, marginBottom: 18 },
  hero: { backgroundColor: "#182b45", padding: 24, marginBottom: 20 },
  heroTitle: { fontFamily: "Helvetica-Bold", fontSize: 22, color: "#ffffff" },
  heroSub: { fontSize: 10, marginTop: 10, color: "#e6edf4" },
  row: { flexDirection: "row", paddingVertical: 11, justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#e8edf2" },
  th: { flexDirection: "row", backgroundColor: "#182b45", paddingVertical: 11, paddingHorizontal: 8, color: "#ffffff", marginTop: 15 },
  tr: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#edf0f4" },
  c1: { width: "12%" }, c2: { width: "30%" }, c3: { width: "28%" }, c4: { width: "30%", textAlign: "right" },
  footer: { position: "absolute", bottom: 20, left: 38, right: 38, fontSize: 8, color: "#8593a8" }
});
function Header({ company }: { company: string }) {
  return <View style={st.bar}><Text style={st.brand}>{company.toUpperCase()}</Text></View>;
}
function Footer({ company }: { company: string }) {
  return <Text fixed style={st.footer}>{company} | Confidential proposal | Subject to contract</Text>;
}
function CellRow({ label, value }: { label: string; value: string }) {
  return <View style={st.row}><Text>{label}</Text><Text>{value}</Text></View>;
}
export function OfferDocument({ company, logo, project, unit, issuedAt, floor, schedules }: {
  company: string; logo: string | null; project: string; unit: InventoryUnit;
  issuedAt: string; floor: FloorGeometry; schedules: OfferSchedule[];
}) {
  return <Document title={"Property Offer - " + unit.code} author={company}>
    <Page size="A4" style={st.page}>
      <Header company={company} />
      {logo ? <Image src={logo} style={{ width: 110, height: 55, objectFit: "contain", marginBottom: 20 }} /> : null}
      <Text style={st.title}>PROPERTY OFFER</Text>
      <View style={st.hero}><Text style={st.heroTitle}>{project}</Text><Text style={st.heroSub}>UNIT {unit.code}</Text></View>
      <CellRow label="Offer date" value={issuedAt} />
      <CellRow label="Unit code" value={unit.code} />
      <CellRow label="Floor" value={unit.floor || "-"} />
      <CellRow label="Area" value={unit.area ? unit.area + " sqm" : "-"} />
      <CellRow label="Live inventory status" value={unit.status} />
      <CellRow label="Unit price" value={"EGP " + unit.price} />
      <Text style={{ marginTop: 30, color: "#8593a8", fontSize: 9 }}>Information captured from authorized live inventory when this quotation was issued.</Text>
      <Footer company={company} />
    </Page>
    <Page size="A4" style={st.page}>
      <Header company={company} />
      <Text style={st.title}>UNIT LOCATION</Text>
      <Text>{project} / {unit.code} / Floor {unit.floor || "-"}</Text>
      {floor?.shapes?.length
        ? <View style={{ marginTop: 34, borderWidth: 1, borderColor: "#e0e6ec", padding: 10 }}>
            <View style={{ width: 468, height: 351, position: "relative" }}>
              {floor.backgroundData ? <Image src={floor.backgroundData} style={{ width: 468, height: 351, position: "absolute", left: 0, top: 0 }} /> : null}
              <Svg width={468} height={351} viewBox={floor.viewBox} style={{ position: "absolute", left: 0, top: 0 }}>
                {floor.shapes.map((s, i) => <Path key={i} d={s.d}
                  fill={s.unitCode === unit.code ? "#c99d55" : s.status === "SOLD_OUT" ? "#efaaaa" : s.status === "UNAVAILABLE" ? "#cbd5e1" : "#d8e8df"}
                  fillOpacity={0.42} stroke="#293c54" strokeWidth={3} />)}
              </Svg>
            </View>
          </View>
        : <Text style={{ marginTop: 34, color: "#8c97a5" }}>An approved floor plan is not yet attached for this floor.</Text>}
      <Text style={{ marginTop: 20, color: "#8c97a5", fontSize: 9 }}>Gold marks the chosen unit. Red = SOLD OUT (not in current inventory). Grey = unavailable. Green = available. Floor plan is for location reference, not measurements.</Text>
      <Footer company={company} />
    </Page>
    {schedules.map((schedule, index) => <Page key={index} size="A4" style={st.page} wrap>
      <Header company={company} />
      <Text style={st.title}>PAYMENT SCHEDULE</Text>
      <Text>{schedule.name} / {unit.code}</Text>
      <CellRow label="Price" value={"EGP " + schedule.totalPrice} />
      <CellRow label="Down payment" value={"EGP " + schedule.downPayment} />
      {schedule.deliveryDate && <CellRow label="Expected delivery date" value={schedule.deliveryDate} />}
      {Number(schedule.deliveryCollectionPct) > 0 && <CellRow label={"Collection on delivery (" + Number(schedule.deliveryCollectionPct) + "%)"} value={"EGP " + schedule.deliveryCollection} />}
      <CellRow label="Maintenance deposit" value={"EGP " + schedule.maintenance} />
      <CellRow label="Total with maintenance" value={"EGP " + schedule.totalIncludingMaintenance} />
      <View style={st.th} fixed>
        <Text style={st.c1}>NO.</Text><Text style={st.c2}>DESCRIPTION</Text><Text style={st.c3}>DUE DATE</Text><Text style={st.c4}>AMOUNT (EGP)</Text>
      </View>
      {schedule.rows.map((row, i) => <View key={i} style={st.tr} wrap={false}>
        <Text style={st.c1}>{row.number}</Text>
        <Text style={st.c2}>{row.type === "DELIVERY" ? "DELIVERY COLLECTION" : row.type.replace("_", " ")}</Text>
        <Text style={st.c3}>{row.due}</Text>
        <Text style={st.c4}>{row.amount}</Text>
      </View>)}
      <Footer company={company} />
    </Page>)}
  </Document>;
}
