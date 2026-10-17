import { useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useState, useRef } from "react";
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
  const allCharactersRef = useRef<any[]>([]);

  useEffect(() => {
    fetch(`${BASE_URL}/health`)
      .then((res) => res.json())
      .then((data) => setServiceStatus(data.status))
      .catch(() => setServiceStatus("error"));

    loadAll();
  }, []);

  const loadAll = () => {
    setLoading(true);
    setError("");
    fetch(`${BASE_URL}/characters`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCharacters(data);
          allCharactersRef.current = data;
        } else {
          setError("Error en respuesta");
        }
      })
      .catch(() => setError("Error cargando personajes"))
      .finally(() => setLoading(false));
  };

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    setSelectedGrade("Todos");
    setDomainOnly(false);
    if (text.length === 0) {
      setCharacters(allCharactersRef.current);
      return;
    }
    if (text.length >= 2) {
      setLoading(true);
      fetch(`${BASE_URL}/characters/search/${text}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setCharacters(data);
          else setCharacters([]);
        })
        .catch(() => {
          // Fallback en memoria si falla la red
          const localFiltered = allCharactersRef.current.filter((c) =>
            c.name?.toLowerCase().includes(text.toLowerCase())
          );
          setCharacters(localFiltered);
        })
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

  const handlePress = (char: any) => {
    setSelectedJujutsu(char);
    router.push("/(tabs)/jujutsu-details");
  };

  return (
    <LinearGradient colors={['#0c101d', '#131b2e', '#090d16']} style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Jujutsu Kaisen</Text>
        <View style={[styles.statusDot, { backgroundColor: serviceStatus === "ok" ? "#10b981" : "#ef4444" }]} />
      </View>

      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Buscar personaje por nombre..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={handleSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity
            style={styles.clearSearchBtn}
            onPress={() => handleSearch("")}
          >
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

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
      {loading && <ActivityIndicator color="#818cf8" size="large" style={{ marginVertical: 20 }} />}

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {characters.map((char: any, idx: number) => (
          <TouchableOpacity key={idx} onPress={() => handlePress(char)}>
            <BlurView intensity={25} tint="dark" style={styles.glassCard}>
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
          <BlurView intensity={25} tint="dark" style={styles.alertCard}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>AVISO DE BASE DE DATOS</Text>
            </View>
            <Text style={styles.alertTitle}>Personaje no encontrado</Text>
            <Text style={styles.alertDesc}>
              No se encontró ningún hechicero en la base de datos que coincida con{" "}
              {search.trim().length > 0 ? `"${search}"` : `el filtro de grado "${selectedGrade}"`}.
            </Text>
            <TouchableOpacity
              style={styles.alertButton}
              onPress={() => {
                setSearch("");
                setSelectedGrade("Todos");
                setDomainOnly(false);
                loadAll();
              }}
            >
              <Text style={styles.alertButtonText}>🔄 Restablecer filtros</Text>
            </TouchableOpacity>
          </BlurView>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 20, gap: 10 },
  header: { color: "#f8fafc", fontSize: 32, fontWeight: "bold", textAlign: "center", textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 },
  statusDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  searchWrapper: { position: "relative", marginBottom: 10 },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: 12,
    paddingRight: 40,
    fontSize: 16,
    color: "#f8fafc",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  clearSearchBtn: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  clearSearchText: {
    color: "#e0e7ff",
    fontSize: 12,
    fontWeight: "bold",
  },
  domainBtn: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  domainBtnActive: {
    backgroundColor: "rgba(99, 102, 241, 0.28)",
    borderColor: "#6366f1",
  },
  domainText: { color: "#94a3b8", fontSize: 14, fontWeight: "bold" },
  domainTextActive: { color: "#e0e7ff", textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 },
  filterContainer: {
    height: 55,
    marginBottom: 10,
  },
  filterRow: {
    flex: 1,
  },
  filterChip: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  filterChipActive: {
    backgroundColor: "rgba(99, 102, 241, 0.28)",
    borderColor: "#6366f1",
  },
  filterText: { color: "#94a3b8", fontSize: 14, fontWeight: "bold" },
  filterTextActive: { color: "#e0e7ff", textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 },
  error: { color: "#f87171", textAlign: "center", marginBottom: 10 },
  glassCard: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: "rgba(129, 140, 248, 0.18)",
    backgroundColor: "rgba(15, 23, 42, 0.65)",
  },
  cardInfo: { flex: 1, marginLeft: 15 },
  image: { width: 80, height: 80, resizeMode: "contain" },
  name: { color: "#f8fafc", fontSize: 20, fontWeight: "bold" },
  grade: { color: "#a5b4fc", fontSize: 14, marginTop: 4, fontWeight: "600" },
  domain: { color: "#cbd5e1", fontSize: 12, marginTop: 4, fontStyle: "italic", textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 },

  // Alerta cuando no se encuentra en la base de datos
  alertCard: {
    marginVertical: 20,
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 171, 0, 0.35)",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    overflow: "hidden",
  },
  alertIcon: { fontSize: 40, marginBottom: 10 },
  alertBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    backgroundColor: "rgba(255, 171, 0, 0.15)",
    borderColor: "rgba(255, 171, 0, 0.4)",
  },
  alertBadgeText: { color: "#ffab00", fontSize: 11, fontWeight: "bold", letterSpacing: 0.8 },
  alertTitle: { color: "#f8fafc", fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 6 },
  alertDesc: { color: "#cbd5e1", fontSize: 13, textAlign: "center", lineHeight: 19, marginBottom: 16 },
  alertButton: {
    backgroundColor: "rgba(99, 102, 241, 0.25)",
    borderWidth: 1,
    borderColor: "#818cf8",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
  },
  alertButtonText: { color: "#c7d2fe", fontWeight: "bold", fontSize: 13 },
  empty: { color: "#94a3b8", textAlign: "center", marginTop: 30, fontSize: 16 },
});