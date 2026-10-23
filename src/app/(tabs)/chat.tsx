import { useState, useEffect, useRef, useCallback } from 'react';
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
import Constants from 'expo-constants';

export type AIProvider = 'gemini' | 'openai' | 'deepseek';
export type TimeoutOption = 20 | 40 | 80 | 160;

export interface ProviderConfig {
  id: AIProvider;
  name: string;
  shortName: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export const AI_PROVIDERS: ProviderConfig[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    shortName: 'Gemini',
    icon: 'sparkles',
    color: '#64ffda',
    bgColor: 'rgba(100, 255, 218, 0.12)',
    borderColor: 'rgba(100, 255, 218, 0.35)',
    description: 'Flash Latest',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    shortName: 'OpenAI',
    icon: 'hardware-chip-outline',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    description: 'GPT-4o Mini',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    shortName: 'DeepSeek',
    icon: 'flash-outline',
    color: '#38bdf8',
    bgColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
    description: 'DeepSeek Chat',
  },
];

export const TIMEOUT_OPTIONS: TimeoutOption[] = [20, 40, 80, 160];

function getChatEndpoints(): string[] {
  const endpoints: string[] = [];
  try {
    const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost') {
        endpoints.push(`http://${ip}:3003`);
      }
    }
  } catch {}

  // IP local de la maquina en la red Wi-Fi
  endpoints.push('http://172.24.105.23:3003');

  if (Platform.OS === 'android') {
    endpoints.push('http://10.0.2.2:3003');
  }
  endpoints.push('http://localhost:3003');
  endpoints.push('http://127.0.0.1:3003');

  return endpoints.filter((val, idx, arr) => arr.indexOf(val) === idx);
}

let activeChatBase = getChatEndpoints()[0];

async function fetchChatEndpoint(path: string, options?: RequestInit): Promise<Response> {
  const candidates = [activeChatBase, ...getChatEndpoints().filter((e) => e !== activeChatBase)];
  let lastError: any = null;

  for (const base of candidates) {
    if (options?.signal?.aborted) {
      const abortErr = new Error('Operacion cancelada por tiempo de espera agotado');
      abortErr.name = 'AbortError';
      throw abortErr;
    }

    try {
      const res = await fetch(`${base}${path}`, options);
      activeChatBase = base;
      return res;
    } catch (err: any) {
      lastError = err;
      if (options?.signal?.aborted || err?.name === 'AbortError') {
        throw err;
      }
    }
  }
  throw lastError || new Error('No se pudo establecer conexion con el microservicio de chat');
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestions?: string[];
  outOfScope?: boolean;
  provider?: string;
  model?: string;
  timeoutSeconds?: number;
  isTimeoutError?: boolean;
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

  // Parametrizacion solicitada: Proveedor de IA y Tiempo de espera (20, 40, 80, 160 s)
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini');
  const [selectedTimeout, setSelectedTimeout] = useState<TimeoutOption>(40);
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(true);

  const scrollViewRef = useRef<ScrollView>(null);

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetchChatEndpoint('/health');
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

    // AbortController con el timeout parametrizado (20, 40, 80, 160 segundos)
    const controller = new AbortController();
    const timeoutMs = selectedTimeout * 1000;
    const timeoutTimer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetchChatEndpoint('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          provider: selectedProvider,
          timeoutSeconds: selectedTimeout,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutTimer);

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errorContent =
          (data && (data.reply || data.error)) || `Error del servidor (${res.status})`;
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: errorContent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: selectedProvider,
          timeoutSeconds: selectedTimeout,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setServiceStatus('error');
        return;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data?.reply || 'Sin respuesta',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: data?.suggestions,
        outOfScope: data?.outOfScope,
        provider: data?.provider || selectedProvider,
        model: data?.model,
        timeoutSeconds: selectedTimeout,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setServiceStatus('ok');
    } catch (err: any) {
      clearTimeout(timeoutTimer);

      const isTimeout =
        err?.name === 'AbortError' ||
        controller.signal.aborted ||
        (err?.message && err.message.toLowerCase().includes('timeout'));

      let errorContent = '';
      if (isTimeout) {
        errorContent =
          `Tiempo de espera agotado (${selectedTimeout} segundos).\n\n` +
          `El servicio no logro responder dentro del tiempo limite configurado. Puedes seleccionar un tiempo mayor (40s, 80s o 160s) en la barra superior e intentar de nuevo.`;
      } else {
        errorContent =
          'Error de conexion con el microservicio de Chat IA (puerto 3003).\n' +
          'Asegurate de que el microservicio este iniciado ejecutando npm start en microservices/chat-ia-node.';
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: selectedProvider,
        timeoutSeconds: selectedTimeout,
        isTimeoutError: isTimeout,
      };
      setMessages((prev) => [...prev, errorMessage]);
      setServiceStatus('error');
    } finally {
      clearTimeout(timeoutTimer);
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  const isTyping = inputText.trim().length > 0;
  const currentProviderObj = AI_PROVIDERS.find((p) => p.id === selectedProvider) || AI_PROVIDERS[0];

  return (
    <LinearGradient colors={['#0f172a', '#0b1329', '#030712']} style={styles.container}>
      {/* Header principal */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithStatus}>
          <Text style={styles.header}>Chat de IA</Text>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: serviceStatus === 'ok' ? '#4CAF50' : '#F44336' },
            ]}
          />
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconBtn, showConfigPanel && styles.iconBtnActive]}
            onPress={() => setShowConfigPanel((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showConfigPanel ? 'options' : 'options-outline'}
              size={19}
              color={showConfigPanel ? '#64ffda' : '#94a3b8'}
            />
          </TouchableOpacity>

          {messages.length > 0 && (
            <TouchableOpacity style={styles.iconBtn} onPress={handleClear} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={19} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Barra o panel de Parametrizacion de IA y Timeout */}
      {showConfigPanel ? (
        <View style={styles.configContainer}>
          {/* Seccion 1: Selector de Servicio de Inteligencia Artificial */}
          <View style={styles.configSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="hardware-chip-outline" size={14} color="#64ffda" />
              <Text style={styles.configSectionTitle}>Servicio de Inteligencia Artificial</Text>
            </View>
            <View style={styles.providerGrid}>
              {AI_PROVIDERS.map((prov) => {
                const isSelected = selectedProvider === prov.id;
                return (
                  <TouchableOpacity
                    key={prov.id}
                    style={[
                      styles.providerCard,
                      isSelected && {
                        borderColor: prov.color,
                        backgroundColor: prov.bgColor,
                      },
                    ]}
                    onPress={() => setSelectedProvider(prov.id)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.providerCardTop}>
                      <Ionicons
                        name={prov.icon}
                        size={15}
                        color={isSelected ? prov.color : '#94a3b8'}
                      />
                      <Text
                        style={[
                          styles.providerCardTitle,
                          isSelected && { color: '#ffffff', fontWeight: 'bold' },
                        ]}
                      >
                        {prov.shortName}
                      </Text>
                    </View>
                    <Text style={styles.providerCardSub}>{prov.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Seccion 2: Selector de Tiempo de Espera (20, 40, 80, 160 segundos) */}
          <View style={styles.configSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="timer-outline" size={14} color="#64ffda" />
              <Text style={styles.configSectionTitle}>Tiempo de Espera del Backend</Text>
              <Text style={styles.configSectionBadge}>{selectedTimeout} seg</Text>
            </View>
            <View style={styles.timeoutRow}>
              {TIMEOUT_OPTIONS.map((seconds) => {
                const isSelected = selectedTimeout === seconds;
                return (
                  <TouchableOpacity
                    key={seconds}
                    style={[styles.timeoutPill, isSelected && styles.timeoutPillActive]}
                    onPress={() => setSelectedTimeout(seconds)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name="time-outline"
                      size={13}
                      color={isSelected ? '#0f172a' : '#94a3b8'}
                    />
                    <Text
                      style={[
                        styles.timeoutPillText,
                        isSelected && styles.timeoutPillTextActive,
                      ]}
                    >
                      {seconds}s
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      ) : (
        /* Modo compacto / Resumen de configuracion */
        <TouchableOpacity
          style={styles.compactConfigBar}
          onPress={() => setShowConfigPanel(true)}
          activeOpacity={0.8}
        >
          <View style={styles.compactConfigLeft}>
            <View
              style={[
                styles.compactBadge,
                { backgroundColor: currentProviderObj.bgColor, borderColor: currentProviderObj.borderColor },
              ]}
            >
              <Ionicons name={currentProviderObj.icon} size={12} color={currentProviderObj.color} />
              <Text style={[styles.compactBadgeText, { color: currentProviderObj.color }]}>
                {currentProviderObj.shortName}
              </Text>
            </View>

            <View style={styles.compactBadgeTimeout}>
              <Ionicons name="timer-outline" size={12} color="#64ffda" />
              <Text style={styles.compactBadgeTimeoutText}>{selectedTimeout}s</Text>
            </View>
          </View>

          <View style={styles.compactConfigRight}>
            <Text style={styles.compactConfigHint}>Cambiar</Text>
            <Ionicons name="chevron-down" size={14} color="#64ffda" />
          </View>
        </TouchableOpacity>
      )}

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
            /* Vista inicial limpia */
            <View style={styles.initialContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name={currentProviderObj.icon} size={46} color={currentProviderObj.color} />
              </View>
              <Text style={styles.initialTitle}>En que te puedo ayudar hoy?</Text>
              <Text style={styles.initialSub}>
                Motor activo: <Text style={{ color: currentProviderObj.color, fontWeight: 'bold' }}>{currentProviderObj.name}</Text>
                {'  '}|{'  '}Timeout: <Text style={{ color: '#64ffda', fontWeight: 'bold' }}>{selectedTimeout}s</Text>
              </Text>

              {/* Botones de sugerencias iniciales */}
              <View style={styles.quickPromptsGrid}>
                {SAMPLE_QUESTIONS.map((q, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.initialPromptCard}
                    onPress={() => handleSendMessage(q)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chatbubble-outline" size={15} color="#64ffda" style={{ marginTop: 2 }} />
                    <Text style={styles.initialPromptText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            /* Mensajes de conversacion */
            messages.map((item) => {
              const isUser = item.role === 'user';
              const provConfig = AI_PROVIDERS.find(
                (p) => p.id === (item.provider || selectedProvider)
              ) || currentProviderObj;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.messageRow,
                    isUser ? styles.messageRowUser : styles.messageRowAssistant,
                  ]}
                >
                  {!isUser && (
                    <View
                      style={[
                        styles.avatarAssistant,
                        { borderColor: provConfig.borderColor, backgroundColor: provConfig.bgColor },
                      ]}
                    >
                      <Ionicons name={provConfig.icon} size={15} color={provConfig.color} />
                    </View>
                  )}

                  <View style={styles.bubbleWrapper}>
                    <View
                      style={[
                        styles.bubble,
                        isUser ? styles.userBubble : styles.assistantBubble,
                        item.isTimeoutError && styles.timeoutErrorBubble,
                      ]}
                    >
                      {/* Insignia del proveedor o filtro oficial en respuestas del asistente */}
                      {!isUser && (
                        <View style={styles.providerBadgeRow}>
                          {item.outOfScope || item.provider === 'validador_microservicio' ? (
                            <View
                              style={[
                                styles.miniProviderBadge,
                                { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)' },
                              ]}
                            >
                              <Ionicons name="shield-checkmark-outline" size={11} color="#f87171" />
                              <Text style={[styles.miniProviderText, { color: '#f87171' }]}>
                                Microservicios (Validacion)
                              </Text>
                            </View>
                          ) : (
                            <View
                              style={[
                                styles.miniProviderBadge,
                                { backgroundColor: provConfig.bgColor, borderColor: provConfig.borderColor },
                              ]}
                            >
                              <Ionicons name={provConfig.icon} size={11} color={provConfig.color} />
                              <Text style={[styles.miniProviderText, { color: provConfig.color }]}>
                                {provConfig.shortName}
                              </Text>
                            </View>
                          )}
                          {item.timeoutSeconds && (
                            <View style={styles.miniTimeoutBadge}>
                              <Ionicons name="timer-outline" size={11} color="#94a3b8" />
                              <Text style={styles.miniTimeoutText}>{item.timeoutSeconds}s max</Text>
                            </View>
                          )}
                        </View>
                      )}

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
              <View
                style={[
                  styles.avatarAssistant,
                  { borderColor: currentProviderObj.borderColor, backgroundColor: currentProviderObj.bgColor },
                ]}
              >
                <Ionicons name={currentProviderObj.icon} size={15} color={currentProviderObj.color} />
              </View>
              <View style={[styles.bubble, styles.assistantBubble, styles.loadingBubble]}>
                <ActivityIndicator size="small" color={currentProviderObj.color} />
                <View>
                  <Text style={styles.loadingText}>
                    Consultando con {currentProviderObj.name}...
                  </Text>
                  <Text style={styles.loadingSub}>
                    Tiempo maximo configurado: {selectedTimeout}s
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Sugerencias contextuales mientras escribe */}
        {isTyping && (
          <View style={styles.typingSuggestionsContainer}>
            <Text style={styles.typingSuggestionsTitle}>Preguntas recomendadas:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalChips}
            >
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

        {/* Barra inferior de entrada de texto */}
        <View style={[styles.inputWrapper, { paddingBottom: Math.max(insets.bottom, 12) + 65 }]}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder={`Pregunta a ${currentProviderObj.shortName}...`}
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
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleWithStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  header: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  iconBtnActive: {
    backgroundColor: 'rgba(100, 255, 218, 0.15)',
    borderColor: 'rgba(100, 255, 218, 0.4)',
  },

  /* Panel de Parametrizacion */
  configContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.25)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  configSection: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  configSectionTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  configSectionBadge: {
    color: '#64ffda',
    fontSize: 11,
    fontWeight: '700',
  },
  providerGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  providerCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  providerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  providerCardTitle: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  providerCardSub: {
    color: '#64748b',
    fontSize: 9,
    marginTop: 2,
  },
  timeoutRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeoutPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    paddingVertical: 7,
  },
  timeoutPillActive: {
    backgroundColor: '#64ffda',
    borderColor: '#64ffda',
  },
  timeoutPillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  timeoutPillTextActive: {
    color: '#0f172a',
    fontWeight: 'bold',
  },

  /* Barra compacta de configuracion */
  compactConfigBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  compactConfigLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  compactBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  compactBadgeTimeout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(100, 255, 218, 0.1)',
    borderColor: 'rgba(100, 255, 218, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  compactBadgeTimeoutText: {
    color: '#64ffda',
    fontSize: 11,
    fontWeight: '700',
  },
  compactConfigRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactConfigHint: {
    color: '#64ffda',
    fontSize: 11,
    fontWeight: '600',
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
    paddingVertical: 20,
    width: '100%',
  },
  logoCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(100, 255, 218, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  initialTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  initialSub: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  quickPromptsGrid: {
    width: '100%',
    gap: 8,
    marginTop: 10,
  },
  initialPromptCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  initialPromptText: {
    color: '#cbd5e1',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
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
    borderWidth: 1,
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
    maxWidth: '82%',
  },
  bubble: {
    borderRadius: 14,
    padding: 12,
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
  timeoutErrorBubble: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  providerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  miniProviderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  miniProviderText: {
    fontSize: 10,
    fontWeight: '700',
  },
  miniTimeoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  miniTimeoutText: {
    color: '#64748b',
    fontSize: 9,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  loadingText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingSub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
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
