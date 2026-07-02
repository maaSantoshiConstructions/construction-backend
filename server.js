import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';
import { swaggerSpec, swaggerUiExpress as swaggerUi } from './utils/swagger.js';

dotenv.config();

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import plotRoutes from './routes/plots.js';
import bookingRoutes from './routes/bookings.js';
import customerRoutes from './routes/customers.js';
import paymentRoutes from './routes/payments.js';
import documentRoutes from './routes/documents.js';
import leadRoutes from './routes/leads.js';
import siteVisitRoutes from './routes/siteVisits.js';
import constructionUpdateRoutes from './routes/constructionUpdates.js';
import channelPartnerRoutes from './routes/channelPartners.js';
import referralRoutes from './routes/referrals.js';
import reviewRoutes from './routes/reviews.js';
import loanApplicationRoutes from './routes/loanApplications.js';
import supportTicketRoutes from './routes/supportTickets.js';
import notificationRoutes from './routes/notifications.js';
import blogRoutes from './routes/blogs.js';
import galleryRoutes from './routes/gallery.js';
import faqRoutes from './routes/faqs.js';
import settingRoutes from './routes/settings.js';
import aiRecommendationRoutes from './routes/aiRecommendations.js';
import propertyComparisonRoutes from './routes/propertyComparisons.js';
import dashboardRoutes from './routes/dashboard.js';
import chatbotRoutes from './routes/chatbot.js';
import propertyValuationRoutes from './routes/propertyValuations.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || '*', methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.set('io', io);

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/plots', plotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/site-visits', siteVisitRoutes);
app.use('/api/construction-updates', constructionUpdateRoutes);
app.use('/api/channel-partners', channelPartnerRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/loan-applications', loanApplicationRoutes);
app.use('/api/support-tickets', supportTicketRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/ai-recommendations', aiRecommendationRoutes);
app.use('/api/property-comparisons', propertyComparisonRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/property-valuations', propertyValuationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5002;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
  });
}).catch((err) => {
  console.error('Failed to start server:', err);
});

export default app;
