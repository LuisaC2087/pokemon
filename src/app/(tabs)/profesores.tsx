import { useEffect, useState, useContext, useCallback, useMemo } from "react";
import {
  Image, ScrollView, StyleSheet, Text, View, TextInput,
  TouchableOpacity, ActivityIndicator, Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { AppContext, type SyncInterval } from "../../context/AppContext";

const INTERVALS: { label: string; value: SyncInterval }[] = [
  { label: "2 s", value: 2 },
  { label: "10 s", value: 10 },
  { label: "30 s", value: 30 },
];

export default function Profesores() {
  const router = useRouter();
  const {
    setSelectedProfesor,
    syncInterval,
    setSyncInterval,
    syncState,
    localProfesores,
    triggerSync,
    markAllProfesoresSeen,
  } = useContext(AppContext);

  const [search, setSearch] = useState("");
  const [pulseAnim] = useState(new Animated.Value(1));

  // Pulso animado en el indicador de nuevos
  useEffect(() => {
    if (syncState.newCount > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [syncState.newCount]);

  const filteredProfesores = useMemo(() => {
    if (!search.trim()) return localProfesores;
    const term = search.toLowerCase();
    return localProfesores.filter(
      (p) =>
        p.nombre.toLowerCase().includes(term) ||
        p.departamento.toLowerCase().includes(term)
    );
  }, [search, localProfesores]);

  const handlePress = (prof: any) => {
    setSelectedProfesor(prof);
    router.push("/(tabs)/profesores-details");
  };

  const handleCreate = () => {
    setSelectedProfesor(null);
    router.push("/(tabs)/profesores-form");
  };

  const formatSyncTime = () => {
    if (!syncState.lastSyncAt) return "Nunca";
    const d = syncState.lastSyncAt;
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
  };

  return (
    <LinearGradient colors={["#1a2a6c", "#112240", "#0a192f"]} style={styles.container}>

      {/* ── HEADER ──────────────────────────────── */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>Profesores</Text>
        {syncState.newCount > 0 && (
          <Animated.View style={[styles.newBadgeGlobal, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.newBadgeGlobalText}>+{syncState.newCount} nuevos</Text>
          </Animated.View>
        )}
      </View>

      {/* ── PANEL DE SINCRONIZACIÓN ──────────────── */}
      <BlurView intensity={20} tint="dark" style={styles.syncPanel}>
        <View style={styles.syncRow}>
          <View style={styles.syncInfo}>
            <View style={[styles.syncDot, { backgroundColor: syncState.isSyncing ? "#f9ca24" : syncState.error ? "#ff6b6b" : "#64ffda" }]} />
            <Text style={styles.syncLabel}>
              {syncState.isSyncing
                ? "Sincronizando…"
                : syncState.error
                ? "Error sync"
                : `Sync: ${formatSyncTime()}`}
            </Text>
          </View>
          <TouchableOpacity style={styles.syncBtn} onPress={triggerSync} disabled={syncState.isSyncing}>
            {syncState.isSyncing
              ? <ActivityIndicator size="small" color="#64ffda" />
              : <Text style={styles.syncBtnText}>↻</Text>}
          </TouchableOpacity>
        </View>

        {/* Selector de intervalo */}
        <View style={styles.intervalRow}>
          <Text style={styles.intervalLabel}>Intervalo:</Text>
          {INTERVALS.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[styles.intervalChip, syncInterval === item.value && styles.intervalChipActive]}
              onPress={() => setSyncInterval(item.value)}
            >
              <Text style={[styles.intervalChipText, syncInterval === item.value && styles.intervalChipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info totales */}
        <View style={styles.statsRow}>
          <Text style={styles.statText}>Local: {syncState.totalLocal} registros</Text>
          {syncState.newCount > 0 && (
            <TouchableOpacity onPress={markAllProfesoresSeen}>
              <Text style={styles.markSeenText}>Marcar todos vistos ✓</Text>
            </TouchableOpacity>
          )}
        </View>

        {syncState.error ? <Text style={styles.errorText}>{syncState.error}</Text> : null}
      </BlurView>

      {/* ── BÚSQUEDA ────────────────────────────── */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Buscar profesor por nombre o departamento..."
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity style={styles.clearSearchBtn} onPress={() => setSearch("")}>
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
        <Text style={styles.createButtonText}>+ Agregar Profesor</Text>
      </TouchableOpacity>

      {/* ── LISTA ───────────────────────────────── */}
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {filteredProfesores.map((prof) => (
          <BlurView
            intensity={20}
            tint="dark"
            key={prof.id}
            style={[styles.glassCard, prof.is_new === 1 && styles.glassCardNew]}
          >
            {/* Badge NUEVO */}
            {prof.is_new === 1 && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NUEVO</Text>
              </View>
            )}

            <Image
              source={{
                uri: prof.imagen_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(prof.nombre)}&background=random&color=fff&size=150`,
              }}
              style={styles.image}
            />
            <View style={styles.cardInfo}>
              <Text style={styles.name}>{prof.nombre}</Text>
              <Text style={styles.summary} numberOfLines={1}>{prof.profesion || "Sin profesión"}</Text>
              <Text style={styles.location}>{prof.departamento || "Sin departamento"}</Text>
              {prof.email ? <Text style={styles.email}>{prof.email}</Text> : null}
              <TouchableOpacity style={styles.moreButton} onPress={() => handlePress(prof)}>
                <Text style={styles.moreButtonText}>Ver / Editar</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        ))}

        {filteredProfesores.length === 0 && (
          <BlurView intensity={25} tint="dark" style={styles.alertCard}>
            {search.trim().length > 0 ? (
              <>
                <Text style={styles.alertIcon}>🔍</Text>
                <View style={styles.alertBadge}>
                  <Text style={styles.alertBadgeText}>AVISO: SIN RESULTADOS</Text>
                </View>
                <Text style={styles.alertTitle}>Profesor no encontrado</Text>
                <Text style={styles.alertDesc}>
                  No se encontró ningún profesor en la base de datos que coincida con "{search}".
                </Text>
                <TouchableOpacity style={styles.alertButton} onPress={() => setSearch("")}>
                  <Text style={styles.alertButtonText}>✕ Limpiar búsqueda</Text>
                </TouchableOpacity>
              </>
            ) : syncState.isSyncing && localProfesores.length === 0 ? (
              <>
                <ActivityIndicator size="large" color="#64ffda" style={{ marginBottom: 12 }} />
                <View style={[styles.alertBadge, { backgroundColor: "rgba(100,255,218,0.15)", borderColor: "rgba(100,255,218,0.4)" }]}>
                  <Text style={[styles.alertBadgeText, { color: "#64ffda" }]}>BASE DE DATOS</Text>
                </View>
                <Text style={styles.alertTitle}>Consultando la base de datos...</Text>
                <Text style={styles.alertDesc}>
                  Obteniendo registros y sincronizando con el servidor en la nube.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.alertIcon}>📭</Text>
                <View style={[styles.alertBadge, { backgroundColor: "rgba(255,171,0,0.15)", borderColor: "rgba(255,171,0,0.4)" }]}>
                  <Text style={[styles.alertBadgeText, { color: "#ffab00" }]}>AVISO DE BASE DE DATOS</Text>
                </View>
                <Text style={styles.alertTitle}>Base de datos sin registros</Text>
                <Text style={styles.alertDesc}>
                  No se encontró ningún profesor almacenado en la base de datos actualmente.
                </Text>
                <View style={styles.alertActionsRow}>
                  <TouchableOpacity style={styles.alertButton} onPress={handleCreate}>
                    <Text style={styles.alertButtonText}>+ Agregar Profesor</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.alertSecondaryButton} onPress={triggerSync}>
                    <Text style={styles.alertSecondaryButtonText}>🔄 Sincronizar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </BlurView>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 50 },

  // Header
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 12, gap: 10 },
  header: { color: "#fff", fontSize: 30, fontWeight: "bold", textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  newBadgeGlobal: { backgroundColor: "#ff6b6b", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  newBadgeGlobalText: { color: "#fff", fontWeight: "bold", fontSize: 13 },

  // Sync panel
  syncPanel: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(100,255,218,0.25)",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  syncRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  syncInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  syncDot: { width: 10, height: 10, borderRadius: 5 },
  syncLabel: { color: "#ccd6f6", fontSize: 13 },
  syncBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(100,255,218,0.15)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(100,255,218,0.4)" },
  syncBtnText: { color: "#64ffda", fontSize: 20, fontWeight: "bold" },

  intervalRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  intervalLabel: { color: "#8892b0", fontSize: 12 },
  intervalChip: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  intervalChipActive: { backgroundColor: "rgba(100,255,218,0.2)", borderColor: "#64ffda" },
  intervalChipText: { color: "#8892b0", fontSize: 12, fontWeight: "600" },
  intervalChipTextActive: { color: "#64ffda" },

  statsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statText: { color: "#8892b0", fontSize: 11 },
  markSeenText: { color: "#64ffda", fontSize: 11, fontWeight: "bold" },
  errorText: { color: "#ff6b6b", fontSize: 12, marginTop: 4 },

  // Search
  searchContainer: { marginBottom: 10, position: "relative" },
  input: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12, padding: 12,
    paddingRight: 40,
    fontSize: 15, color: "#fff",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  clearSearchBtn: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  clearSearchText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },

  // Buttons
  createButton: {
    backgroundColor: "rgba(100,255,218,0.1)",
    padding: 12, borderRadius: 12,
    alignItems: "center", marginBottom: 16,
    borderWidth: 1, borderColor: "rgba(100,255,218,0.3)",
  },
  createButtonText: { color: "#64ffda", fontWeight: "bold", fontSize: 15 },

  // Cards
  glassCard: {
    borderRadius: 15, padding: 14, marginBottom: 12,
    flexDirection: "row", alignItems: "center",
    overflow: "hidden", borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  glassCardNew: {
    borderColor: "rgba(100,255,218,0.5)",
    backgroundColor: "rgba(100,255,218,0.06)",
  },

  // NUEVO badge
  newBadge: {
    position: "absolute", top: 10, right: 10,
    backgroundColor: "#ff6b6b",
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
    zIndex: 10,
  },
  newBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold", letterSpacing: 0.5 },

  cardInfo: { flex: 1, marginLeft: 12 },
  image: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: "rgba(255,255,255,0.2)" },
  name: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  summary: { color: "#ccd6f6", fontSize: 13, marginTop: 3 },
  location: { color: "#64ffda", fontSize: 12, marginTop: 2, marginBottom: 2 },
  email: { color: "#8892b0", fontSize: 11, marginBottom: 6 },
  moreButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 5, paddingHorizontal: 10,
    borderRadius: 8, alignSelf: "flex-start",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    marginTop: 4,
  },
  moreButtonText: { color: "#fff", fontSize: 12, fontWeight: "bold" },

  // Empty / Not Found Alert
  alertCard: {
    marginVertical: 20,
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 171, 0, 0.35)",
    backgroundColor: "rgba(17, 34, 64, 0.65)",
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
  alertTitle: { color: "#ffffff", fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 6 },
  alertDesc: { color: "#ccd6f6", fontSize: 13, textAlign: "center", lineHeight: 19, marginBottom: 16 },
  alertActionsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  alertButton: {
    backgroundColor: "rgba(100, 255, 218, 0.15)",
    borderWidth: 1,
    borderColor: "#64ffda",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
  },
  alertButtonText: { color: "#64ffda", fontWeight: "bold", fontSize: 13 },
  alertSecondaryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  alertSecondaryButtonText: { color: "#ccd6f6", fontWeight: "600", fontSize: 13 },
  empty: { color: "#8892b0", textAlign: "center", marginTop: 40, fontSize: 15 },
});
