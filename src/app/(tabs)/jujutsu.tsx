import { useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { AppContext } from "../../context/AppContext";

const BASE_URL = "https://anime-python-ueas.onrender.com";

const GRADES = ["Todos", "Grado Especial", "Grado 1", "Grado 2", "Grado 3", "Grado 4", "Semi-Grado 1"];

export default function Anime() {
  const [characters, setCharacters] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState("Todos");
  const [domainOnly, setDomainOnly] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<string | null>(null);
  const router = useRouter();
  const { setSelectedJujutsu } = useContext(AppContext);

  // GET /health
  useEffect(() => {
    fetch(`${BASE_URL}/health`)
      .then((res) => res.json())
      .then((data) => setServiceStatus(data.status))
      .catch(() => setServiceStatus("error"));
  }, []);

  // GET /characters (initial load)
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = () => {
    setLoading(true);
    setError("");
    fetch(`${BASE_URL}/characters`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCharacters(data);
        else setError("Error en respuesta");
      })
      .catch(() => setError("Error cargando personajes"))
      .finally(() => setLoading(false));
  };

  // GET /characters/search/{name}
  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    setSelectedGrade("Todos");
    setDomainOnly(false);
    if (text.length === 0) {
      loadAll();
      return;
    }
    if (text.length >= 2) {
      setLoading(true);
      fetch(`${BASE_URL}/characters/search/${text}`)
        .then((res) => res.json())
        .then((data) => { if (Array.isArray(data)) setCharacters(data); else setCharacters([]); })
        .catch(() => setCharacters([]))
        .finally(() => setLoading(false));
    }
  }, []);

  // GET /characters/grade/{grade}
  const handleGradeFilter = useCallback((grade: string) => {
    setSelectedGrade(grade);
    setSearch("");
    setDomainOnly(false);
    setLoading(true);
    if (grade === "Todos") {
      loadAll();
    } else {
      fetch(`${BASE_URL}/characters/grade/${grade}`)
        .then((res) => res.json())
        .then((data) => { if (Array.isArray(data)) setCharacters(data); else setCharacters([]); })
        .catch(() => setCharacters([]))
        .finally(() => setLoading(false));
    }
  }, []);

  // GET /characters/with-domain
  const handleDomainFilter = useCallback(() => {
    const newValue = !domainOnly;
    setDomainOnly(newValue);
    setSearch("");
    setSelectedGrade("Todos");
    setLoading(true);
    if (newValue) {
      fetch(`${BASE_URL}/characters/with-domain`)
        .then((res) => res.json())
        .then((data) => { if (Array.isArray(data)) setCharacters(data); else setCharacters([]); })
        .catch(() => setCharacters([]))
        .finally(() => setLoading(false));
    } else {
      loadAll();
    }
  }, [domainOnly]);

  const handlePress = (char: any) => {
    setSelectedJujutsu(char);
    router.push("/(tabs)/jujutsu-details");
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Jujutsu Kaisen</Text>
        <View style={[styles.statusDot, { backgroundColor: serviceStatus === "ok" ? "#4CAF50" : "#F44336" }]} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Buscar personaje..."
        placeholderTextColor="#888"
        value={search}
        onChangeText={handleSearch}
      />

      <TouchableOpacity
        style={[styles.domainBtn, domainOnly && styles.domainBtnActive]}
        onPress={handleDomainFilter}
      >
        <Text style={[styles.domainText, domainOnly && styles.domainTextActive]}>
          Con Expansión de Dominio
        </Text>
      </TouchableOpacity>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {GRADES.map((grade) => (
          <TouchableOpacity
            key={grade}
            style={[styles.filterChip, selectedGrade === grade && styles.filterChipActive]}
            onPress={() => handleGradeFilter(grade)}
          >
            <Text style={[styles.filterText, selectedGrade === grade && styles.filterTextActive]}>
              {grade}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error !== "" && <Text style={styles.error}>{error}</Text>}
      {loading && <ActivityIndicator color="#fff" size="large" style={{ marginVertical: 20 }} />}

      <ScrollView>
        {characters.map((char: any, idx: number) => (
          <TouchableOpacity key={idx} style={styles.card} onPress={() => handlePress(char)}>
            <Image source={{ uri: char.image_url }} style={styles.image} />
            <View style={styles.cardInfo}>
              <Text style={styles.name}>{char.name}</Text>
              <Text style={styles.grade}>{char.grade}</Text>
              {char.domain_expansion !== "Ninguno" && (
                <Text style={styles.domain}>⚡ {char.domain_expansion}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
        {!loading && characters.length === 0 && (
          <Text style={styles.empty}>No se encontraron personajes</Text>
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
  domainBtn: {
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  domainBtnActive: {
    backgroundColor: "#9C27B0",
  },
  domainText: {
    color: "#aaa",
    fontSize: 14,
    fontWeight: "bold",
  },
  domainTextActive: {
    color: "#fff",
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
    backgroundColor: "#9C27B0",
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
    resizeMode: "contain",
  },
  name: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  grade: {
    color: "#aaa",
    fontSize: 14,
    marginTop: 4,
  },
  domain: {
    color: "#CE93D8",
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
  empty: {
    color: "#666",
    textAlign: "center",
    marginTop: 30,
    fontSize: 16,
  },
});