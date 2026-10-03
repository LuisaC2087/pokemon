import { useContext } from "react";
import { View, Text, StyleSheet, Image, ScrollView } from "react-native";
import { AppContext } from "../../context/AppContext";

export default function JujutsuDetails() {
  const { selectedJujutsu } = useContext(AppContext);

  if (!selectedJujutsu) {
    return (
      <View style={styles.vacio}>
        <Text style={styles.mensaje}>Primero selecciona un personaje de la lista.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Detalles del Personaje</Text>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Image source={{ uri: selectedJujutsu.image_url }} style={styles.image} />
          <Text style={styles.name}>{selectedJujutsu.name}</Text>
          <Text style={styles.anime}>Anime: {selectedJujutsu.anime}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    padding: 20,
    paddingTop: 50,
  },
  content: {
    alignItems: "center",
  },
  header: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  vacio: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  mensaje: {
    color: "#aaa",
    fontSize: 18,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    width: "100%",
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 20,
    resizeMode: "contain",
  },
  name: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 10,
  },
  anime: {
    color: "#aaa",
    fontSize: 18,
  },
});