import { useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
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

  useEffect(() => {
    fetch(`${BASE_URL}/health`)
      .then((res) => res.json())
      .then((data) => setServiceStatus(data.status))
      .catch(() => setServiceStatus("error"));
  }, []);

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
    <LinearGradient colors={['#4a148c', '#311b92', '#1a0033']} style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Jujutsu Kaisen</Text>
        <View style={[styles.statusDot, { backgroundColor: serviceStatus === "ok" ? "#4CAF50" : "#F44336" }]} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Buscar personaje..."
        placeholderTextColor="#aaa"
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

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ alignItems: 'center' }}>
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
      </View>

      {error !== "" && <Text style={styles.error}>{error}</Text>}
      {loading && <ActivityIndicator color="#e040fb" size="large" style={{ marginVertical: 20 }} />}

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {characters.map((char: any, idx: number) => (
          <TouchableOpacity key={idx} onPress={() => handlePress(char)}>
            <BlurView intensity={20} tint="dark" style={styles.glassCard}>
              <Image source={{ uri: char.image_url }} style={styles.image} />
              <View style={styles.cardInfo}>
                <Text style={styles.name}>{char.name}</Text>
                <Text style={styles.grade}>{char.grade}</Text>
                {char.domain_expansion !== "Ninguno" && (
                  <Text style={styles.domain}>⚡ {char.domain_expansion}</Text>
                )}
              </View>
            </BlurView>
          </TouchableOpacity>
        ))}
        {!loading && characters.length === 0 && (
          <Text style={styles.empty}>No se encontraron personajes</Text>
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
  domainBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  domainBtnActive: {
    backgroundColor: "rgba(156, 39, 176, 0.8)",
    borderColor: "#9C27B0",
  },
  domainText: { color: "#ccc", fontSize: 14, fontWeight: "bold" },
  domainTextActive: { color: "#fff", textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 },
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
    backgroundColor: "rgba(156, 39, 176, 0.8)",
    borderColor: "#9C27B0",
  },
  filterText: { color: "#ccc", fontSize: 14, fontWeight: "bold" },
  filterTextActive: { color: "#fff", textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 },
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
  grade: { color: "#e040fb", fontSize: 14, marginTop: 4, fontWeight: "600" },
  domain: { color: "#fff", fontSize: 12, marginTop: 4, fontStyle: "italic", textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 },
  empty: { color: "#e040fb", textAlign: "center", marginTop: 30, fontSize: 16 },
});