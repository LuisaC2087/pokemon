import { useContext } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { AppContext } from "../../context/AppContext";

export default function ProfesoresDetails() {
  const { selectedProfesor: p } = useContext(AppContext);
  const router = useRouter();

  if (!p) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No se ha seleccionado ningún Profesor</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push("/(tabs)/profesores")}>
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const Section = ({ title }: { title: string }) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  const Row = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{value || "—"}</Text>
    </View>
  );

  const Badges = ({ items }: { items: string[] }) => (
    <View style={styles.badgesContainer}>
      {(items || []).map((item, i) => (
        <View key={i} style={styles.badge}>
          <Text style={styles.badgeText}>{item}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image 
          source={{ uri: p.image_url || p.imagen_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nombre)}&background=random&color=fff&size=200` }} 
          style={styles.image} 
        />
        <Text style={styles.name}>{p.nombre}</Text>
        <Text style={styles.profesion}>{p.profesion}</Text>
        <Text style={styles.ubicacion}>📍 {p.ubicacion}</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/profesores")}>
          <Text style={styles.backLink}>← Volver a la lista</Text>
        </TouchableOpacity>
      </View>

      {/* Formación */}
      <View style={styles.card}>
        <Section title="Formación Académica" />
        <Row label="Pregrado" value={p.formacion?.pregrado} />
        <Row label="Universidad" value={p.formacion?.universidad_pregrado} />
        <Row label="Maestría" value={p.formacion?.maestria} />
        <Row label="Universidad" value={p.formacion?.universidad_maestria} />
      </View>

      {/* Cargos */}
      <View style={styles.card}>
        <Section title="Cargos" />
        <Badges items={p.cargos} />
      </View>

      {/* Experiencia */}
      <View style={styles.card}>
        <Section title="Experiencia" />
        <Row label="SENA" value={p.experiencia?.sena} />
        <Row label="Docencia Universitaria" value={p.experiencia?.docencia_universitaria} />
      </View>

      {/* Tecnología */}
      <View style={styles.card}>
        <Section title="Lenguajes de Programación" />
        <Badges items={p.lenguajes_programacion} />
      </View>

      <View style={styles.card}>
        <Section title="Bases de Datos SQL" />
        <Badges items={p.bases_de_datos?.sql} />
        <Section title="Bases de Datos NoSQL" />
        <Badges items={p.bases_de_datos?.nosql} />
      </View>

      <View style={styles.card}>
        <Section title="Frontend" />
        <Badges items={p.frontend} />
        <Section title="Backend" />
        <Badges items={p.backend} />
      </View>

      <View style={styles.card}>
        <Section title="Sistemas Operativos" />
        <Badges items={p.sistemas_operativos} />
        <Section title="Otras Áreas" />
        <Badges items={p.otras_areas} />
      </View>

      {/* Aptitudes */}
      <View style={styles.card}>
        <Section title="Aptitudes Principales" />
        <Badges items={p.aptitudes_principales} />
      </View>

      {/* Contacto */}
      <View style={styles.card}>
        <Section title="Contacto" />
        <Row label="Contactos LinkedIn" value={String(p.contactos || "—")} />
        <Row label="LinkedIn" value={p.linkedin} />
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => router.push("/(tabs)/profesores")}>
        <Text style={styles.backText}>Volver a la lista</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1e1e1e" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1e1e1e" },
  errorText: { color: "#fff", fontSize: 18, marginBottom: 20 },
  header: {
    alignItems: "center", padding: 30, paddingTop: 60,
    backgroundColor: "#2a2a2a", borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
  },
  image: {
    width: 120, height: 120, borderRadius: 60, marginBottom: 15,
  },
  name: { fontSize: 24, fontWeight: "bold", color: "#fff", textAlign: "center" },
  profesion: { fontSize: 13, color: "#aaa", marginTop: 8, textAlign: "center", lineHeight: 20 },
  ubicacion: { fontSize: 13, color: "#4CAF50", marginTop: 6 },
  backLink: { color: "#64B5F6", marginTop: 15, fontSize: 14 },
  card: { backgroundColor: "#2a2a2a", margin: 15, marginBottom: 5, borderRadius: 15, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#fff", marginBottom: 10, marginTop: 10, borderBottomWidth: 1, borderBottomColor: "#444", paddingBottom: 6 },
  row: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#333" },
  label: { color: "#aaa", fontSize: 13, flex: 1 },
  value: { color: "#fff", fontSize: 13, fontWeight: "bold", flex: 2, textAlign: "right" },
  badgesContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 5 },
  badge: { backgroundColor: "#333", paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20 },
  badgeText: { color: "#fff", fontSize: 12 },
  backButton: { backgroundColor: "#2E7D32", margin: 15, padding: 15, borderRadius: 10, alignItems: "center", marginTop: 10 },
  backText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
