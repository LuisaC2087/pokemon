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
import { JujutsuContext } from "../../context/JujutsuContext";

export default function Jujutsu() {
  const [nombre, setNombre] = useState("");

  const {
    personaje,
    setPersonaje,
    mensaje,
    setMensaje,
  } = useContext(JujutsuContext);

  const buscarPersonaje = async () => {
    setMensaje("");

    if (nombre.trim() === "") {
      setMensaje("Escribe el nombre de un personaje");
      setPersonaje(null);
      return;
    }

    try {
      const debuggerHost = Constants.expoConfig?.hostUri;

      const localhost = debuggerHost
        ? debuggerHost.split(":")[0]
        : "localhost";

      const baseUrl = `http://${localhost}:3000`;

      const respuestaPersonaje = await fetch(
        `${baseUrl}/consultaJujutsu/${encodeURIComponent(
          nombre.trim()
        )}`
      );

      if (!respuestaPersonaje.ok) {
        setMensaje("Ese personaje no existe");
        setPersonaje(null);
        return;
      }

      const personajes = await respuestaPersonaje.json();

      if (!personajes || personajes.length === 0) {
        setMensaje("Ese personaje no existe");
        setPersonaje(null);
        return;
      }

      const personajeEncontrado = personajes[0];

      let tecnica = null;

      try {
        const respuestaTecnica = await fetch(
          `${baseUrl}/consultaTecnica/${encodeURIComponent(
            personajeEncontrado.name
          )}`
        );

        if (respuestaTecnica.ok) {
          const datosTecnica = await respuestaTecnica.json();

          if (datosTecnica.data?.length > 0) {
            tecnica = datosTecnica.data.find((item: any) =>
              item.users?.some(
                (user: any) =>
                  user.name?.toLowerCase() ===
                  personajeEncontrado.name?.toLowerCase()
              )
            );
          }
        }
      } catch (error) {
        console.log("No se pudo obtener la técnica");
      }

      let dominio = null;

      try {
        const respuestaDominio = await fetch(
          `${baseUrl}/consultaDominio/${encodeURIComponent(
            personajeEncontrado.name
          )}`
        );

        if (respuestaDominio.ok) {
          dominio = await respuestaDominio.json();
        }
      } catch (error) {
        console.log("No se pudo obtener el dominio");
      }

      setPersonaje({
        ...personajeEncontrado,
        tecnica,
        dominio,
      });
    } catch (error) {
      console.error(error);

      setMensaje("No se pudo realizar la búsqueda");
      setPersonaje(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.logo}>呪術廻戦</Text>

        <Text style={styles.titulo}>
          JUJUTSU KAISEN
        </Text>

        <Text style={styles.subtitulo}>
          Busca un personaje
        </Text>

        <View style={styles.busqueda}>
          <TextInput
            style={styles.input}
            placeholder="Nombre del personaje"
            placeholderTextColor="#777"
            value={nombre}
            onChangeText={setNombre}
          />

          <TouchableOpacity
            style={styles.botonBuscar}
            onPress={buscarPersonaje}
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

        {personaje && (
          <View style={styles.tarjetas}>

            {/* PERSONAJE */}
            <View style={styles.tarjeta}>
              <View style={styles.imagenContainer}>
                <Image
                  source={{ uri: personaje.image }}
                  style={styles.imagen}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.informacion}>
                <Text style={styles.tituloTarjeta}>
                  PERSONAJE
                </Text>

                <Text style={styles.nombreTarjeta}>
                  {personaje.name}
                </Text>
              </View>
            </View>

            {/* TÉCNICA */}
            <View style={styles.tarjeta}>
              <View style={styles.imagenContainer}>
                {personaje.tecnica?.image ? (
                  <Image
                    source={{
                      uri: personaje.tecnica.image,
                    }}
                    style={styles.imagen}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.sinImagen}>
                    <Ionicons
                      name="flash"
                      size={60}
                      color="#E63946"
                    />

                    <Text style={styles.sinDatos}>
                      Sin imagen
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.informacion}>
                <Text style={styles.tituloTarjeta}>
                  TÉCNICA MALDITA
                </Text>

                <Text style={styles.nombreTarjeta}>
                  {personaje.tecnica?.technique_name ||
                    "No disponible"}
                </Text>
              </View>
            </View>

            {/* DOMINIO */}
            <View style={styles.tarjeta}>
              <View style={styles.imagenContainer}>
                {personaje.dominio?.image ? (
                  <Image
                    source={{
                      uri: personaje.dominio.image,
                    }}
                    style={styles.imagen}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.sinImagen}>
                    <Ionicons
                      name="aperture"
                      size={60}
                      color="#9C27B0"
                    />

                    <Text style={styles.sinDatos}>
                      Sin dominio
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.informacion}>
                <Text style={styles.tituloTarjeta}>
                  EXPANSIÓN DEL DOMINIO
                </Text>

                <Text style={styles.nombreTarjeta}>
                  {personaje.dominio?.name ||
                    "No disponible"}
                </Text>
              </View>
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
    backgroundColor: "#160D18",
  },

  contenido: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 35,
    paddingBottom: 30,
  },

  logo: {
    textAlign: "center",
    color: "#E63946",
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 2,
  },

  titulo: {
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  subtitulo: {
    textAlign: "center",
    color: "#BFA9C5",
    marginTop: 5,
    marginBottom: 20,
    fontSize: 15,
  },

  busqueda: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },

  input: {
    flex: 1,
    minWidth: 0,
    height: 50,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },

  botonBuscar: {
    width: 92,
    height: 50,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: "#C62839",
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
    textAlign: "center",
    color: "#FF7180",
    fontWeight: "bold",
    marginTop: 15,
  },

  tarjetas: {
    marginTop: 22,
    gap: 18,
  },

  tarjeta: {
    width: "100%",
    backgroundColor: "#241528",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#593263",
    elevation: 7,
  },

  imagenContainer: {
    width: "100%",
    height: 230,
    backgroundColor: "#211323",
    alignItems: "center",
    justifyContent: "center",
  },

  imagen: {
    width: "90%",
    height: "90%",
  },

  informacion: {
    padding: 14,
    backgroundColor: "#0F0A11",
  },

  tituloTarjeta: {
    color: "#E63946",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },

  nombreTarjeta: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 5,
  },

  sinImagen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  sinDatos: {
    color: "#BFA9C5",
    marginTop: 8,
  },
});