import { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import { AppContext } from "../../context/AppContext";
import {
  crearProfesorService,
  actualizarProfesorService,
} from "../../services/sincronizacion";
import { notificar } from "../../utils/alert";

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
}: InputFieldProps) {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#aaa"
        autoCapitalize="sentences"
      />
    </View>
  );
}

export default function ProfesoresForm() {
  const router = useRouter();
  const { selectedProfesor, setSelectedProfesor } = useContext(AppContext);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const isEditing = !!(selectedProfesor?.id || selectedProfesor?._id);

  const [formData, setFormData] = useState({
    nombre: "",
    departamento: "",
    profesion: "",
    ubicacion: "",
    imagen_url: "",
    linkedin: "",
    contactos: "",
    pregrado: "",
    universidad_pregrado: "",
    maestria: "",
    universidad_maestria: "",
    exp_sena: "",
    exp_docencia: "",
    cargos: "",
    lenguajes: "",
    bd_sql: "",
    bd_nosql: "",
  });

  useEffect(() => {
    if (!selectedProfesor) return;

    setFormData({
      nombre: selectedProfesor.nombre || "",
      departamento: selectedProfesor.departamento || "",
      profesion: selectedProfesor.profesion || "",
      ubicacion: selectedProfesor.ubicacion || "",
      imagen_url:
        selectedProfesor.imagen_url || selectedProfesor.image_url || "",
      linkedin: selectedProfesor.linkedin || "",
      contactos: String(selectedProfesor.contactos || ""),
      pregrado: selectedProfesor.formacion?.pregrado || "",
      universidad_pregrado:
        selectedProfesor.formacion?.universidad_pregrado || "",
      maestria: selectedProfesor.formacion?.maestria || "",
      universidad_maestria:
        selectedProfesor.formacion?.universidad_maestria || "",
      exp_sena: Array.isArray(selectedProfesor.experiencia)
        ? selectedProfesor.experiencia[0]?.sena || ""
        : selectedProfesor.experiencia?.sena || "",
      exp_docencia: Array.isArray(selectedProfesor.experiencia)
        ? selectedProfesor.experiencia[0]?.docencia_universitaria || ""
        : selectedProfesor.experiencia?.docencia_universitaria || "",
      cargos: Array.isArray(selectedProfesor.cargos)
        ? selectedProfesor.cargos.join(", ")
        : "",
      lenguajes: Array.isArray(selectedProfesor.lenguajes_programacion)
        ? selectedProfesor.lenguajes_programacion.join(", ")
        : "",
      bd_sql: Array.isArray(selectedProfesor.bases_de_datos?.sql)
        ? selectedProfesor.bases_de_datos.sql.join(", ")
        : "",
      bd_nosql: Array.isArray(selectedProfesor.bases_de_datos?.nosql)
        ? selectedProfesor.bases_de_datos.nosql.join(", ")
        : "",
    });
  }, [selectedProfesor]);

  const handleChange = (name: string, value: string) => {
    setErrorMsg("");
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        notificar(
          "Permiso requerido",
          "Se necesitan permisos para acceder a la galería de fotos."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const uri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        handleChange("imagen_url", uri);
      }
    } catch (e: any) {
      console.warn("Error al abrir galería:", e);
    }
  };

  const handleSave = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!formData.nombre.trim()) {
      setErrorMsg("El nombre del profesor es obligatorio.");
      notificar("Campo requerido", "El nombre del profesor es obligatorio.");
      return;
    }

    if (!formData.departamento.trim()) {
      setErrorMsg("El departamento es obligatorio.");
      notificar("Campo requerido", "El departamento es obligatorio.");
      return;
    }

    setLoading(true);

    const profesorId = selectedProfesor?.id || selectedProfesor?._id;

    const payload = {
      ...(selectedProfesor || {}),
      ...(profesorId ? { id: String(profesorId) } : {}),
      nombre: formData.nombre.trim(),
      departamento: formData.departamento.trim(),
      profesion: formData.profesion.trim(),
      ubicacion: formData.ubicacion.trim(),
      imagen_url: formData.imagen_url.trim(),
      linkedin: formData.linkedin.trim(),
      contactos: formData.contactos.trim(),
      formacion: {
        pregrado: formData.pregrado.trim(),
        universidad_pregrado: formData.universidad_pregrado.trim(),
        maestria: formData.maestria.trim(),
        universidad_maestria: formData.universidad_maestria.trim(),
      },
      experiencia: {
        sena: formData.exp_sena.trim(),
        docencia_universitaria: formData.exp_docencia.trim(),
      },
      cargos: formData.cargos
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      lenguajes_programacion: formData.lenguajes
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      bases_de_datos: {
        sql: formData.bd_sql
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        nosql: formData.bd_nosql
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      },
    };

    try {
      let resultado;
      if (isEditing && profesorId) {
        resultado = await actualizarProfesorService(String(profesorId), payload);
      } else {
        resultado = await crearProfesorService(payload);
      }

      const mensaje =
        resultado.isOnline && resultado.sincronizado
          ? "El profesor se guardó y sincronizó exitosamente con el microservicio en internet."
          : "Sin conexión a internet. El profesor se guardó localmente en SQLite y se sincronizará automáticamente cuando vuelva a haber conexión.";

      setSuccessMsg(mensaje);

      notificar(
        resultado.isOnline ? "Guardado en línea" : "Guardado localmente (Offline)",
        mensaje,
        () => {
          setSelectedProfesor(null);
          router.replace("/(tabs)/profesores");
        }
      );
    } catch (err: any) {
      console.error("Error al guardar profesor:", err);
      const msg = err?.message || "No se pudo guardar el profesor.";
      setErrorMsg(msg);
      notificar("Error al guardar", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#1a2a6c", "#112240", "#0a192f"]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
        keyboardShouldPersistTaps="handled"
      >
        <BlurView intensity={30} tint="dark" style={styles.glassCard}>
          <Text style={styles.title}>
            {isEditing ? "Editar Profesor" : "Nuevo Profesor"}
          </Text>

          {errorMsg !== "" && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
            </View>
          )}

          {successMsg !== "" && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>✅ {successMsg}</Text>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Foto del Profesor</Text>
            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={pickImage}
            >
              <Text style={styles.imagePickerText}>
                📷 Seleccionar de la galería
              </Text>
            </TouchableOpacity>

            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              value={formData.imagen_url}
              onChangeText={(val) => handleChange("imagen_url", val)}
              placeholder="O pega aquí la URL de la imagen..."
              placeholderTextColor="#888"
              autoCapitalize="none"
            />

            {formData.imagen_url ? (
              <Image
                source={{ uri: formData.imagen_url }}
                style={styles.previewImage}
              />
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Datos personales</Text>
          <InputField
            label="Nombre *"
            value={formData.nombre}
            onChangeText={(v) => handleChange("nombre", v)}
            placeholder="Ej: John Doe"
          />
          <InputField
            label="Departamento *"
            value={formData.departamento}
            onChangeText={(v) => handleChange("departamento", v)}
            placeholder="Ej: Sistemas"
          />
          <InputField
            label="Profesión"
            value={formData.profesion}
            onChangeText={(v) => handleChange("profesion", v)}
            placeholder="Ej: Ingeniero de Software"
          />
          <InputField
            label="Ubicación"
            value={formData.ubicacion}
            onChangeText={(v) => handleChange("ubicacion", v)}
            placeholder="Ej: Bogotá"
          />

          <Text style={styles.sectionTitle}>Formación</Text>
          <InputField
            label="Pregrado"
            value={formData.pregrado}
            onChangeText={(v) => handleChange("pregrado", v)}
            placeholder="Ingeniería..."
          />
          <InputField
            label="Universidad (Pregrado)"
            value={formData.universidad_pregrado}
            onChangeText={(v) => handleChange("universidad_pregrado", v)}
            placeholder="UNAL"
          />
          <InputField
            label="Maestría"
            value={formData.maestria}
            onChangeText={(v) => handleChange("maestria", v)}
            placeholder="Maestría en..."
          />
          <InputField
            label="Universidad (Maestría)"
            value={formData.universidad_maestria}
            onChangeText={(v) => handleChange("universidad_maestria", v)}
            placeholder="Los Andes"
          />

          <Text style={styles.sectionTitle}>Experiencia</Text>
          <InputField
            label="SENA"
            value={formData.exp_sena}
            onChangeText={(v) => handleChange("exp_sena", v)}
            placeholder="Años o descripción"
          />
          <InputField
            label="Docencia Universitaria"
            value={formData.exp_docencia}
            onChangeText={(v) => handleChange("exp_docencia", v)}
            placeholder="Años o descripción"
          />

          <Text style={styles.sectionTitle}>
            Habilidades y cargos (separados por coma)
          </Text>
          <InputField
            label="Cargos"
            value={formData.cargos}
            onChangeText={(v) => handleChange("cargos", v)}
            placeholder="Docente, Investigador"
          />
          <InputField
            label="Lenguajes de Programación"
            value={formData.lenguajes}
            onChangeText={(v) => handleChange("lenguajes", v)}
            placeholder="JS, Python, Java"
          />
          <InputField
            label="Bases de Datos SQL"
            value={formData.bd_sql}
            onChangeText={(v) => handleChange("bd_sql", v)}
            placeholder="MySQL, PostgreSQL"
          />
          <InputField
            label="Bases de Datos NoSQL"
            value={formData.bd_nosql}
            onChangeText={(v) => handleChange("bd_nosql", v)}
            placeholder="MongoDB, Redis"
          />

          <Text style={styles.sectionTitle}>Redes y contacto</Text>
          <InputField
            label="LinkedIn"
            value={formData.linkedin}
            onChangeText={(v) => handleChange("linkedin", v)}
            placeholder="https://linkedin.com/..."
          />
          <InputField
            label="Teléfono / Contacto"
            value={formData.contactos}
            onChangeText={(v) => handleChange("contactos", v)}
            placeholder="3000000000"
          />

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#64ffda"
              style={{ marginTop: 20 }}
            />
          ) : (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>
                💾 Guardar Profesor
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setSelectedProfesor(null);
              router.back();
            }}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </BlurView>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glassCard: {
    borderRadius: 20,
    padding: 20,
    overflow: "hidden",
    borderColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    marginTop: 30,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  errorBox: {
    backgroundColor: "rgba(231, 76, 60, 0.2)",
    borderColor: "rgba(231, 76, 60, 0.6)",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  successBox: {
    backgroundColor: "rgba(46, 204, 113, 0.2)",
    borderColor: "rgba(46, 204, 113, 0.6)",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },
  successText: {
    color: "#64ffda",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  sectionTitle: {
    color: "#64ffda",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(100,255,218,0.3)",
    paddingBottom: 5,
  },
  formGroup: { marginBottom: 15 },
  label: {
    color: "#ccd6f6",
    marginBottom: 5,
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  imagePickerButton: {
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderStyle: "dashed",
  },
  imagePickerText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: "center",
    marginTop: 10,
    borderWidth: 2,
    borderColor: "#64ffda",
  },
  saveButton: {
    backgroundColor: "rgba(46,204,113,0.85)",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(46,204,113,1)",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cancelButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  cancelButtonText: {
    color: "#ccc",
    fontSize: 16,
    fontWeight: "bold",
  },
});
