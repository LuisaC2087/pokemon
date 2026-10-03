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
  const router = useRouter();
  const { setSelectedProfesor } = useContext(AppContext);

  const executeSearch = useCallback(() => {
    if (search.trim().length === 0) {
      setProfesores([]);
      return;
    }
    
    setLoading(true);
    fetch(`${BASE_URL}/search/${encodeURIComponent(search.trim())}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setProfesores(data);
        else setError("Error en respuesta");
      })
      .catch(() => setError("Error buscando"))
      .finally(() => setLoading(false));
  }, [search]);

  // Remover carga inicial
  useEffect(() => {
    // Ya no cargamos la lista completa porque el backend ahora solo tiene la API de búsqueda
  }, []);

  const handlePress = (prof: any) => {
    setSelectedProfesor(prof);
    router.push("/(tabs)/profesores-details");
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Profesores</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Buscar Profesor..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={executeSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={executeSearch}>
          <Text style={styles.searchButtonText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {error !== "" && <Text style={styles.error}>{error}</Text>}
      {loading && <ActivityIndicator color="#fff" size="large" style={{ marginVertical: 20 }} />}

      <ScrollView>
        {profesores.map((prof: any) => (
          <View key={prof._id || prof.nombre} style={styles.card}>
            <View style={styles.cardInfo}>
              <Text style={styles.name}>{prof.nombre}</Text>
              <Text style={styles.summary} numberOfLines={2}>{prof.profesion}</Text>
              <Text style={styles.location}>{prof.ubicacion}</Text>
              <TouchableOpacity style={styles.moreButton} onPress={() => handlePress(prof)}>
                <Text style={styles.moreButtonText}>Mostrar más</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  searchContainer: {
    flexDirection: "row",
    marginBottom: 15,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: "#2E7D32",
    justifyContent: "center",
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  searchButtonText: {
    color: "#fff",
    fontWeight: "bold",
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
  name: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  location: {
    color: "#4CAF50",
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
  },
  summary: {
    color: "#aaa",
    fontSize: 14,
    marginTop: 4,
    marginBottom: 10,
  },
  moreButton: {
    backgroundColor: "#444",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  moreButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  empty: {
    color: "#666",
    textAlign: "center",
    marginTop: 30,
    fontSize: 16,
  },
});
