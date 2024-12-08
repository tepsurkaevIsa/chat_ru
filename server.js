const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const User = require('./models/User');
const VerificationCode = require('./models/VerificationCode');
const connectDB = require('./db');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Настройка подключения к базе данных MongoDB
connectDB();

// Настройка SMTP для отправки писем
const transporter = nodemailer.createTransport({
    host: 'smtp.mail.ru',
    port: 465,
    secure: true,
    auth: {
        user: 'in.ivn@bk.ru', // Ваша почта на Mail.ru
        pass: 'vH4TrqSF0YWnuMkNUDun' // Ваш пароль от почты (или пароль приложения)
    }
});

// Эндпоинт для регистрации
app.post('/auth/register', async (req, res) => {
    const { email, password } = req.body;

    // Проверка на существование пользователя
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).send({ message: 'Пользователь с таким email уже существует' });
    }

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, 10);

    // Создаем нового пользователя
    const user = new User({ email, passwordHash });
    await user.save();

    // Генерация кода подтверждения
    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Код истекает через 10 минут

    // Сохраняем код в базе
    const codeEntry = new VerificationCode({
        userId: user._id,
        code: verificationCode.toString(),
        expiresAt
    });
    await codeEntry.save();

    // Отправляем код на почту
    try {
        await transporter.sendMail({
            from: '"Your App" <in.ivn@bk.ru>',
            to: email,
            subject: 'Verification Code',
            text: `Ваш код подтверждения: ${verificationCode}`
        });

        res.status(200).send({ message: 'Код отправлен на почту!' });
    } catch (error) {
        console.error('Ошибка отправки письма:', error);
        res.status(500).send({ message: 'Ошибка при отправке письма.' });
    }
});

// Эндпоинт для проверки кода
app.post('/auth/verify', async (req, res) => {
    const { email, code } = req.body;

    // Находим пользователя
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).send({ message: 'Пользователь не найден' });
    }

    // Находим код подтверждения
    const verificationCode = await VerificationCode.findOne({ userId: user._id, code });
    if (!verificationCode || verificationCode.expiresAt < new Date()) {
        return res.status(400).send({ message: 'Неверный код или срок действия истек.' });
    }

    // Удаляем код после успешной проверки
    await VerificationCode.deleteOne({ _id: verificationCode._id });

    res.status(200).send({ message: 'Код подтвержден!' });
});

// Эндпоинт для логина
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).send({ message: 'Неверные учетные данные' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
        return res.status(400).send({ message: 'Неверные учетные данные' });
    }

    // Генерация JWT токена
    const token = jwt.sign({ userId: user._id }, 'secretKey', { expiresIn: '1h' });

    res.status(200).send({ message: 'Авторизация прошла успешно', token });
});

// Запуск сервера
app.listen(3000, () => {
    console.log('Сервер работает на порту 3000');
});