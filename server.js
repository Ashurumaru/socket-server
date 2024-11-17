const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const prisma = require('@prisma/client');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
    },
});

const prismaClient = new prisma.PrismaClient();

io.on('connection', (socket) => {
    console.log('Пользователь подключён:', socket.id);

    // Присоединение к чату
    socket.on('joinChat', (chatId) => {
        socket.join(chatId);
        console.log(`Пользователь ${socket.id} присоединился к чату ${chatId}`);
    });

    // Обработка сообщений
    socket.on('sendMessage', async ({ chatId, userId, message, user }) => {
        try {
            const messageId = uuidv4();
            const sentAt = new Date();

            // Формируем объект сообщения для отправки перед сохранением
            const newMessage = {
                id: messageId,
                chatId,
                userId,
                messageText: message,
                sentAt,
                user, // Включаем информацию о пользователе
            };

            // Выполняем сохранение в базу данных и отправку сообщения параллельно
            await Promise.all([
                prismaClient.message.create({
                    data: {
                        id: messageId,
                        chatId,
                        userId,
                        messageText: message,
                        sentAt,
                    },
                }),
                // Отправка сообщения в WebSocket
                io.to(chatId).emit('newMessage', newMessage),
            ]);

            console.log(`Сообщение сохранено и отправлено в чат ${chatId}:`, newMessage);
        } catch (error) {
            console.error('Ошибка обработки сообщения:', error);
        }
    });

    // Отключение пользователя
    socket.on('disconnect', () => {
        console.log('Пользователь отключён:', socket.id);
    });
});

// Запуск сервера
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
