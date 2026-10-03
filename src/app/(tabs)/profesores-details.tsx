import { useContext } from "react";
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { AppContext } from "../../context/AppContext";

export default function ProfesoresDetails() {
  const { selectedProfesor } = useContext(AppContext);
  const router = useRouter();

  if (!selectedProfesor) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No se ha seleccionado ningún Profesor</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push("/(tabs)/profesores")}>
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: selectedProfesor.image_url || 'https://via.placeholder.com/300' }} style={styles.image} />
        <Text style={styles.name}>{selectedProfesor.name}</Text>
        <Text style={styles.subject}>{selectedProfesor.subject || 'Materia desconocida'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Información</Text>
        
        <View style={styles.row}>
          <Text style={styles.label}>Edad:</Text>
          <Text style={styles.value}>{selectedProfesor.age || 'Desconocida'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Departamento:</Text>
          <Text style={styles.value}>{selectedProfesor.department || 'General'}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => router.push("/(tabs)/profesores")}>
        <Text style={styles.backText}>Volver a la lista</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e1e1e",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
  },
  errorText: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 20,
  },
  header: {
    alignItems: "center",
    padding: 30,
    paddingTop: 60,
    backgroundColor: "#2a2a2a",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  name: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  subject: {
    fontSize: 18,
    color: "#aaa",
    marginTop: 5,
  },
  card: {
    backgroundColor: "#2a2a2a",
    margin: 20,
    borderRadius: 15,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
    paddingBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  label: {
    color: "#aaa",
    fontSize: 16,
  },
  value: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  backButton: {
    backgroundColor: "#2E7D32",
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  backText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
