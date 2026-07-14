import ChatbotConversation from '../models/ChatbotConversation.js';
import APIFeatures from '../utils/apiFeatures.js';
import { generateNvidiaResponse } from '../utils/nvidiaService.js';

function fallbackResponse(message) {
  const lower = message.toLowerCase();

  if (lower.includes('price') || lower.includes('cost')) {
    return 'Current base price is ₹2,450 per sq.ft for Santoshi Enclave. Price increases in 12 days. Would you like to book a site visit?';
  }
  if (lower.includes('rera') || lower.includes('approved')) {
    return 'Yes! Santoshi Enclave is fully RERA registered (OR/06/2025/001234). All legal documents are available.';
  }
  if (lower.includes('loan') || lower.includes('emi') || lower.includes('finance')) {
    return 'We have a dedicated AI Loan Eligibility Checker. Most buyers get 75-85% financing from SBI, HDFC or Axis Bank.';
  }
  if (lower.includes('visit') || lower.includes('tour') || lower.includes('site')) {
    return 'You can book a site visit! We have slots available. Would you like me to schedule one for you?';
  }
  if (lower.includes('plot') || lower.includes('available')) {
    return 'We have plots from 1200-4000 sq.ft starting at ₹2,450/sq.ft. Available plots can be viewed on our Live Plot Map.';
  }

  return 'Thank you for your interest! Our team will get back to you shortly. Meanwhile, would you like to know about pricing, RERA status, or book a site visit?';
}

export const createMessage = async (req, res) => {
  try {
    const { sessionId, message, userInfo } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    let conversation;

    if (sessionId) {
      conversation = await ChatbotConversation.findOne({ sessionId, isActive: true });
    }

    if (!conversation) {
      conversation = await ChatbotConversation.create({
        sessionId: sessionId || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user: req.user?._id || undefined,
        messages: [],
        userInfo: userInfo || undefined,
      });
    }

    if (userInfo && !conversation.userInfo?.name) {
      conversation.userInfo = { ...conversation.userInfo?.toObject?.() || conversation.userInfo, ...userInfo };
    }

    conversation.messages.push({ role: 'user', content: message, timestamp: new Date() });

    let botReply = await generateNvidiaResponse(message, conversation.messages);

    if (!botReply) {
      botReply = fallbackResponse(message);
    }

    conversation.messages.push({ role: 'bot', content: botReply, timestamp: new Date() });

    await conversation.save();

    res.status(200).json({
      success: true,
      data: {
        sessionId: conversation.sessionId,
        userMessage: { role: 'user', content: message },
        botMessage: { role: 'bot', content: botReply },
        messages: conversation.messages,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getConversation = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?._id;

    let query = { isActive: true };

    if (sessionId) {
      query.sessionId = sessionId;
    } else if (userId) {
      query.user = userId;
    } else {
      return res.status(400).json({ success: false, message: 'Provide sessionId or authenticate' });
    }

    const conversation = await ChatbotConversation.findOne(query);

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getConversations = async (req, res) => {
  try {
    const features = new APIFeatures(ChatbotConversation.find({ isActive: true }), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const conversations = await features.query.populate('user', 'name email');

    const total = await ChatbotConversation.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      count: conversations.length,
      total,
      data: conversations,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getConversationById = async (req, res) => {
  try {
    const conversation = await ChatbotConversation.findById(req.params.id)
      .populate('user', 'name email');

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
