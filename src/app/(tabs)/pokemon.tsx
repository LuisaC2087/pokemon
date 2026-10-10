import { useEffect, useState, useContext, useCallback } from "react";
import { Image, ScrollView, StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { AppContext } from "../../context/AppContext";

const BASE_URL = "https://pokemon-node-ueas.onrender.com";

const TYPES = ["Todos", "Fire", "Water", "Electric", "Grass/Poison", "Normal", "Normal/Fairy", "Fighting", "Rock/Ground", "Ghost/Poison"];

export default function Pokemon() {
  const [pokemons, setPokemons] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState("Todos");
  const [serviceStatus, setServiceStatus] = useState<string | null>(null);
  const router = useRouter();
  const { setSelectedPokemon } = useContext(AppContext);

  useEffect(() => {
    fetch(`${BASE_URL}/health`)
      .then((res) => res.json())
      .then((data) => setServiceStatus(data.status))
      .catch(() => setServiceStatus("error"));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE_URL}/pokemons`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPokemons(data);
        else setError("Error en respuesta");
      })
      .catch(() => setError("Error cargando pokemons"))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    setSelectedType("Todos");
    if (text.length === 0) {
      setLoading(true);
      fetch(`${BASE_URL}/pokemons`)
        .then((res) => res.json())
        .then((data) => { if (Array.isArray(data)) setPokemons(data); })
        .catch(() => setError("Error buscando"))
        .finally(() => setLoading(false));
      return;
    }
    if (text.length >= 2) {
      setLoading(true);
      fetch(`${BASE_URL}/pokemons/search/${text}`)
        .then((res) => res.json())
        .then((data) => { if (Array.isArray(data)) setPokemons(data); })
        .catch(() => setError("Error buscando"))
        .finally(() => setLoading(false));
    }
  }, []);

  const handleTypeFilter = useCallback((type: string) => {
    setSelectedType(type);
    setSearch("");
    setLoading(true);
    if (type === "Todos") {
      fetch(`${BASE_URL}/pokemons`)
        .then((res) => res.json())
        .then((data) => { if (Array.isArray(data)) setPokemons(data); })
        .catch(() => setError("Error filtrando"))
        .finally(() => setLoading(false));
    } else {
      fetch(`${BASE_URL}/pokemons/type/${type}`)
        .then((res) => res.json())
        .then((data) => { if (Array.isArray(data)) setPokemons(data); })
        .catch(() => setError("Error filtrando"))
        .finally(() => setLoading(false));
    }
  }, []);

  const handlePress = (poke: any) => {
    setLoading(true);
    fetch(`${BASE_URL}/pokemons/${poke.id}`)
      .then((res) => res.json())
      .then((data) => {
        setSelectedPokemon(data);
        router.push("/(tabs)/pokemon-details");
      })
      .catch(() => {
        setSelectedPokemon(poke);
        router.push("/(tabs)/pokemon-details");
      })
      .finally(() => setLoading(false));
  };

  return (
    <LinearGradient colors={['#7f0000', '#3b0000', '#1a0000']} style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Pokémon</Text>
        <View style={[styles.statusDot, { backgroundColor: serviceStatus === "ok" ? "#4CAF50" : "#F44336" }]} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Buscar Pokémon..."
        placeholderTextColor="#aaa"
        value={search}
        onChangeText={handleSearch}
      />

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ alignItems: 'center' }}>
          {TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.filterChip, selectedType === type && styles.filterChipActive]}
              onPress={() => handleTypeFilter(type)}
            >
              <Text style={[styles.filterText, selectedType === type && styles.filterTextActive]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {error !== "" && <Text style={styles.error}>{error}</Text>}
      {loading && <ActivityIndicator color="#ff5252" size="large" style={{ marginVertical: 20 }} />}

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {pokemons.map((poke: any) => (
          <TouchableOpacity key={poke.id} onPress={() => handlePress(poke)}>
            <BlurView intensity={20} tint="dark" style={styles.glassCard}>
              <Image source={{ uri: poke.image_url }} style={styles.image} />
              <View style={styles.cardInfo}>
                <Text style={styles.name}>{poke.name}</Text>
                <Text style={styles.type}>{poke.type}</Text>
              </View>
            </BlurView>
          </TouchableOpacity>
        ))}
        {!loading && pokemons.length === 0 && (
          <Text style={styles.empty}>No se encontraron Pokémon</Text>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 20, gap: 10 },
  header: { color: "#fff", fontSize: 32, fontWeight: "bold", textAlign: "center", textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 },
  statusDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.5)" },
  input: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  filterContainer: {
    height: 55, // Fixed height container to prevent cut off
    marginBottom: 10,
  },
  filterRow: {
    flex: 1,
  },
  filterChip: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  filterChipActive: {
    backgroundColor: "rgba(227, 53, 13, 0.8)",
    borderColor: "#E3350D",
  },
  filterText: {
    color: "#ccc",
    fontSize: 14,
    fontWeight: "bold",
  },
  filterTextActive: {
    color: "#fff",
    textShadowColor: 'rgba(0,0,0,0.3)', 
    textShadowOffset: {width: 1, height: 1}, 
    textShadowRadius: 2
  },
  error: { color: "#ff6b6b", textAlign: "center", marginBottom: 10 },
  glassCard: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  cardInfo: { flex: 1, marginLeft: 15 },
  image: { width: 80, height: 80, resizeMode: "contain" },
  name: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  type: { color: "#ff8a80", fontSize: 14, marginTop: 4, fontWeight: "600" },
  empty: { color: "#ff8a80", textAlign: "center", marginTop: 30, fontSize: 16 },
});