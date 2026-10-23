import { useContext, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, Alert, ActivityIndicator, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { AppContext } from "../../context/AppContext";
import { queueDeleteProfesor } from "../../services/profesoresDb";

const BASE_URL = "https://profesores-node-ueas.onrender.com";

export default function ProfesoresDetails() {
  const { selectedProfesor: p, setSelectedProfesor, triggerSync, refreshLocal } = useContext(AppContext);
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  if (!p) {
    return (
      <LinearGradient colors={["#1a2a6c", "#112240", "#0a192f"]} style={styles.center}>
        <BlurView intensity={30} tint="dark" style={styles.notFoundCard}>
          <Text style={styles.notFoundIcon}>⚠️</Text>
          <View style={styles.notFoundBadge}>
            <Text style={styles.notFoundBadgeText}>AVISO: REGISTRO NO ENCONTRADO</Text>
          </View>
          <Text style={styles.notFoundTitle}>Profesor no encontrado</Text>
          <Text style={styles.notFoundDesc}>
            No se encontró el registro solicitado en la base de datos local ni en la nube. Es posible que haya sido eliminado o no exista.
          </Text>
          <TouchableOpacity style={styles.notFoundBtn} onPress={() => router.push("/(tabs)/profesores")}>
            <Text style={styles.notFoundBtnText}>← Volver a la lista de Profesores</Text>
          </TouchableOpacity>
        </BlurView>
      </LinearGradient>
    );
  }

  const handleDelete = async () => {
    const profId = p.id || p._id;

    // En web, window.confirm funciona; Alert.alert con botones no.
    const confirmed = Platform.OS === "web"
      ? window.confirm("¿Eliminar este profesor?")
      : await new Promise<boolean>((resolve) =>
          Alert.alert("Confirmar", "¿Eliminar este profesor?", [
            { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
            { text: "Eliminar", style: "destructive", onPress: () => resolve(true) },
          ])
        );

    if (!confirmed) return;

    setDeleting(true);
    try {
      // 1. Eliminar de la base de datos local y registrar en la cola de sincronización
      await queueDeleteProfesor(String(profId));

      // Actualizar estado de la interfaz de inmediato
      if (refreshLocal) {
        await refreshLocal();
      }

      // 2. Disparar sincronización para propagar la eliminación a la base de datos en la nube
      triggerSync().catch((err) => console.warn("Error sincronizando eliminación:", err));

      if (Platform.OS === "web") {
        window.alert("Profesor eliminado exitosamente");
      } else {
        Alert.alert("Éxito", "Profesor eliminado");
      }

      setSelectedProfesor(null);
      router.push("/(tabs)/profesores");
    } catch (err: any) {
      if (Platform.OS === "web") {
        window.alert("Error: " + err.message);
      } else {
        Alert.alert("Error", err.message);
      }
    } finally {
      setDeleting(false);
    }
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

  // Not Found Alert Card
  notFoundCard: {
    margin: 20,
    padding: 26,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 171, 0, 0.4)",
    backgroundColor: "rgba(17, 34, 64, 0.75)",
    overflow: "hidden",
    maxWidth: 420,
  },
  notFoundIcon: { fontSize: 44, marginBottom: 12 },
  notFoundBadge: {
    backgroundColor: "rgba(255, 171, 0, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 171, 0, 0.4)",
  },
  notFoundBadgeText: { color: "#ffab00", fontSize: 11, fontWeight: "bold", letterSpacing: 0.8 },
  notFoundTitle: { color: "#fff", fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  notFoundDesc: { color: "#ccd6f6", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  notFoundBtn: {
    backgroundColor: "rgba(100, 255, 218, 0.15)",
    borderWidth: 1,
    borderColor: "#64ffda",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  notFoundBtnText: { color: "#64ffda", fontSize: 14, fontWeight: "bold" },
});
