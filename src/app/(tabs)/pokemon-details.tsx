import { useContext } from "react";
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { AppContext } from "../../context/AppContext";

export default function PokemonDetails() {
  const { selectedPokemon } = useContext(AppContext);
  const router = useRouter();

  if (!selectedPokemon) {
    return (
      <LinearGradient colors={['#7f0000', '#3b0000', '#1a0000']} style={styles.vacio}>
        <Text style={styles.mensaje}>Primero selecciona un Pokémon de la lista.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push("/(tabs)/pokemon")}>
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
    <LinearGradient colors={['#7f0000', '#3b0000', '#1a0000']} style={styles.container}>
      <Text style={styles.header}>Datos Biológicos</Text>
      
      <ScrollView contentContainerStyle={styles.content}>
        <BlurView intensity={30} tint="dark" style={styles.glassCard}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: selectedPokemon.image_url }} style={styles.image} />
          </View>
          <Text style={styles.name}>{selectedPokemon.name}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{selectedPokemon.type}</Text>
          </View>
          
          <View style={styles.statsContainer}>
            <Row label="🛡️ Tipo" value={selectedPokemon.type} />
            <Row label="📏 Altura" value={`${selectedPokemon.height || "?"} dm`} />
            <Row label="⚖️ Peso" value={`${selectedPokemon.weight || "?"} hg`} />
            <Row label="✨ Habilidad" value={selectedPokemon.ability || "Desconocida"} />
            <Row label="❤️ Puntos de Salud" value={`${selectedPokemon.hp || "?"} HP`} />
          </View>

          <TouchableOpacity style={styles.backButton} onPress={() => router.push("/(tabs)/pokemon")}>
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
  mensaje: { color: "#ff8a80", fontSize: 18, textAlign: "center", marginBottom: 20 },
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
  },
  image: { width: 180, height: 180, resizeMode: "contain" },
  name: { color: "#fff", fontSize: 32, fontWeight: "800", marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 },
  typeBadge: {
    backgroundColor: "rgba(255, 82, 82, 0.2)",
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ff5252",
    marginBottom: 25,
  },
  typeText: { color: "#ff8a80", fontSize: 14, fontWeight: "bold", textTransform: "uppercase" },
  statsContainer: {
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  label: { color: "#ff8a80", fontSize: 15, fontWeight: "600" },
  value: { color: "#fff", fontSize: 15, fontWeight: "bold", textAlign: "right" },
  backButton: { backgroundColor: "rgba(255, 255, 255, 0.1)", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 25, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", width: "100%" },
  backText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});