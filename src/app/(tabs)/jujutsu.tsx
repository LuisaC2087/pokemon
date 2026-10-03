import { useEffect, useState, useContext } from "react";
import { Image, ScrollView, StyleSheet, Text, View, TextInput, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { AppContext } from "../../context/AppContext";

export default function Anime() {
  const [characters, setCharacters] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { setSelectedJujutsu } = useContext(AppContext);

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

  const handlePress = (char: any) => {
    setSelectedJujutsu(char);
    router.push("/(tabs)/jujutsu-details");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Jujutsu Kaisen</Text>
      
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
          <TouchableOpacity key={idx} style={styles.card} onPress={() => handlePress(char)}>
            <Image source={{ uri: char.image_url }} style={styles.image} />
            <Text style={styles.name}>{char.name}</Text>
            <Text style={styles.anime}>{char.anime}</Text>
          </TouchableOpacity>
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