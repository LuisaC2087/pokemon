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
        <Image source={{ uri: selectedProfesor.image_url || 'https://via.placeholder.com/150' }} style={styles.image} />
        <Text style={styles.name}>{selectedProfesor.name}</Text>
        <Text style={styles.subject}>{selectedProfesor.title || 'Título no especificado'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Información General</Text>
        
        <View style={styles.row}>
          <Text style={styles.label}>Ubicación:</Text>
          <Text style={styles.value}>{selectedProfesor.location || 'Desconocida'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Instituciones:</Text>
          <Text style={styles.value} numberOfLines={3}>{selectedProfesor.institutions || 'No especificadas'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>LinkedIn:</Text>
          <Text style={styles.valueLink} numberOfLines={2}>{selectedProfesor.linkedin || 'No proporcionado'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Acerca de</Text>
        <Text style={styles.aboutText}>{selectedProfesor.about || 'Sin información'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Aptitudes Principales</Text>
        <View style={styles.skillsContainer}>
          {(selectedProfesor.skills || []).map((skill: string, index: number) => (
            <View key={index} style={styles.skillBadge}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
          {(!selectedProfesor.skills || selectedProfesor.skills.length === 0) && (
            <Text style={styles.aboutText}>Sin aptitudes listadas</Text>
          )}
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
    textAlign: "center",
  },
  subject: {
    fontSize: 16,
    color: "#aaa",
    marginTop: 8,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#2a2a2a",
    margin: 20,
    marginBottom: 5,
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
    fontSize: 14,
    flex: 1,
  },
  value: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    flex: 2,
    textAlign: "right",
  },
  valueLink: {
    color: "#64B5F6",
    fontSize: 14,
    flex: 2,
    textAlign: "right",
  },
  aboutText: {
    color: "#ddd",
    fontSize: 15,
    lineHeight: 22,
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  skillBadge: {
    backgroundColor: "#333",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  skillText: {
    color: "#fff",
    fontSize: 12,
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
