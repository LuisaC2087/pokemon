import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View, TextInput } from "react-native";

export default function Pokemon() {
  const [pokemons, setPokemons] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("https://pokemon-node-ueas.onrender.com/pokemons")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPokemons(data);
        } else {
          setError("Error en respuesta");
        }
      })
      .catch(() => setError("Error cargando pokemons"));
  }, []);

  const filtered = Array.isArray(pokemons)
    ? pokemons.filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pokemons</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Buscar Pokémon..."
        placeholderTextColor="#888"
        value={search}
        onChangeText={setSearch}
      />

      {error !== "" && <Text style={styles.error}>{error}</Text>}
      
      <ScrollView>
        {filtered.map((poke: any) => (
          <View key={poke.id} style={styles.card}>
            <Image source={{ uri: poke.image_url }} style={styles.image} />
            <Text style={styles.name}>{poke.name}</Text>
            <Text style={styles.type}>{poke.type}</Text>
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
  },
  name: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  type: {
    color: "#aaa",
    fontSize: 16,
  },
});