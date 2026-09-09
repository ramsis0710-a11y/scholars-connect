import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { getQuestionById } from '../api/questions';
import { useChat } from '../hooks/useChat';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import { Loader, Button } from '../components/common';
import { colors } from '../theme/colors';

const ChatScreen = ({ route }) => {
  const { questionId } = route.params;
  const { user } = useAuth();
  const { messages, loading, sending, loadMessages, addMessage } = useChat(questionId);
  const { socket, joinQuestionRoom, leaveQuestionRoom } = useSocket();
  const [inputText, setInputText] = useState('');
  const [question, setQuestion] = useState(null);

  useEffect(() => {
    loadQuestion();
    joinQuestionRoom(questionId);

    const handleNewMessage = (message) => {
      addMessage(message);
    };

    socket?.on('message:new', handleNewMessage);

    return () => {
      leaveQuestionRoom(questionId);
      socket?.off('message:new', handleNewMessage);
    };
  }, [questionId, socket]);

  const loadQuestion = async () => {
    try {
      const data = await getQuestionById(questionId);
      setQuestion(data);
    } catch (err) {
      console.log('Failed to load question', err);
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    socket?.emit('chat:send', {
      questionId,
      content: inputText.trim()
    });
    setInputText('');
  };

  const messageUserIsMe = (message) => {
    const scholarId = question?.scholar?.id;
    return message.senderId === user?.id;
  };

  const renderMessage = ({ item }) => {
    const isMe = messageUserIsMe(item);
    return (
      <View style={[styles.messageRow, isMe ? styles.myMessage : styles.theirMessage]}>
        <View
          style={[
            styles.messageBubble,
            isMe ? styles.myBubble : styles.theirBubble
          ]}
        >
          <Text style={[
            styles.messageText,
            isMe ? styles.myMessageText : styles.theirMessageText
          ]}>
            {item.content}
          </Text>
          <Text style={styles.messageTime}>
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      {question && (
        <View style={styles.questionHeader}>
          <Text style={styles.questionTitle} numberOfLines={1}>
            {question.title}
          </Text>
          <TouchableOpacity>
            <Text style={styles.videoCall}>📹</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Démarrez la conversation avec le scholar
              </Text>
            </View>
          ) : null
        }
      />

      {loading && <Loader size="small" />}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Votre message..."
          placeholderTextColor={colors.textSecondary}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendButtonText}>Envoyer</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  questionHeader: {
    backgroundColor: colors.surface,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 16
  },
  videoCall: {
    fontSize: 24
  },
  messageList: {
    flex: 1
  },
  messageListContent: {
    padding: 16,
    flexGrow: 1
  },
  messageRow: {
    marginBottom: 12,
    flexDirection: 'row'
  },
  myMessage: {
    justifyContent: 'flex-end'
  },
  theirMessage: {
    justifyContent: 'flex-start'
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16
  },
  myBubble: {
    backgroundColor: colors.primary
  },
  theirBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20
  },
  myMessageText: {
    color: colors.white
  },
  theirMessageText: {
    color: colors.textPrimary
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
    alignSelf: 'flex-end'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: {
    color: colors.textSecondary
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'flex-end'
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    maxHeight: 100,
    marginRight: 12
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center'
  },
  sendButtonDisabled: {
    opacity: 0.5
  },
  sendButtonText: {
    color: colors.white,
    fontWeight: '600'
  }
});

export default ChatScreen;
