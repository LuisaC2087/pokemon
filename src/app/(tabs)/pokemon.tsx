import { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { PokemonContext } from "../../context/PokemonContext";

export default function Pokemon() {
  const [nombre, setNombre] = useState("");

  const {
    pokemon,
    setPokemon,
    mensaje,
    setMensaje,
  } = useContext(PokemonContext);

  const buscarPokemon = async () => {
    setMensaje("");

    if (nombre.trim() === "") {
      setMensaje("Escribe el nombre de un Pokémon");
      setPokemon(null);
      return;
    }

    try {
      const debuggerHost = Constants.expoConfig?.hostUri;

      const localhost = debuggerHost
        ? debuggerHost.split(":")[0]
        : "localhost";

      const baseUrl = `http://${localhost}:3000`;

      const respuesta = await fetch(
        `${baseUrl}/consultaPokemon/${encodeURIComponent(
          nombre.toLowerCase().trim()
        )}`
      );

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
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pokeball}>
          <View style={styles.pokeballCentro} />
        </View>

        <Text style={styles.titulo}>
          POKÉMON
        </Text>

        <Text style={styles.subtitulo}>
          Busca tu Pokémon
        </Text>

        <View style={styles.busqueda}>
          <TextInput
            style={styles.input}
            placeholder="Nombre del Pokémon"
            placeholderTextColor="#888"
            value={nombre}
            onChangeText={setNombre}
          />

          <TouchableOpacity
            style={styles.botonBuscar}
            onPress={buscarPokemon}
          >
            <Ionicons
              name="search"
              size={20}
              color="#FFFFFF"
            />

            <Text style={styles.textoBuscar}>
              Buscar
            </Text>
          </TouchableOpacity>
        </View>

        {mensaje !== "" && (
          <Text style={styles.mensaje}>
            {mensaje}
          </Text>
        )}

        {pokemon && (
          <View style={styles.tarjeta}>
            <Text style={styles.nombre}>
              {pokemon.name?.toUpperCase()}
            </Text>

            <Image
              source={{
                uri: pokemon.sprites.front_default,
              }}
              style={styles.imagen}
            />

            <View style={styles.fila}>
              <Image
                source={{
                  uri: pokemon.sprites.back_default,
                }}
                style={styles.imagenPequena}
              />

              <Image
                source={{
                  uri: pokemon.sprites.front_shiny,
                }}
                style={styles.imagenPequena}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EAF6FF",
  },

  contenido: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 40,
    paddingBottom: 25,
  },

  pokeball: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#E3350D",
    alignSelf: "center",
    borderWidth: 5,
    borderColor: "#222",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  pokeballCentro: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 4,
    borderColor: "#222",
  },

  titulo: {
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center",
    color: "#E3350D",
    letterSpacing: 2,
  },

  subtitulo: {
    textAlign: "center",
    color: "#3B4CCA",
    marginTop: 5,
    marginBottom: 20,
    fontSize: 15,
  },

  busqueda: {
    flexDirection: "row",
    width: "100%",
  },

  input: {
    flex: 1,
    minWidth: 0,
    height: 50,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#3B4CCA",
    borderRadius: 12,
    paddingHorizontal: 12,
  },

  botonBuscar: {
    width: 90,
    height: 50,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: "#E3350D",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  textoBuscar: {
    color: "#FFFFFF",
    fontWeight: "bold",
    marginLeft: 5,
  },

  mensaje: {
    color: "#D32F2F",
    textAlign: "center",
    fontWeight: "bold",
    marginTop: 15,
  },

  tarjeta: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    padding: 20,
    borderWidth: 4,
    borderColor: "#FFCB05",
    elevation: 8,
  },

  nombre: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "900",
    color: "#3B4CCA",
    marginBottom: 10,
  },

  imagen: {
    width: "75%",
    aspectRatio: 1,
    alignSelf: "center",
  },

  fila: {
    flexDirection: "row",
    justifyContent: "space-around",
  },

  imagenPequena: {
    width: "42%",
    aspectRatio: 1,
    backgroundColor: "#EAF6FF",
    borderRadius: 15,
  },
});