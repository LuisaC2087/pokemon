import { useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { PokemonContext } from "../../context/PokemonContext";

export default function PokemonDetails() {
  const { pokemon } = useContext(PokemonContext);

  if (!pokemon) {
    return (
      <View style={styles.vacio}>
        <Text style={styles.mensaje}>
          Primero busca un Pokémon.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.contenido}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.encabezado}>
        <View style={styles.pokeball}>
          <View style={styles.pokeballCentro} />
        </View>

        <Text style={styles.titulo}>
          DATOS DEL POKÉMON
        </Text>

        <Text style={styles.nombre}>
          {pokemon.name?.toUpperCase()}
        </Text>
      </View>

      <View style={styles.tarjeta}>
        <Image
          source={{
            uri: pokemon.sprites?.front_default,
          }}
          style={styles.imagen}
          resizeMode="contain"
        />

        <View style={styles.linea} />

        <Text style={styles.subtitulo}>
          INFORMACIÓN
        </Text>

        <View style={styles.dato}>
          <Text style={styles.etiqueta}>Altura</Text>
          <Text style={styles.valor}>
            {pokemon.height ?? "No disponible"}
          </Text>
        </View>

        <View style={styles.dato}>
          <Text style={styles.etiqueta}>Peso</Text>
          <Text style={styles.valor}>
            {pokemon.weight ?? "No disponible"}
          </Text>
        </View>

        <Text style={styles.subtitulo}>
          MOVIMIENTOS
        </Text>

        {pokemon.moves?.length > 0 ? (
          <>
            <View style={styles.movimiento}>
              <Text style={styles.numero}>1</Text>

              <Text style={styles.valorMovimiento}>
                {pokemon.moves[0]?.move?.name
                  ?.replace(/-/g, " ")
                  ?.toUpperCase() || "No disponible"}
              </Text>
            </View>

            {pokemon.moves[1] && (
              <View style={styles.movimiento}>
                <Text style={styles.numero}>2</Text>

                <Text style={styles.valorMovimiento}>
                  {pokemon.moves[1]?.move?.name
                    ?.replace(/-/g, " ")
                    ?.toUpperCase() || "No disponible"}
                </Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.sinDatos}>
            No hay movimientos disponibles.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  vacio: {
    flex: 1,
    backgroundColor: "#EAF6FF",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  mensaje: {
    color: "#3B4CCA",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },

  contenido: {
    flexGrow: 1,
    backgroundColor: "#EAF6FF",
    padding: 20,
    paddingTop: 35,
    paddingBottom: 40,
  },

  encabezado: {
    alignItems: "center",
    marginBottom: 20,
  },

  pokeball: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#E3350D",
    borderWidth: 5,
    borderColor: "#222222",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  pokeballCentro: {
    width: 25,
    height: 25,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 4,
    borderColor: "#222222",
  },

  titulo: {
    color: "#3B4CCA",
    fontSize: 23,
    fontWeight: "900",
    textAlign: "center",
  },

  nombre: {
    color: "#E3350D",
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 5,
    textAlign: "center",
  },

  tarjeta: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 2,
    borderColor: "#FFCB05",
    elevation: 6,
  },

  imagen: {
    width: "100%",
    height: 230,
  },

  linea: {
    height: 2,
    backgroundColor: "#EAF6FF",
    marginVertical: 15,
  },

  subtitulo: {
    color: "#3B4CCA",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 12,
  },

  dato: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F4F9FF",
    borderRadius: 12,
    padding: 13,
    marginBottom: 10,
  },

  etiqueta: {
    color: "#555555",
    fontSize: 16,
    fontWeight: "bold",
  },

  valor: {
    color: "#222222",
    fontSize: 16,
    fontWeight: "bold",
  },

  movimiento: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF4F1",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#E3350D",
  },

  numero: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#3B4CCA",
    color: "#FFFFFF",
    textAlign: "center",
    textAlignVertical: "center",
    fontWeight: "bold",
    marginRight: 10,
  },

  valorMovimiento: {
    flex: 1,
    color: "#222222",
    fontSize: 15,
    fontWeight: "bold",
  },

  sinDatos: {
    color: "#777777",
    fontSize: 15,
    textAlign: "center",
    marginTop: 5,
  },
});