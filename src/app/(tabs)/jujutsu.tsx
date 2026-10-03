import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View, TextInput } from "react-native";

export default function Anime() {
  const [characters, setCharacters] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("https://anime-python-ueas.onrender.com/characters")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCharacters(data);
        } else {
          setError("Error en respuesta");
        }
      })
      .catch(() => setError("Error cargando personajes"));
  }, []);

  const filtered = Array.isArray(characters)
    ? characters.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Anime</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Buscar personaje..."
        placeholderTextColor="#888"
        value={search}
        onChangeText={setSearch}
      />

      {error !== "" && <Text style={styles.error}>{error}</Text>}
      
      <ScrollView>
        {filtered.map((char: any, idx: number) => (
          <View key={idx} style={styles.card}>
            <Image source={{ uri: char.image_url }} style={styles.image} />
            <Text style={styles.name}>{char.name}</Text>
            <Text style={styles.anime}>{char.anime}</Text>
          </View>
        ))}
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
  header: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  error: {
    color: "red",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  image: {
    width: 100,
    height: 100,
    marginBottom: 10,
    resizeMode: "contain",
  },
  name: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  anime: {
    color: "#aaa",
    fontSize: 16,
  },
});