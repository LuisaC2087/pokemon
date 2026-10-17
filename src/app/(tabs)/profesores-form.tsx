import { useState, useEffect, useContext } from "react";
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { AppContext } from "../../context/AppContext";

const BASE_URL = "https://profesores-node-ueas.onrender.com";

export default function ProfesoresForm() {
  const router = useRouter();
  const { selectedProfesor, setSelectedProfesor, triggerSync } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const isEditing = !!selectedProfesor && !!(selectedProfesor.id || selectedProfesor._id);

  const [formData, setFormData] = useState({
    nombre: "",
    departamento: "",
    profesion: "",
    email: "",
    telefono: "",
    imagen_url: "",
  });

  useEffect(() => {
    if (isEditing && selectedProfesor) {
      setFormData({
        nombre:      selectedProfesor.nombre ?? "",
        departamento: selectedProfesor.departamento ?? "",
        profesion:   selectedProfesor.profesion ?? "",
        email:       selectedProfesor.email ?? "",
        telefono:    selectedProfesor.telefono ?? String(selectedProfesor.contactos ?? ""),
        imagen_url:  selectedProfesor.imagen_url ?? selectedProfesor.image_url ?? "",
      });
    }
  }, [isEditing, selectedProfesor]);

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /** Procesa el asset seleccionado y lo convierte en una URI Base64 lista para la base de datos */
  const processAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    setProcessingImage(true);
    try {
      if (asset.base64) {
        const mime = asset.mimeType || "image/jpeg";
        handleChange("imagen_url", `data:${mime};base64,${asset.base64}`);
        return;
      }

      // Conversión de respaldo vía Blob/FileReader (funciona en Web y Móvil)
      const res = await fetch(asset.uri);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          handleChange("imagen_url", reader.result);
        }
        setProcessingImage(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.warn("Error convirtiendo imagen a Base64:", err);
      // Respaldo con la URI directa si falla la conversión
      handleChange("imagen_url", asset.uri);
      setProcessingImage(false);
    } finally {
      if (asset.base64) setProcessingImage(false);
    }
  };

  /** Seleccionar foto desde la galería del dispositivo */
  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      return Alert.alert("Permiso denegado", "Se requiere permiso para acceder a la galería de fotos.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      await processAsset(result.assets[0]);
    }
  };

  /** Tomar fotografía directamente con la cámara */
  const takeWithCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      return Alert.alert("Permiso denegado", "Se requiere permiso para usar la cámara del dispositivo.");
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      await processAsset(result.assets[0]);
    }
  };

  const removeImage = () => {
    handleChange("imagen_url", "");
  };

  const handleSave = async () => {
    if (!formData.nombre.trim() || !formData.departamento.trim()) {
      return Alert.alert("Error", "Nombre y departamento son obligatorios.");
    }
    setLoading(true);

    const payload = {
      nombre:       formData.nombre.trim(),
      departamento: formData.departamento.trim(),
      profesion:    formData.profesion.trim(),
      email:        formData.email.trim(),
      telefono:     formData.telefono.trim(),
      imagen_url:   formData.imagen_url,
    };

    try {
      const profId = selectedProfesor?.id ?? selectedProfesor?._id;
      const url = isEditing ? `${BASE_URL}/profesores/${profId}` : `${BASE_URL}/profesores`;
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Error al guardar el profesor en la base de datos");
      }

      Alert.alert(
        "Éxito",
        `Profesor ${isEditing ? "actualizado" : "creado"} correctamente en la base de datos.`,
        [{
          text: "OK",
          onPress: async () => {
            setSelectedProfesor(null);
            await triggerSync();
            router.push("/(tabs)/profesores");
          },
        }]
      );
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ label, field, placeholder, keyboardType = "default" }: any) => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={(formData as any)[field]}
        onChangeText={(t) => handleChange(field, t)}
        placeholder={placeholder}
        placeholderTextColor="#aaa"
        keyboardType={keyboardType}
        autoCapitalize={field === "email" ? "none" : "sentences"}
      />
    </View>
  );

  return (
    <LinearGradient colors={["#1a2a6c", "#112240", "#0a192f"]} style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <BlurView intensity={30} tint="dark" style={styles.glassCard}>
          <Text style={styles.title}>{isEditing ? "Editar Profesor" : "Nuevo Profesor"}</Text>

          {/* ── SECCIÓN DE IMAGEN DEL DISPOSITIVO ── */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Foto del Profesor (Desde el Dispositivo)</Text>

            <View style={styles.imageButtonsRow}>
              <TouchableOpacity style={styles.actionPickButton} onPress={pickFromGallery}>
                <Text style={styles.actionPickText}>🖼️ Galería</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionPickButton} onPress={takeWithCamera}>
                <Text style={styles.actionPickText}>📷 Cámara</Text>
              </TouchableOpacity>
            </View>

            {processingImage && (
              <View style={styles.processingBox}>
                <ActivityIndicator size="small" color="#64ffda" />
                <Text style={styles.processingText}>Procesando imagen...</Text>
              </View>
            )}

            {formData.imagen_url ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: formData.imagen_url }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
                  <Text style={styles.removeImageText}>✕ Quitar foto</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Alternativa: ingresar URL directamente si no se toma foto */}
            <TextInput
              style={[styles.input, { marginTop: 8, fontSize: 13 }]}
              value={formData.imagen_url.startsWith("data:") ? "(Imagen en Base64 cargada desde el dispositivo)" : formData.imagen_url}
              editable={!formData.imagen_url.startsWith("data:")}
              onChangeText={(t) => handleChange("imagen_url", t)}
              placeholder="O pega aquí una URL de imagen (opcional)"
              placeholderTextColor="#777"
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.sectionTitle}>Datos Personales</Text>
          <InputField label="Nombre *" field="nombre" placeholder="Ej: Dra. Carmen Morales" />
          <InputField label="Departamento *" field="departamento" placeholder="Ej: Ciencias Básicas" />
          <InputField label="Profesión" field="profesion" placeholder="Ej: Docente Titular" />

          <Text style={styles.sectionTitle}>Contacto</Text>
          <InputField label="Email" field="email" placeholder="correo@ejemplo.com" keyboardType="email-address" />
          <InputField label="Teléfono" field="telefono" placeholder="+57 300 1234567" keyboardType="phone-pad" />

          {loading ? (
            <ActivityIndicator size="large" color="#64ffda" style={{ marginTop: 20 }} />
          ) : (
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>
                {isEditing ? "Actualizar Profesor" : "Guardar Profesor en BD"}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => { setSelectedProfesor(null); router.back(); }}
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
    borderRadius: 20, padding: 22, overflow: "hidden",
    borderColor: "rgba(255,255,255,0.2)", borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.3)", marginTop: 30,
  },
  title: {
    color: "#fff", fontSize: 26, fontWeight: "bold",
    marginBottom: 22, textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3,
  },
  sectionTitle: {
    color: "#64ffda", fontSize: 16, fontWeight: "bold",
    marginTop: 18, marginBottom: 10,
    borderBottomWidth: 1, borderBottomColor: "rgba(100,255,218,0.3)",
    paddingBottom: 5,
  },
  formGroup: { marginBottom: 15 },
  label: { color: "#ccd6f6", marginBottom: 5, fontSize: 13, fontWeight: "600" },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)", color: "#fff",
    borderRadius: 10, padding: 12, fontSize: 15,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  imageButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  actionPickButton: {
    flex: 1,
    backgroundColor: "rgba(100, 255, 218, 0.15)",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(100, 255, 218, 0.35)",
  },
  actionPickText: {
    color: "#64ffda",
    fontSize: 14,
    fontWeight: "bold",
  },
  processingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    gap: 8,
  },
  processingText: {
    color: "#64ffda",
    fontSize: 12,
  },
  previewContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  previewImage: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 2, borderColor: "#64ffda",
  },
  removeImageButton: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  removeImageText: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: "rgba(46,204,113,0.85)",
    padding: 15, borderRadius: 12, alignItems: "center",
    marginTop: 22, borderWidth: 1, borderColor: "rgba(46,204,113,1)",
  },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  cancelButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 15, borderRadius: 12, alignItems: "center",
    marginTop: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  cancelButtonText: { color: "#ccc", fontSize: 16, fontWeight: "bold" },
});
