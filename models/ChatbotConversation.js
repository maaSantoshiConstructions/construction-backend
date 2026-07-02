import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const MessageSchema = new Schema(
  {
    role: { type: String, enum: ['user', 'bot'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ChatbotConversationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    sessionId: { type: String },
    messages: [MessageSchema],
    userInfo: {
      name: { type: String },
      phone: { type: String },
      email: { type: String },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ChatbotConversationSchema.index({ sessionId: 1 });
ChatbotConversationSchema.index({ user: 1 });

const ChatbotConversation = model('ChatbotConversation', ChatbotConversationSchema);
export default ChatbotConversation;
