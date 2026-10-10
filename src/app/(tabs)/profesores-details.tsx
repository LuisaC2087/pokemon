
import { useContext, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { AppContext } from "../../context/AppContext";
import { eliminarProfesorService } from "../../services/sincronizacion";
import { notificar, confirmar } from "../../utils/alert";

export default function ProfesoresDetails() {
  const { selectedProfesor: p, setSelectedProfesor } =
    useContext(AppContext);

  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  if (!p) {
    return (
      <LinearGradient
        colors={["#1a2a6c", "#112240", "#0a192f"]}
        style={styles.center}
      >
        <Text style={styles.errorText}>
          No se ha seleccionado ningún profesor.
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/(tabs)/profesores")}
        >
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  const handleDelete = () => {
    confirmar(
      "Confirmar eliminación",
      "¿Estás seguro de que deseas eliminar este profesor?",
      async () => {
        setDeleting(true);

        try {
          const id = p.id || p._id;

          if (!id) {
            throw new Error("El profesor no tiene un ID válido.");
          }

          const res = await eliminarProfesorService(String(id));

          setSelectedProfesor(null);

          notificar(
            res.isOnline ? "Profesor eliminado" : "Eliminado localmente (Offline)",
            res.isOnline && res.sincronizado
              ? "El profesor fue eliminado exitosamente del microservicio y de la base local."
              : "Sin conexión. El profesor se eliminó localmente y se eliminará del servidor cuando vuelva el internet.",
            () => {
              router.replace("/(tabs)/profesores");
            }
          );
        } catch (err: any) {
          notificar("Error", err?.message || "No se pudo eliminar el profesor.");
        } finally {
          setDeleting(false);
        }
      }
    );
  };

  const handleEdit = () => {
    router.push("/(tabs)/profesores-form");
  };

  const mostrarValor = (value: any): string => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    if (Array.isArray(value)) {
      return value.length ? value.join(", ") : "—";
    }

    if (typeof value === "object") {
      return Object.values(value).filter(Boolean).join(", ") || "—";
    }

    return String(value);
  };

  const Section = ({ title }: { title: string }) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  const Row = ({
    label,
    value,
  }: {
    label: string;
    value: any;
  }) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{mostrarValor(value)}</Text>
    </View>
  );

  const Badges = ({ items }: { items?: any }) => {
    const lista = Array.isArray(items)
      ? items
      : items
        ? [items]
        : [];

    if (lista.length === 0) {
      return <Text style={styles.noData}>Sin información registrada</Text>;
    }

    return (
      <View style={styles.badgesContainer}>
        {lista.map((item, index) => (
          <View key={`${String(item)}-${index}`} style={styles.badge}>
            <Text style={styles.badgeText}>{String(item)}</Text>
          </View>
        ))}
      </View>
    );
  };

  const nombre = p.nombre || "Profesor";
  const imagen =
    p.image_url ||
    p.imagen_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      nombre
    )}&background=random&color=fff&size=200`;

  return (
    <LinearGradient
      colors={["#1a2a6c", "#112240", "#0a192f"]}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <BlurView intensity={30} tint="dark" style={styles.headerGlass}>
          <Image source={{ uri: imagen }} style={styles.image} />

          <Text style={styles.name}>{nombre}</Text>

          <Text style={styles.profesion}>
            {p.profesion || "Profesión no registrada"}
          </Text>

          <Text style={styles.ubicacion}>
            📍 {p.ubicacion || "Ubicación no registrada"}
          </Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEdit}
              disabled={deleting}
            >
              <Text style={styles.actionText}>✏️ Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionText}>🗑️ Eliminar</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => router.replace("/(tabs)/profesores")}
          >
            <Text style={styles.backLink}>← Volver a la lista</Text>
          </TouchableOpacity>
        </BlurView>

        <BlurView intensity={20} tint="dark" style={styles.glassCard}>
          <Section title="Formación académica" />
          <Row label="Pregrado" value={p.formacion?.pregrado} />
          <Row
            label="Universidad (pregrado)"
            value={p.formacion?.universidad_pregrado}
          />
          <Row label="Maestría" value={p.formacion?.maestria} />
          <Row
            label="Universidad (maestría)"
            value={p.formacion?.universidad_maestria}
          />
        </BlurView>

        <BlurView intensity={20} tint="dark" style={styles.glassCard}>
          <Section title="Cargos" />
          <Badges items={p.cargos} />
        </BlurView>

        <BlurView intensity={20} tint="dark" style={styles.glassCard}>
          <Section title="Experiencia" />
          <Row
            label="SENA"
            value={
              Array.isArray(p.experiencia)
                ? p.experiencia[0]?.sena ?? "—"
                : p.experiencia?.sena
            }
          />
          <Row
            label="Docencia universitaria"
            value={
              Array.isArray(p.experiencia)
                ? p.experiencia[0]?.docencia_universitaria ?? "—"
                : p.experiencia?.docencia_universitaria
            }
          />
        </BlurView>

        <BlurView intensity={20} tint="dark" style={styles.glassCard}>
          <Section title="Lenguajes de programación" />
          <Badges items={p.lenguajes_programacion} />

          <Section title="Bases de datos SQL" />
          <Badges items={p.bases_de_datos?.sql} />

          <Section title="Bases de datos NoSQL" />
          <Badges items={p.bases_de_datos?.nosql} />
        </BlurView>

        <BlurView intensity={20} tint="dark" style={styles.glassCard}>
          <Section title="Sistemas operativos" />
          <Badges items={p.sistemas_operativos} />

          <Section title="Otras áreas" />
          <Badges items={p.otras_areas} />

          <Section title="Aptitudes principales" />
          <Badges items={p.aptitudes_principales} />
        </BlurView>

        <BlurView intensity={20} tint="dark" style={styles.glassCard}>
          <Section title="Contacto" />
          <Row label="Teléfono / contactos" value={p.contactos} />
          <Row label="LinkedIn" value={p.linkedin} />
        </BlurView>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/(tabs)/profesores")}
        >
          <Text style={styles.backText}>Volver a la lista</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  headerGlass: {
    alignItems: "center",
    padding: 30,
    paddingTop: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(0,0,0,0.3)",
    overflow: "hidden",
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: "#64ffda",
  },
  name: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  profesion: {
    fontSize: 14,
    color: "#ccd6f6",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  ubicacion: {
    fontSize: 13,
    color: "#64ffda",
    marginTop: 6,
  },
  actionButtons: {
    flexDirection: "row",
    marginTop: 15,
    gap: 15,
  },
  editButton: {
    backgroundColor: "rgba(2,119,189,0.8)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#0277bd",
  },
  deleteButton: {
    backgroundColor: "rgba(211,47,47,0.8)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d32f2f",
    justifyContent: "center",
  },
  actionText: {
    color: "#fff",
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  backLink: {
    color: "#64ffda",
    marginTop: 20,
    fontSize: 14,
    fontWeight: "bold",
  },
  glassCard: {
    margin: 15,
    marginBottom: 5,
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(0,0,0,0.2)",
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#64ffda",
    marginBottom: 10,
    marginTop: 5,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(100,255,218,0.3)",
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  label: {
    color: "#ccd6f6",
    fontSize: 13,
    flex: 1,
    fontWeight: "600",
  },
  value: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
    flex: 2,
    textAlign: "right",
  },
  badgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  noData: {
    color: "#8892b0",
    fontSize: 13,
    marginBottom: 10,
  },
  backButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    margin: 15,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  backText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
