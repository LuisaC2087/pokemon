import { useState, useEffect, useContext } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, ImageBackground } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { AppContext } from "../../context/AppContext";

const BASE_URL = "https://profesores-node-ueas.onrender.com";

export default function ProfesoresForm() {
  const router = useRouter();
  const { selectedProfesor, setSelectedProfesor } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const isEditing = !!selectedProfesor && !!selectedProfesor._id;

  const [formData, setFormData] = useState({
    nombre: "", departamento: "", profesion: "", ubicacion: "",
    imagen_url: "", linkedin: "", contactos: "",
    pregrado: "", universidad_pregrado: "", maestria: "", universidad_maestria: "",
    exp_sena: "", exp_docencia: "",
    cargos: "", lenguajes: "", bd_sql: "", bd_nosql: "",
  });

  useEffect(() => {
    if (isEditing) {
      setFormData({
        nombre: selectedProfesor.nombre || "",
        departamento: selectedProfesor.departamento || "",
        profesion: selectedProfesor.profesion || "",
        ubicacion: selectedProfesor.ubicacion || "",
        imagen_url: selectedProfesor.imagen_url || selectedProfesor.image_url || "",
        linkedin: selectedProfesor.linkedin || "",
        contactos: String(selectedProfesor.contactos || ""),
        pregrado: selectedProfesor.formacion?.pregrado || "",
        universidad_pregrado: selectedProfesor.formacion?.universidad_pregrado || "",
        maestria: selectedProfesor.formacion?.maestria || "",
        universidad_maestria: selectedProfesor.formacion?.universidad_maestria || "",
        exp_sena: selectedProfesor.experiencia?.sena || "",
        exp_docencia: selectedProfesor.experiencia?.docencia_universitaria || "",
        cargos: (selectedProfesor.cargos || []).join(", "),
        lenguajes: (selectedProfesor.lenguajes_programacion || []).join(", "),
        bd_sql: (selectedProfesor.bases_de_datos?.sql || []).join(", "),
        bd_nosql: (selectedProfesor.bases_de_datos?.nosql || []).join(", "),
      });
    }
  }, [isEditing, selectedProfesor]);

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permiso denegado', 'Se necesitan permisos de galería.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true,
    });
    if (!result.canceled && result.assets && result.assets[0].base64) {
      handleChange("imagen_url", `data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSave = async () => {
    if (!formData.nombre || !formData.departamento) {
      return Alert.alert("Error", "Nombre y departamento son obligatorios.");
    }
    setLoading(true);

    const payload = {
      nombre: formData.nombre, departamento: formData.departamento, profesion: formData.profesion, ubicacion: formData.ubicacion,
      imagen_url: formData.imagen_url, linkedin: formData.linkedin, contactos: formData.contactos,
      formacion: { pregrado: formData.pregrado, universidad_pregrado: formData.universidad_pregrado, maestria: formData.maestria, universidad_maestria: formData.universidad_maestria },
      experiencia: { sena: formData.exp_sena, docencia_universitaria: formData.exp_docencia },
      cargos: formData.cargos.split(",").map(i => i.trim()).filter(Boolean),
      lenguajes_programacion: formData.lenguajes.split(",").map(i => i.trim()).filter(Boolean),
      bases_de_datos: { sql: formData.bd_sql.split(",").map(i => i.trim()).filter(Boolean), nosql: formData.bd_nosql.split(",").map(i => i.trim()).filter(Boolean) }
    };

    try {
      const url = isEditing ? `${BASE_URL}/profesores/${selectedProfesor._id}` : `${BASE_URL}/profesores`;
      const res = await fetch(url, { method: isEditing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Error al guardar");

      Alert.alert("Éxito", `Profesor ${isEditing ? "actualizado" : "creado"}`, [{ text: "OK", onPress: () => { setSelectedProfesor(null); router.push("/(tabs)/profesores"); } }]);
    } catch (err: any) { Alert.alert("Error", err.message); } finally { setLoading(false); }
  };

  const InputField = ({ label, field, placeholder }: any) => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={(formData as any)[field]} onChangeText={(t) => handleChange(field, t)} placeholder={placeholder} placeholderTextColor="#aaa" />
    </View>
  );

  return (
    <LinearGradient colors={['#1a2a6c', '#112240', '#0a192f']} style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        <BlurView intensity={30} tint="dark" style={styles.glassCard}>
          <Text style={styles.title}>{isEditing ? "Editar Profesor" : "Nuevo Profesor"}</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Imagen del Profesor</Text>
            <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
              <Text style={styles.imagePickerText}>Seleccionar de la galería</Text>
            </TouchableOpacity>
            {formData.imagen_url ? <Image source={{ uri: formData.imagen_url }} style={styles.previewImage} /> : null}
          </View>

          <Text style={styles.sectionTitle}>Datos Personales</Text>
          <InputField label="Nombre *" field="nombre" placeholder="Ej: John Doe" />
          <InputField label="Departamento *" field="departamento" placeholder="Ej: Sistemas" />
          <InputField label="Profesión" field="profesion" placeholder="Ej: Ingeniero de Software" />
          <InputField label="Ubicación" field="ubicacion" placeholder="Ej: Bogotá" />

          <Text style={styles.sectionTitle}>Formación</Text>
          <InputField label="Pregrado" field="pregrado" placeholder="Ingeniería..." />
          <InputField label="Universidad (Pregrado)" field="universidad_pregrado" placeholder="UNAL" />
          <InputField label="Maestría" field="maestria" placeholder="Maestría en..." />
          <InputField label="Universidad (Maestría)" field="universidad_maestria" placeholder="Los Andes" />

          <Text style={styles.sectionTitle}>Experiencia</Text>
          <InputField label="SENA" field="exp_sena" placeholder="Años o descripción" />
          <InputField label="Docencia Universitaria" field="exp_docencia" placeholder="Años o descripción" />

          <Text style={styles.sectionTitle}>Habilidades y Cargos (separados por coma)</Text>
          <InputField label="Cargos" field="cargos" placeholder="Docente, Investigador" />
          <InputField label="Lenguajes de Programación" field="lenguajes" placeholder="JS, Python, Java" />
          <InputField label="Bases de Datos SQL" field="bd_sql" placeholder="MySQL, PostgreSQL" />
          <InputField label="Bases de Datos NoSQL" field="bd_nosql" placeholder="MongoDB, Redis" />

          <Text style={styles.sectionTitle}>Redes y Contacto</Text>
          <InputField label="LinkedIn" field="linkedin" placeholder="https://linkedin..." />
          <InputField label="Teléfono / Contacto" field="contactos" placeholder="3000000000" />

          {loading ? <ActivityIndicator size="large" color="#64ffda" style={{ marginTop: 20 }} /> : (
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Guardar Profesor</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancelButton} onPress={() => { setSelectedProfesor(null); router.back(); }}>
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
    overflow: 'hidden',
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginTop: 30,
  },
  title: { color: "#fff", fontSize: 28, fontWeight: "bold", marginBottom: 20, textAlign: "center", textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 },
  sectionTitle: { color: "#64ffda", fontSize: 18, fontWeight: "bold", marginTop: 15, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: "rgba(100,255,218,0.3)", paddingBottom: 5 },
  formGroup: { marginBottom: 15 },
  label: { color: "#ccd6f6", marginBottom: 5, fontSize: 14, fontWeight: "600" },
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
  imagePickerText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  previewImage: { width: 100, height: 100, borderRadius: 50, alignSelf: "center", marginTop: 10, borderWidth: 2, borderColor: "#64ffda" },
  saveButton: {
    backgroundColor: "rgba(46, 204, 113, 0.8)",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(46, 204, 113, 1)",
  },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold", textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 },
  cancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  cancelButtonText: { color: "#ccc", fontSize: 16, fontWeight: "bold" },
});
