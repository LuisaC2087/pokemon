import { useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { JujutsuContext } from "../../context/JujutsuContext";

export default function JujutsuDetails() {
  const { personaje } = useContext(JujutsuContext);

  if (!personaje) {
    return (
      <View style={styles.vacio}>
        <Text style={styles.mensaje}>
          Primero busca un personaje en JJS.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.contenido}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.logo}>呪術廻戦</Text>

      <Text style={styles.titulo}>
        INFORMACIÓN DEL PERSONAJE
      </Text>

      {/* PERFIL */}
      <View style={styles.perfil}>
        <Image
          source={{ uri: personaje.image }}
          style={styles.imagenPerfil}
          resizeMode="contain"
        />

        <Text style={styles.nombre}>
          {personaje.name}
        </Text>

        <Text style={styles.grado}>
          {personaje.grade?.name || "Grado no disponible"}
        </Text>
      </View>

      {/* INFORMACIÓN BÁSICA */}
      <View style={styles.seccion}>
        <Text style={styles.tituloSeccion}>
          INFORMACIÓN BÁSICA
        </Text>

        <View style={styles.grid}>
          <View style={styles.dato}>
            <Text style={styles.etiqueta}>Edad</Text>
            <Text style={styles.valor}>
              {personaje.age || "N/D"}
            </Text>
          </View>

          <View style={styles.dato}>
            <Text style={styles.etiqueta}>Altura</Text>
            <Text style={styles.valor}>
              {personaje.height || "N/D"}
            </Text>
          </View>

          <View style={styles.dato}>
            <Text style={styles.etiqueta}>Género</Text>
            <Text style={styles.valor}>
              {personaje.gender?.name || "N/D"}
            </Text>
          </View>

          <View style={styles.dato}>
            <Text style={styles.etiqueta}>Especie</Text>
            <Text style={styles.valor}>
              {personaje.species?.species_name || "N/D"}
            </Text>
          </View>

          <View style={styles.dato}>
            <Text style={styles.etiqueta}>Estado</Text>
            <Text style={styles.valor}>
              {personaje.status?.name || "N/D"}
            </Text>
          </View>

          <View style={styles.dato}>
            <Text style={styles.etiqueta}>Cumpleaños</Text>
            <Text style={styles.valor}>
              {personaje.birthday || "N/D"}
            </Text>
          </View>
        </View>
      </View>

      {/* TÉCNICA */}
      <View style={styles.seccion}>
        <Text style={styles.tituloSeccion}>
          TÉCNICA MALDITA
        </Text>

        {personaje.tecnica?.image && (
          <Image
            source={{ uri: personaje.tecnica.image }}
            style={styles.imagenSecundaria}
            resizeMode="contain"
          />
        )}

        <Text style={styles.nombreTecnica}>
          {personaje.tecnica?.technique_name ||
            "No disponible"}
        </Text>

        {personaje.tecnica?.description && (
          <Text style={styles.descripcion}>
            {personaje.tecnica.description}
          </Text>
        )}
      </View>

      {/* DOMINIO */}
      <View style={styles.seccion}>
        <Text style={styles.tituloSeccion}>
          EXPANSIÓN DEL DOMINIO
        </Text>

        {personaje.dominio?.image && (
          <Image
            source={{ uri: personaje.dominio.image }}
            style={styles.imagenSecundaria}
            resizeMode="contain"
          />
        )}

        <Text style={styles.nombreTecnica}>
          {personaje.dominio?.name ||
            "No disponible"}
        </Text>

        {personaje.dominio?.description && (
          <Text style={styles.descripcion}>
            {personaje.dominio.description}
          </Text>
        )}

        {personaje.dominio?.range && (
          <View style={styles.infoExtra}>
            <Text style={styles.etiqueta}>
              Alcance
            </Text>

            <Text style={styles.valorExtra}>
              {personaje.dominio.range}
            </Text>
          </View>
        )}
      </View>

      {/* ALIAS */}
      <View style={styles.seccion}>
        <Text style={styles.tituloSeccion}>
          ALIAS
        </Text>

        {personaje.alias?.length > 0 ? (
          personaje.alias.map(
            (alias: string, index: number) => (
              <View
                key={index}
                style={styles.listaItem}
              >
                <Text style={styles.punto}>•</Text>

                <Text style={styles.listaTexto}>
                  {alias}
                </Text>
              </View>
            )
          )
        ) : (
          <Text style={styles.sinDatos}>
            No disponible
          </Text>
        )}
      </View>

      {/* OCUPACIONES */}
      <View style={styles.seccion}>
        <Text style={styles.tituloSeccion}>
          OCUPACIONES
        </Text>

        {personaje.occupations?.length > 0 ? (
          personaje.occupations.map(
            (
              ocupacion: {
                occupation_name: string;
              },
              index: number
            ) => (
              <View
                key={index}
                style={styles.listaItem}
              >
                <Text style={styles.punto}>•</Text>

                <Text style={styles.listaTexto}>
                  {ocupacion.occupation_name}
                </Text>
              </View>
            )
          )
        ) : (
          <Text style={styles.sinDatos}>
            No disponible
          </Text>
        )}
      </View>

      {/* AFILIACIONES */}
      <View style={styles.seccion}>
        <Text style={styles.tituloSeccion}>
          AFILIACIONES
        </Text>

        {personaje.affiliations?.length > 0 ? (
          personaje.affiliations.map(
            (
              afiliacion: {
                affiliation_name: string;
                type?: string;
              },
              index: number
            ) => (
              <View
                key={index}
                style={styles.afiliacion}
              >
                <Text style={styles.listaTexto}>
                  {afiliacion.affiliation_name}
                </Text>

                {afiliacion.type && (
                  <Text style={styles.tipo}>
                    {afiliacion.type}
                  </Text>
                )}
              </View>
            )
          )
        ) : (
          <Text style={styles.sinDatos}>
            No disponible
          </Text>
        )}
      </View>

      {/* DEBUT */}
      <View style={styles.seccion}>
        <Text style={styles.tituloSeccion}>
          DEBUT
        </Text>

        <View style={styles.debut}>
          <View>
            <Text style={styles.etiqueta}>
              ANIME
            </Text>

            <Text style={styles.valorExtra}>
              {personaje.animeDebut || "N/D"}
            </Text>
          </View>

          <View>
            <Text style={styles.etiqueta}>
              MANGA
            </Text>

            <Text style={styles.valorExtra}>
              {personaje.mangaDebut || "N/D"}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  vacio: {
    flex: 1,
    backgroundColor: "#160D18",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  mensaje: {
    color: "#FF7180",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },

  contenido: {
    flexGrow: 1,
    backgroundColor: "#160D18",
    padding: 20,
    paddingTop: 35,
    paddingBottom: 40,
  },

  logo: {
    textAlign: "center",
    color: "#E63946",
    fontSize: 36,
    fontWeight: "bold",
  },

  titulo: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 21,
    fontWeight: "bold",
    marginTop: 4,
    marginBottom: 20,
  },

  perfil: {
    backgroundColor: "#241528",
    borderRadius: 22,
    padding: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#593263",
    marginBottom: 18,
  },

  imagenPerfil: {
    width: "100%",
    height: 250,
  },

  nombre: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 5,
  },

  grado: {
    color: "#E63946",
    fontSize: 15,
    fontWeight: "bold",
    marginTop: 6,
  },

  seccion: {
    backgroundColor: "#241528",
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: "#593263",
    marginBottom: 16,
  },

  tituloSeccion: {
    color: "#E63946",
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 14,
    letterSpacing: 0.5,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  dato: {
    width: "48%",
    minWidth: 120,
    backgroundColor: "#1B101E",
    borderRadius: 12,
    padding: 12,
  },

  etiqueta: {
    color: "#9E8AA3",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
  },

  valor: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },

  imagenSecundaria: {
    width: "100%",
    height: 190,
    marginBottom: 10,
  },

  nombreTecnica: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "bold",
    marginBottom: 8,
  },

  descripcion: {
    color: "#CDBFD1",
    fontSize: 15,
    lineHeight: 22,
  },

  infoExtra: {
    marginTop: 14,
    backgroundColor: "#1B101E",
    borderRadius: 12,
    padding: 12,
  },

  valorExtra: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },

  listaItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1B101E",
    borderRadius: 10,
    padding: 11,
    marginBottom: 8,
  },

  punto: {
    color: "#E63946",
    fontSize: 18,
    marginRight: 8,
  },

  listaTexto: {
    flex: 1,
    color: "#E6D8EA",
    fontSize: 15,
    fontWeight: "500",
  },

  afiliacion: {
    backgroundColor: "#1B101E",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },

  tipo: {
    color: "#9E8AA3",
    fontSize: 12,
    marginTop: 4,
  },

  sinDatos: {
    color: "#9E8AA3",
    fontSize: 15,
  },

  debut: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
});