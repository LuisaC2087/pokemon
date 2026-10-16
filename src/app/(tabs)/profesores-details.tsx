import { useContext, useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, Alert, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { AppContext } from "../../context/AppContext";
import { markProfesorSeen } from "../../services/profesoresDb";

const BASE_URL = "https://profesores-node-ueas.onrender.com";

export default function ProfesoresDetails() {
  const { selectedProfesor: p, setSelectedProfesor, triggerSync } = useContext(AppContext);
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  // Marcar como visto al abrir los detalles
  useEffect(() => {
    if (p?.id && p?.is_new === 1) {
      markProfesorSeen(p.id).then(() => {
        // Actualizar el profesor seleccionado para quitar el badge
        setSelectedProfesor({ ...p, is_new: 0 });
      });
    }
  }, [p?.id]);

  if (!p) {
    return (
      <LinearGradient colors={["#1a2a6c", "#112240", "#0a192f"]} style={styles.center}>
        <Text style={styles.errorText}>No se ha seleccionado ningún Profesor</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push("/(tabs)/profesores")}>
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  const handleDelete = () => {
    const profId = p.id || p._id;
    Alert.alert("Confirmar", "¿Eliminar este profesor?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive", onPress: async () => {
          setDeleting(true);
          try {
            const res = await fetch(`${BASE_URL}/profesores/${profId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Error al eliminar");
            Alert.alert("Éxito", "Profesor eliminado");
            setSelectedProfesor(null);
            await triggerSync(); // re-sync después de eliminar
            router.push("/(tabs)/profesores");
          } catch (err: any) {
            Alert.alert("Error", err.message);
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const handleEdit = () => router.push("/(tabs)/profesores-form");

  const Row = ({ label, value }: { label: string; value?: string }) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{value || "—"}</Text>
    </View>
  );

  // Compatibilidad con datos de nube (campos anidados) y datos locales (planos)
  const nombre     = p.nombre ?? "—";
  const depto      = p.departamento ?? "—";
  const profesion  = p.profesion ?? "—";
  const email      = p.email ?? "—";
  const telefono   = p.telefono ?? String(p.contactos ?? "—");
  const imagenUrl  = p.imagen_url ?? p.image_url ?? "";

  return (
    <LinearGradient colors={["#1a2a6c", "#112240", "#0a192f"]} style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>

        {/* ── CABECERA ───────────────────────────── */}
        <BlurView intensity={30} tint="dark" style={styles.headerGlass}>
          <Image
            source={{
              uri: imagenUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random&color=fff&size=200`,
            }}
            style={styles.image}
          />

          {/* Badge NUEVO si aplica */}
          {p.is_new === 1 && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NUEVO</Text>
            </View>
          )}

          <Text style={styles.name}>{nombre}</Text>
          <Text style={styles.profesionText}>{profesion}</Text>
          <Text style={styles.deptText}>{depto}</Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
              <Text style={styles.actionText}>✏️ Editar</Text>
            </TouchableOpacity>
            {deleting
              ? <ActivityIndicator size="small" color="#ff6b6b" style={{ marginLeft: 10 }} />
              : (
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                  <Text style={styles.actionText}>🗑️ Eliminar</Text>
                </TouchableOpacity>
              )}
          </View>

          <TouchableOpacity onPress={() => router.push("/(tabs)/profesores")}>
            <Text style={styles.backLink}>← Volver a la lista</Text>
          </TouchableOpacity>
        </BlurView>

        {/* ── DATOS ──────────────────────────────── */}
        <BlurView intensity={20} tint="dark" style={styles.glassCard}>
          <Text style={styles.sectionTitle}>Datos del Profesor</Text>
          <Row label="Nombre" value={nombre} />
          <Row label="Departamento" value={depto} />
          <Row label="Profesión" value={profesion} />
          <Row label="Email" value={email} />
          <Row label="Teléfono" value={telefono} />
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
    backgroundColor: "rgba(0,0,0,0.3)", overflow: "hidden",
  },
  image: {
    width: 120, height: 120, borderRadius: 60,
    marginBottom: 15, borderWidth: 3, borderColor: "#64ffda",
  },
  newBadge: {
    backgroundColor: "#ff6b6b", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 4,
    marginBottom: 8,
  },
  newBadgeText: { color: "#fff", fontWeight: "bold", fontSize: 13, letterSpacing: 1 },
  name: {
    fontSize: 26, fontWeight: "bold", color: "#fff",
    textAlign: "center", textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3,
  },
  profesionText: { fontSize: 14, color: "#ccd6f6", marginTop: 6, textAlign: "center" },
  deptText: { fontSize: 13, color: "#64ffda", marginTop: 4 },
  actionButtons: { flexDirection: "row", marginTop: 18, gap: 15 },
  editButton: {
    backgroundColor: "rgba(2,119,189,0.8)",
    paddingVertical: 9, paddingHorizontal: 18,
    borderRadius: 10, borderWidth: 1, borderColor: "#0277bd",
  },
  deleteButton: {
    backgroundColor: "rgba(211,47,47,0.8)",
    paddingVertical: 9, paddingHorizontal: 18,
    borderRadius: 10, borderWidth: 1, borderColor: "#d32f2f",
  },
  actionText: {
    color: "#fff", fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2,
  },
  backLink: { color: "#64ffda", marginTop: 20, fontSize: 14, fontWeight: "bold" },
  glassCard: {
    margin: 15, marginBottom: 5, borderRadius: 15,
    padding: 20, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(0,0,0,0.2)", overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 16, fontWeight: "bold", color: "#64ffda",
    marginBottom: 12, borderBottomWidth: 1,
    borderBottomColor: "rgba(100,255,218,0.3)", paddingBottom: 6,
  },
  row: {
    flexDirection: "row", paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)",
  },
  label: { color: "#ccd6f6", fontSize: 13, flex: 1, fontWeight: "600" },
  value: { color: "#fff", fontSize: 13, fontWeight: "bold", flex: 2, textAlign: "right" },
  backButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    margin: 15, padding: 15, borderRadius: 12,
    alignItems: "center", marginTop: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  backText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
