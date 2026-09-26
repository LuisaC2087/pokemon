import { useState, useContext } from "react";
import { useColorScheme, View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PokemonContext } from "../context/PokemonContext";
import Constants from "expo-constants";

export default function App() {
  const [nombre, setNombre] = useState("");
  const { pokemon, setPokemon, mensaje, setMensaje } = useContext(PokemonContext);
  const router = useRouter();
  const modoOscuro = useColorScheme() === "dark";

  const buscarPokemon = async () => {
    setMensaje("");

    if (nombre.trim() === "") {
      setMensaje("Escribe el nombre de un Pokémon");
      setPokemon(null);
      return;
    }

    try {
      const debuggerHost = Constants.expoConfig?.hostUri;
      const localhost = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
      const baseUrl = `http://${localhost}:3000`;
      
      const respuesta = await fetch(`${baseUrl}/consultaPokemon/${nombre.toLowerCase().trim()}`);

      if (!respuesta.ok) {
        setMensaje("Ese Pokémon no existe");
        setPokemon(null);
        return;
      }

      const datos = await respuesta.json();
      setPokemon(datos);
    } catch (error) {
      setMensaje("No se pudo realizar la búsqueda");
      setPokemon(null);
    }
  };

  return (
    <View style={[styles.container, modoOscuro && styles.oscuro]}>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <Text style={styles.titulo}>POKEMON</Text>

        <View style={styles.busqueda}>
          <TextInput
            style={styles.input}
            placeholder="Nombre del Pokémon"
            value={nombre}
            onChangeText={setNombre}
          />
          <TouchableOpacity style={styles.botonBuscar} onPress={buscarPokemon}>
            <Ionicons name="search" size={20} color="white" />
            <Text style={styles.textoBoton}>Buscar</Text>
          </TouchableOpacity>
        </View>

        {mensaje !== "" && <Text style={styles.mensaje}>{mensaje}</Text>}

        {pokemon && (
          <View style={styles.tarjeta}>
            <Text style={styles.nombre}>{pokemon.name?.toUpperCase() || "POKÉMON"}</Text>
            <Image source={{ uri: pokemon.sprites.front_default }} style={styles.imagen} />
            <View style={styles.filaImagenes}>
               <Image source={{ uri: pokemon.sprites.back_default }} style={styles.imagenChica} />
               <Image source={{ uri: pokemon.sprites.front_shiny }} style={styles.imagenChica} />
            </View>
          </View>
        )}

        <View style={styles.botones}>
          <TouchableOpacity style={[styles.boton, styles.botonActivo]}>
            <Text style={styles.textoBotonAbajoActivo}>Imagen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.boton} onPress={() => router.push("/details")}>
            <Text style={styles.textoBotonAbajo}>Datos</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCE4EC",
  },
  oscuro: {
    backgroundColor: "#3A2028",
  },
  contenido: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 50,
  },
  titulo: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: "#C94C6D",
    marginBottom: 20,
  },
  busqueda: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 20,
  },
  input: {
    flex: 1,
    height: 48,
    minWidth: 0,
    backgroundColor: "#FFF7F9",
    borderWidth: 1,
    borderColor: "#E8A7B8",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  botonBuscar: {
    width: 90,
    height: 48,
    marginLeft: 8,
    borderRadius: 10,
    backgroundColor: "#D9576F",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  textoBoton: {
    color: "#FFFFFF",
    fontWeight: "bold",
    marginLeft: 5,
  },
  tarjeta: {
    width: "100%",
    backgroundColor: "#F8C8D4",
    borderWidth: 0,
    borderRadius: 24,
    padding: 20,
    marginBottom: 25,
    shadowColor: "#D9576F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  nombre: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#9E304D",
    textAlign: "center",
    marginBottom: 5,
  },
  imagen: {
    width: "70%",
    aspectRatio: 1,
    alignSelf: "center",
    marginBottom: 10,
  },
  filaImagenes: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  imagenChica: {
    width: "45%",
    aspectRatio: 1,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 16,
  },
  mensaje: {
    color: "#C0395A",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
  },
  botones: {
    flexDirection: "row",
    width: "100%",
    marginTop: "auto",
    paddingBottom: 20,
    justifyContent: "space-between",
    gap: 12,
  },
  boton: {
    flex: 1,
    height: 54,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  botonActivo: {
    backgroundColor: "#D9576F",
  },
  textoBotonAbajo: {
    color: "#7A263C",
    fontWeight: "bold",
    fontSize: 16,
  },
  textoBotonAbajoActivo: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  }
});