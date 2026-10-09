import { useState, useEffect, useContext } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { AppContext } from "../../context/AppContext";

const BASE_URL = "https://profesores-node-ueas.onrender.com"; // Adjust if testing locally (e.g. http://localhost:3000)

export default function ProfesoresForm() {
  const router = useRouter();
  const { selectedProfesor, setSelectedProfesor } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const isEditing = !!selectedProfesor && !!selectedProfesor._id;

  const [formData, setFormData] = useState({
    nombre: "",
    departamento: "",
    profesion: "",
    ubicacion: "",
  });

  useEffect(() => {
    if (isEditing) {
      setFormData({
        nombre: selectedProfesor.nombre || "",
        departamento: selectedProfesor.departamento || "",
        profesion: selectedProfesor.profesion || "",
        ubicacion: selectedProfesor.ubicacion || "",
      });
    } else {
      setFormData({
        nombre: "",
        departamento: "",
        profesion: "",
        ubicacion: "",
      });
    }
  }, [isEditing, selectedProfesor]);

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.nombre || !formData.departamento) {
      Alert.alert("Error", "El nombre y el departamento son obligatorios.");
      return;
    }

    setLoading(true);
    try {
      const url = isEditing 
        ? `${BASE_URL}/profesores/${selectedProfesor._id}` 
        : `${BASE_URL}/profesores`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Error al guardar");

      Alert.alert("Éxito", `Profesor ${isEditing ? "actualizado" : "creado"} correctamente`, [
        { text: "OK", onPress: () => {
          setSelectedProfesor(null);
          router.push("/(tabs)/profesores");
        }}
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>{isEditing ? "Editar Profesor" : "Nuevo Profesor"}</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Nombre *</Text>
        <TextInput
          style={styles.input}
          value={formData.nombre}
          onChangeText={(text) => handleChange("nombre", text)}
          placeholder="Ej: John Doe"
          placeholderTextColor="#888"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Departamento *</Text>
        <TextInput
          style={styles.input}
          value={formData.departamento}
          onChangeText={(text) => handleChange("departamento", text)}
          placeholder="Ej: Sistemas"
          placeholderTextColor="#888"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Profesión</Text>
        <TextInput
          style={styles.input}
          value={formData.profesion}
          onChangeText={(text) => handleChange("profesion", text)}
          placeholder="Ej: Ingeniero de Software"
          placeholderTextColor="#888"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Ubicación</Text>
        <TextInput
          style={styles.input}
          value={formData.ubicacion}
          onChangeText={(text) => handleChange("ubicacion", text)}
          placeholder="Ej: Bogotá, Colombia"
          placeholderTextColor="#888"
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 20 }} />
      ) : (
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Guardar</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    padding: 20,
    paddingTop: 50,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    color: "#ccc",
    marginBottom: 8,
    fontSize: 16,
  },
  input: {
    backgroundColor: "#2a2a2a",
    color: "#fff",
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#444",
  },
  saveButton: {
    backgroundColor: "#2E7D32",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "#444",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
