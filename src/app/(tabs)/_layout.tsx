import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { StyleSheet, View } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarStyle: {
          position: 'absolute',
          height: 65,
          paddingBottom: 8,
          paddingTop: 5,
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.1)",
          elevation: 0,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView tint="dark" intensity={90} style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
          </View>
        ),

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "bold",
        },
        tabBarInactiveTintColor: "rgba(255,255,255,0.5)",
      }}
    >

      <Tabs.Screen
        name="pokemon"
        options={{
          title: "Pokémon",
          tabBarActiveTintColor: "#ff5252",

          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="ellipse"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="pokemon-details"
        options={{
          href: null,
          title: "Datos",
        }}
      />

      <Tabs.Screen
        name="jujutsu"
        options={{
          title: "JJS",
          tabBarActiveTintColor: "#e040fb",

          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="skull"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="jujutsu-details"
        options={{
          href: null,
          title: "Detalles",
        }}
      />

      <Tabs.Screen
        name="profesores"
        options={{
          title: "Profes",
          tabBarActiveTintColor: "#64ffda",

          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="school"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profesores-details"
        options={{ href: null }}
      />
      
      <Tabs.Screen
        name="profesores-form"
        options={{ href: null }}
      />

    </Tabs>
  );
}