import { Alert, Platform } from "react-native";

export function notificar(
  titulo: string,
  mensaje: string,
  onOk?: () => void
): void {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(`${titulo}\n\n${mensaje}`);
    }
    if (onOk) {
      onOk();
    }
  } else {
    Alert.alert(titulo, mensaje, [
      {
        text: "OK",
        onPress: onOk,
      },
    ]);
  }
}

export function confirmar(
  titulo: string,
  mensaje: string,
  onConfirmar: () => void,
  onCancelar?: () => void
): void {
  if (Platform.OS === "web") {
    const aceptado =
      typeof window !== "undefined"
        ? window.confirm(`${titulo}\n\n${mensaje}`)
        : true;
    if (aceptado) {
      onConfirmar();
    } else if (onCancelar) {
      onCancelar();
    }
  } else {
    Alert.alert(titulo, mensaje, [
      {
        text: "Cancelar",
        style: "cancel",
        onPress: onCancelar,
      },
      {
        text: "Confirmar",
        style: "destructive",
        onPress: onConfirmar,
      },
    ]);
  }
}
