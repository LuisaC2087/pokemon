import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CHAT_SERVICE_URL = Platform.select({
  android: 'http://10.0.2.2:3003',
  default: 'http://localhost:3003',
});

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestions?: string[];
  outOfScope?: boolean;
}

const SAMPLE_QUESTIONS = [
  'Cuales son las estadisticas y tipo de Pikachu?',
  'Cual es la tecnica maldita de Satoru Gojo?',
  'Que profesores estan registrados en la base de datos?',
  'Que habilidades tiene Charizard?',
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<'ok' | 'error' | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${CHAT_SERVICE_URL}/health`, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        setServiceStatus('ok');
      } else {
        setServiceStatus('error');
      }
    } catch {
      setServiceStatus('error');
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const timer = setInterval(checkHealth, 15000);
    return () => clearInterval(timer);
  }, [checkHealth]);

  const scrollToBottom = (delay = 100) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, delay);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    scrollToBottom();

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${CHAT_SERVICE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }

      const data = await res.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'Sin respuesta',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: data.suggestions,
        outOfScope: data.outOfScope,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setServiceStatus('ok');
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          'Error de conexion con el microservicio de Chat IA (puerto 3003).\n' +
          'Asegurate de que el microservicio este iniciado ejecutando npm start en microservices/chat-ia-node.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setServiceStatus('error');
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  // Determinar si el usuario empezo a escribir algo para mostrar las preguntas sugeridas
  const isTyping = inputText.trim().length > 0;

  return (
    <LinearGradient colors={['#0f172a', '#0b1329', '#030712']} style={styles.container}>
      {/* Header idéntico a las otras pantallas */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>Chat de IA</Text>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: serviceStatus === 'ok' ? '#4CAF50' : '#F44336' },
          ]}
        />
        {messages.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollArea}
          contentContainerStyle={[
            styles.scrollContent,
            messages.length === 0 && styles.emptyScrollContent,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            /* Vista inicial limpia: solo logo y texto 'En que te puedo ayudar' */
            <View style={styles.initialContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="chatbubble-ellipses-outline" size={48} color="#64ffda" />
              </View>
              <Text style={styles.initialTitle}>En que te puedo ayudar?</Text>
            </View>
          ) : (
            /* Mensajes de conversacion */
            messages.map((item) => {
              const isUser = item.role === 'user';
              return (
                <View
                  key={item.id}
                  style={[
                    styles.messageRow,
                    isUser ? styles.messageRowUser : styles.messageRowAssistant,
                  ]}
                >
                  {!isUser && (
                    <View style={styles.avatarAssistant}>
                      <Ionicons name="sparkles-outline" size={15} color="#64ffda" />
                    </View>
                  )}

                  <View style={styles.bubbleWrapper}>
                    <View
                      style={[
                        styles.bubble,
                        isUser ? styles.userBubble : styles.assistantBubble,
                      ]}
                    >
                      <Text style={[styles.bubbleText, isUser ? styles.userText : styles.assistantText]}>
                        {item.content}
                      </Text>
                      <Text style={[styles.timeText, isUser ? styles.userTime : styles.assistantTime]}>
                        {item.timestamp}
                      </Text>
                    </View>

                    {!isUser && item.suggestions && item.suggestions.length > 0 && (
                      <View style={styles.suggestionChipsBlock}>
                        <Text style={styles.suggestionTitle}>Preguntas sugeridas:</Text>
                        <View style={styles.chipsRow}>
                          {item.suggestions.map((sug, idx) => (
                            <TouchableOpacity
                              key={idx}
                              style={styles.chip}
                              onPress={() => handleSendMessage(sug)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.chipText}>{sug}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>

                  {isUser && (
                    <View style={styles.avatarUser}>
                      <Ionicons name="person-outline" size={15} color="#ffffff" />
                    </View>
                  )}
                </View>
              );
            })
          )}

          {loading && (
            <View style={[styles.messageRow, styles.messageRowAssistant]}>
              <View style={styles.avatarAssistant}>
                <Ionicons name="sparkles-outline" size={15} color="#64ffda" />
              </View>
              <View style={[styles.bubble, styles.assistantBubble, styles.loadingBubble]}>
                <ActivityIndicator size="small" color="#64ffda" />
                <Text style={styles.loadingText}>Consultando microservicios...</Text>
              </View>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Las preguntas solo aparecen despues de intentar escribir algo */}
        {isTyping && (
          <View style={styles.typingSuggestionsContainer}>
            <Text style={styles.typingSuggestionsTitle}>Preguntas que puedes hacer:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
              {SAMPLE_QUESTIONS.map((q, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.promptChip}
                  onPress={() => handleSendMessage(q)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.promptChipText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Barra inferior de entrada de texto al estilo del resto de la app */}
        <View style={[styles.inputWrapper, { paddingBottom: Math.max(insets.bottom, 12) + 65 }]}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Escribe tu consulta..."
              placeholderTextColor="#8892b0"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={400}
              editable={!loading}
              onSubmitEditing={() => handleSendMessage()}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                inputText.trim().length > 0 && !loading ? styles.sendBtnActive : styles.sendBtnDisabled,
              ]}
              disabled={inputText.trim().length === 0 || loading}
              onPress={() => handleSendMessage()}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={inputText.trim().length > 0 ? '#0f172a' : '#64748b'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 50,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 10,
    position: 'relative',
  },
  header: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  clearBtn: {
    position: 'absolute',
    right: 4,
    padding: 6,
  },
  keyboardView: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(100, 255, 218, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  initialTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-start',
    gap: 8,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  avatarAssistant: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(100, 255, 218, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  avatarUser: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  bubbleWrapper: {
    maxWidth: '80%',
  },
  bubble: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  userBubble: {
    backgroundColor: 'rgba(100, 255, 218, 0.15)',
    borderColor: 'rgba(100, 255, 218, 0.35)',
    borderTopRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderTopLeftRadius: 4,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: {
    color: '#8892b0',
    fontSize: 13,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#ffffff',
  },
  assistantText: {
    color: '#e2e8f0',
  },
  timeText: {
    fontSize: 10,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  assistantTime: {
    color: '#64748b',
  },
  suggestionChipsBlock: {
    marginTop: 8,
  },
  suggestionTitle: {
    color: '#8892b0',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: 'rgba(100, 255, 218, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    color: '#64ffda',
    fontSize: 12,
  },
  typingSuggestionsContainer: {
    marginBottom: 8,
  },
  typingSuggestionsTitle: {
    color: '#8892b0',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  horizontalChips: {
    gap: 8,
  },
  promptChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  promptChipText: {
    color: '#ccd6f6',
    fontSize: 12,
  },
  inputWrapper: {
    paddingTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    maxHeight: 90,
    paddingVertical: 6,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnActive: {
    backgroundColor: '#64ffda',
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});
