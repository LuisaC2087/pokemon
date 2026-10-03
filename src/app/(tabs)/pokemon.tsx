import { useEffect, useState, useContext, useCallback } from "react";
import { Image, ScrollView, StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
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

  // GET /health
  useEffect(() => {
    fetch(`${BASE_URL}/health`)
      .then((res) => res.json())
      .then((data) => setServiceStatus(data.status))
      .catch(() => setServiceStatus("error"));
  }, []);

  // GET /pokemons (initial load)
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

  // GET /pokemons/search/:name
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

  // GET /pokemons/type/:type
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

  // GET /pokemons/:id (on card press)
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
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Pokémon</Text>
        <View style={[styles.statusDot, { backgroundColor: serviceStatus === "ok" ? "#4CAF50" : "#F44336" }]} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Buscar Pokémon..."
        placeholderTextColor="#888"
        value={search}
        onChangeText={handleSearch}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
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

      {error !== "" && <Text style={styles.error}>{error}</Text>}
      {loading && <ActivityIndicator color="#fff" size="large" style={{ marginVertical: 20 }} />}

      <ScrollView>
        {pokemons.map((poke: any) => (
          <TouchableOpacity key={poke.id} style={styles.card} onPress={() => handlePress(poke)}>
            <Image source={{ uri: poke.image_url }} style={styles.image} />
            <View style={styles.cardInfo}>
              <Text style={styles.name}>{poke.name}</Text>
              <Text style={styles.type}>{poke.type}</Text>
            </View>
          </TouchableOpacity>
        ))}
        {!loading && pokemons.length === 0 && (
          <Text style={styles.empty}>No se encontraron Pokémon</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    padding: 20,
    paddingTop: 50,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    gap: 10,
  },
  header: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  filterRow: {
    maxHeight: 45,
    marginBottom: 15,
  },
  filterChip: {
    backgroundColor: "#333",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    height: 36,
  },
  filterChipActive: {
    backgroundColor: "#E3350D",
  },
  filterText: {
    color: "#aaa",
    fontSize: 13,
    fontWeight: "bold",
  },
  filterTextActive: {
    color: "#fff",
  },
  error: {
    color: "red",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  cardInfo: {
    flex: 1,
    marginLeft: 15,
  },
  image: {
    width: 80,
    height: 80,
  },
  name: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  type: {
    color: "#aaa",
    fontSize: 14,
    marginTop: 4,
  },
  empty: {
    color: "#666",
    textAlign: "center",
    marginTop: 30,
    fontSize: 16,
  },
});