
import { useState, useContext, useCallback } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import NetInfo from "@react-native-community/netinfo";

import { AppContext } from "../../context/AppContext";
import {
  initDatabase,
  listarProfesores,
  guardarProfesorRemoto,
} from "../../database/sqlite";

const BASE_URL = "https://profesores-node-ueas.onrender.com";

export default function Profesores() {
  const [profesores, setProfesores] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { setSelectedProfesor } = useContext(AppContext);

  const fetchProfesores = useCallback(async (searchTerm = "") => {
    setLoading(true);
    setError("");

    try {
      await initDatabase();

      // Mostrar primero los datos guardados en SQLite.
      const locales = await listarProfesores();
      const termino = searchTerm.trim().toLowerCase();

      const filtrar = (lista: any[]) =>
        termino
          ? lista.filter((p) =>
              p.nombre?.toLowerCase().includes(termino)
            )
          : lista;

      setProfesores(filtrar(locales));

      // Comprobar si hay conexión.
      const network = await NetInfo.fetch();

      if (
        !network.isConnected ||
        network.isInternetReachable === false
      ) {
        return;
      }

      // Consultar la API.
      const url = termino
        ? `${BASE_URL}/search/${encodeURIComponent(searchTerm.trim())}`
        : `${BASE_URL}/profesores`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("La API no devolvió una lista válida.");
      }

      // Guardar los profesores recibidos en SQLite.
      for (const profesor of data) {
        await guardarProfesorRemoto(profesor);
      }

      // Actualizar la lista desde SQLite.
      const actualizados = await listarProfesores();
      setProfesores(filtrar(actualizados));
    } catch (err) {
      console.error("Error cargando profesores:", err);
      setError(
        "No se pudo actualizar desde internet. Se muestran los datos locales."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar los profesores al abrir o regresar a esta pantalla.
  useFocusEffect(
    useCallback(() => {
      fetchProfesores(search);
    }, [fetchProfesores])
  );

  const handleSearch = () => {
    fetchProfesores(search);
  };

  const handlePress = (prof: any) => {
    setSelectedProfesor(prof);
    router.push("/(tabs)/profesores-details");
  };

  const handleCreate = () => {
    setSelectedProfesor(null);
    router.push("/(tabs)/profesores-form");
  };

  return (
    <LinearGradient
      colors={["#1a2a6c", "#112240", "#0a192f"]}
      style={styles.container}
    >
      <View style={styles.headerRow}>
        <Text style={styles.header}>Profesores</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Buscar Profesor..."
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />

        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
        >
          <Text style={styles.searchButtonText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.createButton}
        onPress={handleCreate}
      >
        <Text style={styles.createButtonText}>
          + Agregar Profesor
        </Text>
      </TouchableOpacity>

      {error !== "" && (
        <Text style={styles.error}>{error}</Text>
      )}

      {loading && (
        <ActivityIndicator
          color="#64ffda"
          size="large"
          style={{ marginVertical: 20 }}
        />
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {profesores.map((prof: any) => (
          <BlurView
            intensity={20}
            tint="dark"
            key={prof.id || prof.nombre}
            style={styles.glassCard}
          >
            <Image
              source={{
                uri:
                  prof.image_url ||
                  prof.imagen_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    prof.nombre || "Profesor"
                  )}&background=random&color=fff&size=150`,
              }}
              style={styles.image}
            />

            <View style={styles.cardInfo}>
              <Text style={styles.name}>{prof.nombre}</Text>

              <Text style={styles.summary} numberOfLines={2}>
                {prof.profesion || "Sin profesión"}
              </Text>

              <Text style={styles.location}>
                {prof.ubicacion || "Sin ubicación"}
              </Text>

              <TouchableOpacity
                style={styles.moreButton}
                onPress={() => handlePress(prof)}
              >
                <Text style={styles.moreButtonText}>
                  Ver / Editar
                </Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        ))}

        {!loading && profesores.length === 0 && (
          <Text style={styles.empty}>
            No se encontraron profesores
          </Text>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  header: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  searchContainer: {
    flexDirection: "row",
    marginBottom: 15,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  searchButton: {
    backgroundColor: "rgba(100,255,218,0.2)",
    justifyContent: "center",
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(100,255,218,0.5)",
  },
  searchButtonText: {
    color: "#64ffda",
    fontWeight: "bold",
  },
  createButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  error: {
    color: "#ff6b6b",
    textAlign: "center",
    marginBottom: 10,
  },
  glassCard: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  cardInfo: {
    flex: 1,
    marginLeft: 15,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  name: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  location: {
    color: "#64ffda",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  summary: {
    color: "#ccd6f6",
    fontSize: 14,
    marginTop: 4,
    marginBottom: 10,
  },
  moreButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  moreButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  empty: {
    color: "#8892b0",
    textAlign: "center",
    marginTop: 30,
    fontSize: 16,
  },
});
