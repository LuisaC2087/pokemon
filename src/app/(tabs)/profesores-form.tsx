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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return Alert.alert("Permiso denegado", "Se necesitan permisos de galería.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true,
    });
    if (!result.canceled && result.assets?.[0]?.base64) {
      handleChange("imagen_url", `data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSave = async () => {
    if (!formData.nombre.trim() || !formData.departamento.trim()) {
      return Alert.alert("Error", "Nombre y departamento son obligatorios.");
    }
    setLoading(true);

    // Payload con campos reducidos
    const payload = {
      nombre:      formData.nombre.trim(),
      departamento: formData.departamento.trim(),
      profesion:   formData.profesion.trim(),
      email:       formData.email.trim(),
      telefono:    formData.telefono.trim(),
      imagen_url:  formData.imagen_url,
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
      if (!res.ok) throw new Error("Error al guardar");

      Alert.alert(
        "Éxito",
        `Profesor ${isEditing ? "actualizado" : "creado"}`,
        [{
          text: "OK",
          onPress: async () => {
            setSelectedProfesor(null);
            await triggerSync(); // sincronizar inmediatamente después de guardar
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

          {/* Imagen */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Foto del Profesor</Text>
            <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
              <Text style={styles.imagePickerText}>📷 Seleccionar imagen</Text>
            </TouchableOpacity>
            {formData.imagen_url ? (
              <Image source={{ uri: formData.imagen_url }} style={styles.previewImage} />
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Datos Personales</Text>
          <InputField label="Nombre *" field="nombre" placeholder="Ej: Ana García" />
          <InputField label="Departamento *" field="departamento" placeholder="Ej: Sistemas" />
          <InputField label="Profesión" field="profesion" placeholder="Ej: Ingeniera de Software" />

          <Text style={styles.sectionTitle}>Contacto</Text>
          <InputField label="Email" field="email" placeholder="correo@ejemplo.com" keyboardType="email-address" />
          <InputField label="Teléfono" field="telefono" placeholder="3000000000" keyboardType="phone-pad" />

          {loading ? (
            <ActivityIndicator size="large" color="#64ffda" style={{ marginTop: 20 }} />
          ) : (
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>
                {isEditing ? "Actualizar Profesor" : "Guardar Profesor"}
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
  imagePickerButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 14, borderRadius: 10, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", borderStyle: "dashed",
  },
  imagePickerText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  previewImage: {
    width: 100, height: 100, borderRadius: 50,
    alignSelf: "center", marginTop: 12,
    borderWidth: 2, borderColor: "#64ffda",
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
