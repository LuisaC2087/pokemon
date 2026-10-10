import { useState, useContext, useCallback, useEffect } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import { AppContext } from "../../context/AppContext";
import {
  consultarProfesores,
  sincronizarPendientes,
  suscribirSincronizacionAutomatica,
  hayConexion,
} from "../../services/sincronizacion";
import { contarPendientes } from "../../database/sqlite";

export default function Profesores() {
  const [profesores, setProfesores] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pendientesCount, setPendientesCount] = useState(0);
  const [infoMensaje, setInfoMensaje] = useState("");

  const router = useRouter();
  const { setSelectedProfesor } = useContext(AppContext);

  const actualizarEstadoConexion = useCallback(async () => {
    const conectado = await hayConexion();
    setIsOnline(conectado);
    const pendientes = await contarPendientes();
    setPendientesCount(pendientes);
    return conectado;
  }, []);

  const fetchProfesores = useCallback(
    async (searchTerm = "", isPullRefresh = false) => {
      if (!isPullRefresh) {
        setLoading(true);
      }
      setError("");

      try {
        const resultado = await consultarProfesores(searchTerm);
        setProfesores(resultado.profesores);
        setIsOnline(resultado.isOnline);

        const pendientes = await contarPendientes();
        setPendientesCount(pendientes);

        if (resultado.sincronizados > 0) {
          setInfoMensaje(
            `Se sincronizaron ${resultado.sincronizados} cambios con el microservicio.`
          );
          setTimeout(() => setInfoMensaje(""), 4000);
        }
      } catch (err) {
        console.error("Error al cargar profesores:", err);
        setError("Error al cargar profesores. Se muestran los datos locales.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // Escuchar cuando la pantalla gana foco
  useFocusEffect(
    useCallback(() => {
      actualizarEstadoConexion();
      fetchProfesores(search);
    }, [actualizarEstadoConexion, fetchProfesores, search])
  );

  // Suscribirse a cambios en la conectividad para sincronizar en tiempo real cuando vuelva internet
  useEffect(() => {
    const unsubscribe = suscribirSincronizacionAutomatica(async (resultado) => {
      if (resultado.totalSincronizados > 0) {
        setInfoMensaje(
          `¡Internet restablecido! Sincronizados ${resultado.totalSincronizados} cambios automáticamente.`
        );
        setTimeout(() => setInfoMensaje(""), 5000);
        actualizarEstadoConexion();
        fetchProfesores(search);
      }
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [actualizarEstadoConexion, fetchProfesores, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await actualizarEstadoConexion();
    await fetchProfesores(search, true);
  };

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

  const handleSyncManual = async () => {
    const online = await hayConexion();
    if (!online) {
      Alert.alert(
        "Sin conexión",
        "No hay conexión a internet disponible para sincronizar con el microservicio en este momento."
      );
      return;
    }

    setSyncing(true);
    try {
      const res = await sincronizarPendientes();
      await fetchProfesores(search);
      const pendientes = await contarPendientes();
      setPendientesCount(pendientes);

      if (res.totalSincronizados > 0) {
        Alert.alert(
          "Sincronización exitosa",
          `Se sincronizaron ${res.totalSincronizados} operaciones pendientes con el microservicio.`
        );
      } else {
        Alert.alert(
          "Al día",
          "Todos los registros ya se encuentran sincronizados con el microservicio."
        );
      }
    } catch (err: any) {
      Alert.alert(
        "Error de sincronización",
        err?.message || "No se pudo sincronizar en este momento."
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <LinearGradient
      colors={["#1a2a6c", "#112240", "#0a192f"]}
      style={styles.container}
    >
      <View style={styles.headerRow}>
        <Text style={styles.header}>Profesores</Text>
      </View>

      {/* Barra de estado de conexión y sincronización */}
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusBadge,
            isOnline ? styles.onlineBadge : styles.offlineBadge,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              isOnline ? styles.onlineDot : styles.offlineDot,
            ]}
          />
          <Text style={styles.statusText}>
            {isOnline
              ? "En línea (Microservicio)"
              : "Sin conexión (SQLite local)"}
          </Text>
        </View>

        {pendientesCount > 0 && (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSyncManual}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#64ffda" />
            ) : (
              <Text style={styles.syncButtonText}>
                🔄 Sincronizar ({pendientesCount})
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {infoMensaje !== "" && (
        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>{infoMensaje}</Text>
        </View>
      )}

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

        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
        <Text style={styles.createButtonText}>+ Agregar Profesor</Text>
      </TouchableOpacity>

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      {loading && !refreshing && (
        <ActivityIndicator
          color="#64ffda"
          size="large"
          style={{ marginVertical: 20 }}
        />
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#64ffda"
            colors={["#64ffda"]}
          />
        }
      >
        {profesores.map((prof: any) => {
          const estaSincronizado =
            prof.sincronizado === undefined || Number(prof.sincronizado) === 1;

          return (
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
                <View style={styles.cardHeader}>
                  <Text style={styles.name} numberOfLines={1}>
                    {prof.nombre}
                  </Text>
                  <View
                    style={[
                      styles.cardSyncBadge,
                      estaSincronizado
                        ? styles.cardSyncOk
                        : styles.cardSyncPending,
                    ]}
                  >
                    <Text style={styles.cardSyncText}>
                      {estaSincronizado ? "☁️ Sincronizado" : "⏳ Pendiente"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.dept}>
                  {prof.departamento || "Sin departamento"}
                </Text>

                <Text style={styles.summary} numberOfLines={1}>
                  {prof.profesion || "Sin profesión"}
                </Text>

                <Text style={styles.location}>
                  {prof.ubicacion || "Sin ubicación"}
                </Text>

                <TouchableOpacity
                  style={styles.moreButton}
                  onPress={() => handlePress(prof)}
                >
                  <Text style={styles.moreButtonText}>Ver / Editar</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          );
        })}

        {!loading && profesores.length === 0 && (
          <Text style={styles.empty}>No se encontraron profesores</Text>
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
    marginBottom: 10,
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
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
    gap: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  onlineBadge: {
    backgroundColor: "rgba(46, 204, 113, 0.15)",
    borderColor: "rgba(46, 204, 113, 0.4)",
  },
  offlineBadge: {
    backgroundColor: "rgba(243, 156, 18, 0.15)",
    borderColor: "rgba(243, 156, 18, 0.4)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  onlineDot: {
    backgroundColor: "#2ecc71",
  },
  offlineDot: {
    backgroundColor: "#f39c12",
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  syncButton: {
    backgroundColor: "rgba(100,255,218,0.2)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#64ffda",
  },
  syncButtonText: {
    color: "#64ffda",
    fontSize: 12,
    fontWeight: "bold",
  },
  infoBanner: {
    backgroundColor: "rgba(100, 255, 218, 0.15)",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(100, 255, 218, 0.3)",
  },
  infoText: {
    color: "#64ffda",
    fontSize: 13,
    textAlign: "center",
    fontWeight: "600",
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
    marginBottom: 15,
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardSyncBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  cardSyncOk: {
    backgroundColor: "rgba(46, 204, 113, 0.2)",
  },
  cardSyncPending: {
    backgroundColor: "rgba(243, 156, 18, 0.25)",
  },
  cardSyncText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
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
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  dept: {
    color: "#64ffda",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  location: {
    color: "#8892b0",
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
  },
  summary: {
    color: "#ccd6f6",
    fontSize: 13,
    marginTop: 2,
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
