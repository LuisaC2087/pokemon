import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarStyle: {
          height: 65,
          paddingBottom: 8,
          paddingTop: 5,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#DDDDDD",
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "bold",
        },
      }}
    >

      <Tabs.Screen
        name="pokemon"
        options={{
          title: "Pokémon",
          tabBarActiveTintColor: "#E3350D",

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
          title: "Datos",
          tabBarActiveTintColor: "#3B4CCA",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="jujutsu"
        options={{
          title: "JJS",
          tabBarActiveTintColor: "#9C27B0",

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
          title: "Detalles",
          tabBarActiveTintColor: "#D32F2F",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flash" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profesores"
        options={{
          title: "Profes",
          tabBarActiveTintColor: "#2E7D32",

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

    </Tabs>
  );
}