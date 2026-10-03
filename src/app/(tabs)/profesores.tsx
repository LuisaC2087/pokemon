import { useEffect, useState, useContext, useCallback } from "react";
import { Image, ScrollView, StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { AppContext } from "../../context/AppContext";

const BASE_URL = "https://profesores-node-ueas.onrender.com";

export default function Profesores() {
  const [profesores, setProfesores] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<string | null>(null);
  const router = useRouter();
  const { setSelectedProfesor } = useContext(AppContext);

  useEffect(() => {
    fetch(`${BASE_URL}/health`)
      .then((res) => res.json())
      .then((data) => setServiceStatus(data.status))
      .catch(() => setServiceStatus("error"));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE_URL}/profesores`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setProfesores(data);
        else setError("Error en respuesta");
      })
      .catch(() => setError("Error cargando profesores"))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    if (text.length === 0) {
      setLoading(true);
      fetch(`${BASE_URL}/profesores`)
        .then((res) => res.json())
        .then((data) => { if (Array.isArray(data)) setProfesores(data); })
        .catch(() => setError("Error buscando"))
        .finally(() => setLoading(false));
      return;
    }
    if (text.length >= 2) {
      setLoading(true);
      fetch(`${BASE_URL}/profesores/search/${encodeURIComponent(text)}`)
        .then((res) => res.json())
        .then((data) => { if (Array.isArray(data)) setProfesores(data); })
        .catch(() => setError("Error buscando"))
        .finally(() => setLoading(false));
    }
  }, []);

  const handlePress = (prof: any) => {
    setSelectedProfesor(prof);
    router.push("/(tabs)/profesores-details");
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Profesores</Text>
        <View style={[styles.statusDot, { backgroundColor: serviceStatus === "ok" ? "#4CAF50" : "#F44336" }]} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Buscar Profesor..."
        placeholderTextColor="#888"
        value={search}
        onChangeText={handleSearch}
      />

      {error !== "" && <Text style={styles.error}>{error}</Text>}
      {loading && <ActivityIndicator color="#fff" size="large" style={{ marginVertical: 20 }} />}

      <ScrollView>
        {profesores.map((prof: any) => (
          <TouchableOpacity key={prof._id || prof.id} style={styles.card} onPress={() => handlePress(prof)}>
            <Image source={{ uri: prof.image_url || 'https://via.placeholder.com/150' }} style={styles.image} />
            <View style={styles.cardInfo}>
              <Text style={styles.name}>{prof.name}</Text>
              <Text style={styles.type}>{prof.subject || 'Materia desconocida'}</Text>
            </View>
          </TouchableOpacity>
        ))}
        {!loading && profesores.length === 0 && (
          <Text style={styles.empty}>No se encontraron Profesores</Text>
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
    marginBottom: 15,
    fontSize: 16,
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
    borderRadius: 40,
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
