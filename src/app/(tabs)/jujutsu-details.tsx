import { useContext } from "react";
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { AppContext } from "../../context/AppContext";

export default function JujutsuDetails() {
  const { selectedJujutsu } = useContext(AppContext);
  const router = useRouter();

  if (!selectedJujutsu) {
    return (
      <LinearGradient colors={['#4a148c', '#311b92', '#1a0033']} style={styles.vacio}>
        <Text style={styles.mensaje}>Primero selecciona un personaje de la lista.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push("/(tabs)/jujutsu")}>
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  const Row = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );

  return (
    <LinearGradient colors={['#4a148c', '#311b92', '#1a0033']} style={styles.container}>
      <Text style={styles.header}>Ficha de Hechicero</Text>
      
      <ScrollView contentContainerStyle={styles.content}>
        <BlurView intensity={30} tint="dark" style={styles.glassCard}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: selectedJujutsu.image_url }} style={styles.image} />
          </View>
          <Text style={styles.name}>{selectedJujutsu.name}</Text>
          <View style={styles.gradeBadge}>
            <Text style={styles.gradeText}>{selectedJujutsu.grade || "Desconocido"}</Text>
          </View>
          
          <View style={styles.statsContainer}>
            <Row label="🔮 Técnica Maldita" value={selectedJujutsu.technique || "Desconocida"} />
            <Row label="⚡ Expansión de Dominio" value={selectedJujutsu.domain_expansion || "Ninguno"} />
            <Row label="🌟 Grado Oficial" value={selectedJujutsu.grade || "Desconocido"} />
          </View>

          <TouchableOpacity style={styles.backButton} onPress={() => router.push("/(tabs)/jujutsu")}>
            <Text style={styles.backText}>← Volver a la lista</Text>
          </TouchableOpacity>
        </BlurView>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50 },
  content: { alignItems: "center", paddingBottom: 90 },
  header: { color: "#fff", fontSize: 26, fontWeight: "bold", textAlign: "center", marginBottom: 20, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 },
  vacio: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  mensaje: { color: "#e040fb", fontSize: 18, textAlign: "center", marginBottom: 20 },
  glassCard: {
    borderRadius: 25,
    padding: 25,
    alignItems: "center",
    width: "100%",
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  imageContainer: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: 'hidden'
  },
  image: { width: 220, height: 220, resizeMode: "cover" },
  name: { color: "#fff", fontSize: 32, fontWeight: "800", marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3, textAlign: "center" },
  gradeBadge: {
    backgroundColor: "rgba(224, 64, 251, 0.2)",
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e040fb",
    marginBottom: 25,
  },
  gradeText: { color: "#ea80fc", fontSize: 14, fontWeight: "bold", textTransform: "uppercase" },
  statsContainer: {
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  label: { color: "#ea80fc", fontSize: 13, fontWeight: "600", flex: 1 },
  value: { color: "#fff", fontSize: 13, fontWeight: "bold", textAlign: "right", flex: 1 },
  backButton: { backgroundColor: "rgba(255, 255, 255, 0.1)", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 25, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", width: "100%" },
  backText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});