import { useContext } from "react";
import { useColorScheme, View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { PokemonContext } from "../context/PokemonContext";

export default function Details() {
  const { pokemon } = useContext(PokemonContext);
  const router = useRouter();
  const modoOscuro = useColorScheme() === "dark";

  return (
    <View style={[styles.container, modoOscuro && styles.oscuro]}>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <Text style={styles.titulo}>DATOS</Text>

        {pokemon ? (
          <View style={styles.tarjeta}>
            <View style={styles.fila}>
              <View style={styles.dato}>
                <Text style={styles.tituloDato}>ALTURA</Text>
                <Text style={styles.valor}>{pokemon.height}</Text>
              </View>

              <View style={styles.dato}>
                <Text style={styles.tituloDato}>PESO</Text>
                <Text style={styles.valor}>{pokemon.weight}</Text>
              </View>
            </View>

            <View style={styles.seccion}>
               <Text style={styles.tituloDato}>ESPECIE</Text>
               <Text style={styles.valor}>{pokemon.species?.name}</Text>
            </View>

            <View style={styles.seccion}>
               <Text style={styles.tituloDato}>ESTADÍSTICAS</Text>
               {pokemon.stats?.slice(0, 4).map((s: any, index: number) => (
                 <Text key={index} style={styles.valorDatoExtra}>
                   {s.stat.name}: {s.base_stat}
                 </Text>
               ))}
            </View>

            <View style={styles.seccion}>
               <Text style={styles.tituloDato}>MOVIMIENTOS</Text>
               <View style={styles.listaMovimientos}>
                 {pokemon.moves?.slice(0, 10).map((m: any, index: number) => (
                   <Text key={index} style={styles.movimiento}>
                     {m.move.name}
                   </Text>
                 ))}
               </View>
            </View>
          </View>
        ) : (
          <Text style={styles.mensaje}>No hay datos para mostrar. Busca un Pokémon primero.</Text>
        )}

        <View style={styles.botones}>
          <TouchableOpacity style={styles.boton} onPress={() => router.push("/")}>
            <Text style={styles.textoBotonAbajo}>Imagen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.boton, styles.botonActivo]}>
            <Text style={styles.textoBotonAbajoActivo}>Datos</Text>
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
  fila: {
    flexDirection: "row",
    width: "100%",
    marginTop: 8,
  },
  dato: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#FDE8EE",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 4,
  },
  seccion: {
    backgroundColor: "#FDE8EE",
    padding: 10,
    borderRadius: 10,
    marginHorizontal: 4,
    marginTop: 10,
    alignItems: "center",
  },
  tituloDato: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#B64B65",
    textAlign: "center",
    marginBottom: 5,
  },
  valor: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#76283D",
    textAlign: "center",
  },
  valorDatoExtra: {
    fontSize: 14,
    color: "#76283D",
    textAlign: "center",
    marginVertical: 2,
  },
  listaMovimientos: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  movimiento: {
    fontSize: 12,
    backgroundColor: "#E8A7B8",
    color: "#FFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    margin: 3,
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
