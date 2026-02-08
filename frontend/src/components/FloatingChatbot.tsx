import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, shadows } from '@/src/constants/theme';
import { sendToGemini, type ChatMessage } from '@/src/services/gemini';

const WELCOME_MESSAGE =
  'Hi! I\'m your Subhidha assistant. Ask me about bills, electricity, water, gas, air quality, complaints, or how to use the app.';

export default function FloatingChatbot() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: WELCOME_MESSAGE,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [visible, messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.role !== 'model' || m.id !== 'welcome')
        .map((m) => ({ role: m.role, text: m.text }));
      const reply = await sendToGemini(text, history);

      const botMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: reply,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: 'Something went wrong. Please try again.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={() => setVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="chatbubble-ellipses" size={28} color={colors.textWhite} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={() => setVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.modalOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.botAvatar}>
                  <Ionicons name="sparkles" size={22} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Subhidha Assistant</Text>
                  <Text style={styles.headerSubtitle}>Bills • Complaints • Services</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={26} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollRef}
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.bubbleWrap,
                    msg.role === 'user' ? styles.bubbleWrapUser : styles.bubbleWrapBot,
                  ]}
                >
                  {msg.role === 'model' && msg.id !== 'welcome' && (
                    <View style={styles.botAvatarSmall}>
                      <Ionicons name="sparkles" size={14} color={colors.primary} />
                    </View>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot,
                    ]}
                  >
                    <Text
                      style={[styles.bubbleText, msg.role === 'user' && styles.bubbleTextUser]}
                      selectable
                    >
                      {msg.text}
                    </Text>
                  </View>
                </View>
              ))}
              {loading && (
                <View style={[styles.bubbleWrap, styles.bubbleWrapBot]}>
                  <View style={styles.botAvatarSmall}>
                    <Ionicons name="sparkles" size={14} color={colors.primary} />
                  </View>
                  <View style={[styles.bubble, styles.bubbleBot]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Ask about bills, complaints, services..."
                placeholderTextColor={colors.textLight}
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={2000}
                editable={!loading}
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!input.trim() || loading}
              >
                <Ionicons
                  name="send"
                  size={22}
                  color={input.trim() && !loading ? colors.textWhite : colors.textLight}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.large,
    elevation: 8,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  bubbleWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  bubbleWrapUser: {
    justifyContent: 'flex-end',
  },
  bubbleWrapBot: {
    justifyContent: 'flex-start',
  },
  botAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  bubbleBot: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: colors.textWhite,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.grayLighter,
  },
});
