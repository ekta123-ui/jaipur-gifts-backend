const request = require('supertest');
const mongoose = require('mongoose');
const app = require('./server');
const User = require('./models/User');

describe('Authentication Routes', () => {
    beforeAll(async () => {
        const url = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/jaipur_gifts_test';
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(url);
        }
    });

    afterEach(async () => {
        await User.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe('POST /api/auth/register', () => {
        it('should successfully register a new user', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'securepassword',
                phone: '9812345678'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('token');
            expect(response.body.user).toHaveProperty('name', userData.name);
            expect(response.body.user).not.toHaveProperty('password');
        });

        it('should fail with invalid email format', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'John',
                    email: 'invalid-email',
                    password: 'password123'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Valid email required');
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            await User.create({
                name: 'Jane Doe',
                email: 'jane@example.com',
                password: 'password123'
            });
        });

        it('should login and return a token', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'jane@example.com',
                    password: 'password123'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
            expect(response.body.user.email).toBe('jane@example.com');
        });

        it('should update login count and timestamp on successful login', async () => {
            await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'jane@example.com',
                    password: 'password123'
                });

            const user = await User.findOne({ email: 'jane@example.com' });
            expect(user.loginCount).toBe(1);
            expect(user.lastLoginAt).toBeDefined();
        });

        it('should reject incorrect credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'jane@example.com',
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Invalid email or password.');
        });
    });
});
