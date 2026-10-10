import { useContext, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { AppContext } from "../../context/AppContext";

const BASE_URL = "https://profesores-node-ueas.onrender.com";

export default function ProfesoresDetails() {
  const { selectedProfesor: p, setSelectedProfesor } = useContext(AppContext);
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  if (!p) {
    return (
      <LinearGradient colors={['#1a2a6c', '#112240', '#0a192f']} style={styles.center}>
        <Text style={styles.errorText}>No se ha seleccionado ningún Profesor</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push("/(tabs)/profesores")}>
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  const handleDelete = () => {
    Alert.alert("Confirmar", "¿Estás seguro de que deseas eliminar este profesor?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
          setDeleting(true);
          try {
            const res = await fetch(`${BASE_URL}/profesores/${p._id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Error al eliminar");
            Alert.alert("Éxito", "Profesor eliminado");
            setSelectedProfesor(null);
            router.push("/(tabs)/profesores");
          } catch (err: any) { Alert.alert("Error", err.message); } finally { setDeleting(false); }
      }}
    ]);
  };

  const handleEdit = () => router.push("/(tabs)/profesores-form");

  const Section = ({ title }: { title: string }) => <Text style={styles.sectionTitle}>{title}</Text>;
  const Row = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.row}><Text style={styles.label}>{label}:</Text><Text style={styles.value}>{value || "—"}</Text></View>
  );
  const Badges = ({ items }: { items: string[] }) => (
    <View style={styles.badgesContainer}>
      {(items || []).map((item, i) => (
        <View key={i} style={styles.badge}><Text style={styles.badgeText}>{item}</Text></View>
      ))}
    </View>
  );

  return (
    <LinearGradient colors={['#1a2a6c', '#112240', '#0a192f']} style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Header */}
        <BlurView intensity={30} tint="dark" style={styles.headerGlass}>
          <Image source={{ uri: p.image_url || p.imagen_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nombre)}&background=random&color=fff&size=200` }} style={styles.image} />
          <Text style={styles.name}>{p.nombre}</Text>
          <Text style={styles.profesion}>{p.profesion}</Text>
          <Text style={styles.ubicacion}>📍 {p.ubicacion}</Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.editButton} onPress={handleEdit}><Text style={styles.actionText}>✏️ Editar</Text></TouchableOpacity>
            {deleting ? <ActivityIndicator size="small" color="#ff6b6b" style={{ marginLeft: 10 }} /> : 
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}><Text style={styles.actionText}>🗑️ Eliminar</Text></TouchableOpacity>}
          </View>

          <TouchableOpacity onPress={() => router.push("/(tabs)/profesores")}><Text style={styles.backLink}>← Volver a la lista</Text></TouchableOpacity>
        </BlurView>

        <BlurView intensity={20} tint="dark" style={styles.glassCard}>
          <Section title="Formación Académica" />
          <Row label="Pregrado" value={p.formacion?.pregrado} />
          <Row label="Universidad" value={p.formacion?.universidad_pregrado} />
          <Row label="Maestría" value={p.formacion?.maestria} />
          <Row label="Universidad" value={p.formacion?.universidad_maestria} />
        </BlurView>

        <BlurView intensity={20} tint="dark" style={styles.glassCard}>
          <Section title="Cargos" />
          <Badges items={p.cargos} />
        </BlurView>

        <BlurView intensity={20} tint="dark" style={styles.glassCard}>
          <Section title="Experiencia" />
          <Row label="SENA" value={p.experiencia?.sena} />
          <Row label="Docencia Universitaria" value={p.experiencia?.docencia_universitaria} />
        </BlurView>

        <BlurView intensity={20} tint="dark" style={styles.glassCard}>
          <Section title="Lenguajes de Programación" /><Badges items={p.lenguajes_programacion} />
          <Section title="Bases de Datos SQL" /><Badges items={p.bases_de_datos?.sql} />
          <Section title="Bases de Datos NoSQL" /><Badges items={p.bases_de_datos?.nosql} />
        </BlurView>

        <BlurView intensity={20} tint="dark" style={styles.glassCard}>
          <Section title="Sistemas Operativos" /><Badges items={p.sistemas_operativos} />
          <Section title="Otras Áreas" /><Badges items={p.otras_areas} />
          <Section title="Aptitudes Principales" /><Badges items={p.aptitudes_principales} />
        </BlurView>

        <BlurView intensity={20} tint="dark" style={styles.glassCard}>
          <Section title="Contacto" />
          <Row label="Contactos LinkedIn" value={String(p.contactos || "—")} />
          <Row label="LinkedIn" value={p.linkedin} />
        </BlurView>

        <TouchableOpacity style={styles.backButton} onPress={() => router.push("/(tabs)/profesores")}>
          <Text style={styles.backText}>Volver a la lista</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: "#fff", fontSize: 18, marginBottom: 20 },
  headerGlass: {
    alignItems: "center", padding: 30, paddingTop: 60,
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(0,0,0,0.3)",
    overflow: 'hidden',
  },
  image: { width: 120, height: 120, borderRadius: 60, marginBottom: 15, borderWidth: 3, borderColor: "#64ffda" },
  name: { fontSize: 26, fontWeight: "bold", color: "#fff", textAlign: "center", textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 },
  profesion: { fontSize: 14, color: "#ccd6f6", marginTop: 8, textAlign: "center", lineHeight: 20 },
  ubicacion: { fontSize: 13, color: "#64ffda", marginTop: 6 },
  actionButtons: { flexDirection: "row", marginTop: 15, gap: 15 },
  editButton: { backgroundColor: "rgba(2, 119, 189, 0.8)", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: "#0277bd" },
  deleteButton: { backgroundColor: "rgba(211, 47, 47, 0.8)", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: "#d32f2f" },
  actionText: { color: "#fff", fontWeight: "bold", textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 },
  backLink: { color: "#64ffda", marginTop: 20, fontSize: 14, fontWeight: "bold" },
  glassCard: { margin: 15, marginBottom: 5, borderRadius: 15, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(0,0,0,0.2)", overflow: 'hidden' },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#64ffda", marginBottom: 10, marginTop: 5, borderBottomWidth: 1, borderBottomColor: "rgba(100,255,218,0.3)", paddingBottom: 6 },
  row: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.1)" },
  label: { color: "#ccd6f6", fontSize: 13, flex: 1, fontWeight: "600" },
  value: { color: "#fff", fontSize: 13, fontWeight: "bold", flex: 2, textAlign: "right" },
  badgesContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  badge: { backgroundColor: "rgba(255,255,255,0.1)", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  backButton: { backgroundColor: "rgba(255,255,255,0.1)", margin: 15, padding: 15, borderRadius: 12, alignItems: "center", marginTop: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  backText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
