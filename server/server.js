const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./config/db');
const app = express();
const PORT = process.env.PORT || 5001;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { OAuth2Client } = require('google-auth-library');
const multer = require('multer');

const JWT_SECRET = process.env.JWT_SECRET || 'shophub_secret_key_2026';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mP7fBwZlZ50mE1',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'T3ST_sEcReT_h3rE_v1'
});

// Multer Configuration for Product Images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = path.join(__dirname, '../assets/products');
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- Middlewares ---

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Authentication required' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid or expired token' });
        req.user = user;
        next();
    });
};

// Admin Check Middleware
const adminOnly = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied: Admin only' });
    }
};

// Custom CORS & Private Network Access (PNA) middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // Handle Chrome's Private Network Access preflight
    if (req.headers['access-control-request-private-network']) {
        res.header('Access-Control-Allow-Private-Network', 'true');
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Serve static assets
app.use('/assets', express.static(path.join(__dirname, '../assets')));
app.use('/products', express.static(path.join(__dirname, '../assets/products')));

// Custom route to serve images with better error handling
app.get('/image/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, '../assets/products', filename);
    res.sendFile(filepath, (err) => {
        if (err) {
            res.status(404).send('Image not found');
        }
    });
});

// --- Routes ---

// 1. Products
app.get('/api/products', async (req, res) => {
    const { search, category } = req.query;
    try {
        let query = 'SELECT * FROM products';
        let params = [];

        if (search || category) {
            query += ' WHERE';
            if (search) {
                query += ' (title LIKE ? OR description LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }
            if (category) {
                if (search) query += ' AND';
                query += ' category = ?';
                params.push(category);
            }
        }

        const [rows] = await db.getDb().query(query, params);
        // Convert price from string (MySQL DECIMAL) to number and add isLocal flag
        const products = rows.map(p => ({ ...p, price: parseFloat(p.price), isLocal: true }));
        res.json(products);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

app.post('/api/products', upload.single('imageFile'), authenticateToken, adminOnly, async (req, res) => {
    console.log('--- POST /api/products ---');
    console.log('Headers:', req.headers['content-type']);
    console.log('Body:', req.body);
    console.log('File:', req.file);
    
    let { title, price, category, description, image, stock_quantity } = req.body;
    
    // If a file was uploaded, use its filename
    if (req.file) {
        image = req.file.filename;
    }

    if (!title) {
        return res.status(400).json({ error: 'Validation Error', message: 'Product title is required' });
    }

    try {
        const [result] = await db.getDb().query(
            'INSERT INTO products (title, price, category, description, image, stock_quantity) VALUES (?, ?, ?, ?, ?, ?)',
            [title, price || 0, category || 'Uncategorized', description || '', image || '', stock_quantity || 0]
        );
        res.status(201).json({
            id: result.insertId,
            title, 
            price: parseFloat(price || 0), 
            category, 
            description, 
            image,
            stock_quantity: parseInt(stock_quantity || 0),
            isLocal: true
        });
    } catch (err) {
        console.error('Database Error:', err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

app.put('/api/products/:id', upload.single('imageFile'), authenticateToken, adminOnly, async (req, res) => {
    console.log('--- PUT /api/products ---');
    console.log('Body:', req.body);
    console.log('File:', req.file);
    
    const { id } = req.params;
    let { title, price, category, description, image, stock_quantity } = req.body;

    // If a new file was uploaded, use its filename
    if (req.file) {
        image = req.file.filename;
    }

    try {
        await db.getDb().query(
            'UPDATE products SET title=?, price=?, category=?, description=?, image=?, stock_quantity=? WHERE id=?',
            [title, price || 0, category || '', description || '', image || '', stock_quantity || 0, id]
        );
        res.json({
            id,
            title, 
            price: parseFloat(price || 0), 
            category, 
            description, 
            image,
            stock_quantity: parseInt(stock_quantity || 0),
            isLocal: true
        });
    } catch (err) {
        console.error('Database Error:', err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

app.delete('/api/products/:id', authenticateToken, adminOnly, async (req, res) => {
    const { id } = req.params;
    try {
        await db.getDb().query('DELETE FROM products WHERE id = ?', [id]);
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// 2. Authentication (Users)
app.post('/api/auth/register', async (req, res) => {
    const { email, password, name } = req.body;
    try {
        const [existing] = await db.getDb().query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ message: 'User already exists' });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.getDb().query(
            'INSERT INTO users (name, email, password, isAdmin) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, false]
        );

        const jwtPayload = { id: result.insertId, name, email, isAdmin: false };
        const token = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ ...jwtPayload, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await db.getDb().query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length > 0) {
            const user = users[0];

            // Check password (supports both hashed and plain for migration if needed, but here we enforce bcrypt)
            const isMatch = await bcrypt.compare(password, user.password).catch(() => password === user.password);

            if (isMatch) {
                const jwtPayload = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    isAdmin: !!user.isAdmin
                };
                const token = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: '7d' });

                const userData = {
                    ...jwtPayload,
                    profileImage: user.profile_image,
                    phone: user.phone || '',
                    location: user.location || ''
                };
                res.json({ ...userData, token });
            } else {
                res.status(401).json({ message: 'Invalid credentials' });
            }
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

app.post('/api/auth/google', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, name, picture } = payload;

        let [users] = await db.getDb().query('SELECT * FROM users WHERE email = ?', [email]);
        let user;

        if (users.length === 0) {
            const randomPassword = crypto.randomBytes(16).toString('hex');
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            
            const [result] = await db.getDb().query(
                'INSERT INTO users (name, email, password, isAdmin, profile_image) VALUES (?, ?, ?, ?, ?)',
                [name, email, hashedPassword, false, picture]
            );
            
            const [newUsers] = await db.getDb().query('SELECT * FROM users WHERE id = ?', [result.insertId]);
            user = newUsers[0];
        } else {
            user = users[0];
            if (!user.profile_image && picture) {
                await db.getDb().query('UPDATE users SET profile_image = ? WHERE id = ?', [picture, user.id]);
                user.profile_image = picture;
            }
        }

        const jwtPayload = {
            id: user.id,
            name: user.name,
            email: user.email,
            isAdmin: !!user.isAdmin
        };
        const jwtToken = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: '7d' });

        const userData = {
            ...jwtPayload,
            profileImage: user.profile_image,
            phone: user.phone || '',
            location: user.location || ''
        };
        res.json({ ...userData, token: jwtToken });
    } catch (err) {
        console.error('Google Auth Error:', err);
        res.status(401).json({ message: 'Invalid Google token' });
    }
});

app.put('/api/auth/profile/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, profileImage, phone, location } = req.body;

    // Ensure user can only update their own profile
    if (parseInt(id) !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    try {
        const [rows] = await db.getDb().query('SELECT profile_image, profile_pic_updates FROM users WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });

        let currentImg = rows[0].profile_image;
        let updatesCount = rows[0].profile_pic_updates || 0;
        let finalImage = profileImage;

        // Check if image changed (not undefined, and different from current)
        if (profileImage !== undefined && profileImage !== currentImg) {
            if (updatesCount >= 2) {
                return res.status(400).json({ error: 'UploadLimit', message: 'You can only change your profile picture once after setting it the first time.' });
            }
            updatesCount++;
        } else {
            finalImage = currentImg; // No change in image
        }

        await db.getDb().query(
            'UPDATE users SET name = ?, profile_image = ?, profile_pic_updates = ?, phone = ?, location = ? WHERE id = ?',
            [name, finalImage, updatesCount, phone, location, id]
        );

        // Return updated user data
        const [updated] = await db.getDb().query('SELECT id, name, email, isAdmin, profile_image, phone, location FROM users WHERE id = ?', [id]);
        const user = updated[0];
        const jwtPayload = {
            id: user.id,
            name: user.name,
            email: user.email,
            isAdmin: !!user.isAdmin
        };
        const token = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: '7d' });

        const userData = {
            ...jwtPayload,
            profileImage: user.profile_image,
            phone: user.phone || '',
            location: user.location || ''
        };
        res.json({ ...userData, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const [users] = await db.getDb().query('SELECT id, name, email, isAdmin, profile_image, created_at FROM users');
        const safeUsers = users.map(u => ({ ...u, isAdmin: !!u.isAdmin, profileImage: u.profile_image }));
        res.json(safeUsers);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const [users] = await db.getDb().query('SELECT id, name FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });

        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 3600000); // 1 hour from now

        await db.getDb().query('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?', [token, expiry, email]);

        const resetLink = `http://localhost:4200/reset-password?token=${token}`;

        const mailOptions = {
            from: `"ShopHub Security" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #2563eb;">Reset Your Password</h2>
                    <p>Hi ${users[0].name},</p>
                    <p>We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="background: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
                    </div>
                    <p style="font-size: 12px; color: #6b7280;">If you didn't request this, you can safely ignore this email.</p>
                </div>
            `
        };

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            await transporter.sendMail(mailOptions);
        } else {
            console.log('--- RESET LINK (EMAIL NOT CONFIGURED) ---');
            console.log(resetLink);
            console.log('-----------------------------------------');
        }

        res.json({ message: 'Password reset link sent to your email' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const [users] = await db.getDb().query('SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()', [token]);
        if (users.length === 0) return res.status(400).json({ message: 'Invalid or expired token' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.getDb().query('UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?', [hashedPassword, users[0].id]);

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 3. Payment
app.post('/api/payment/create-order', authenticateToken, async (req, res) => {
    try {
        const { amount, currency } = req.body;
        const options = {
            amount: Math.round(amount * 100), // amount in smallest currency unit 
            // The frontend usually sends INR or USD depending on integration, lets default to USD if not passed
            currency: currency || "USD",
            receipt: `receipt_${crypto.randomBytes(10).toString("hex")}`
        };
        const order = await razorpayInstance.orders.create(options);
        // We also need to send back the RAZORPAY_KEY_ID so the frontend doesn't need to hardcode it or make a separate request
        res.json({ ...order, key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mP7fBwZlZ50mE1' });
    } catch (err) {
        console.error("Razorpay Error:", err);
        res.status(500).json({ error: 'Failed to create payment order', details: err.message });
    }
});

app.post('/api/payment/verify-payment', authenticateToken, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const key_secret = process.env.RAZORPAY_KEY_SECRET || 'T3ST_sEcReT_h3rE_v1';

        const generated_signature = crypto
            .createHmac('sha256', key_secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        if (generated_signature === razorpay_signature) {
            res.json({ success: true, message: "Payment verified successfully" });
        } else {
            res.status(400).json({ success: false, message: "Payment verification failed" });
        }
    } catch (err) {
        console.error("Verification Error:", err);
        res.status(500).json({ error: 'Payment verification error', details: err.message });
    }
});

// 4. Orders
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        let query = 'SELECT * FROM orders';
        let params = [];

        // If not admin, only show user's own orders
        if (!req.user.isAdmin) {
            query += ' WHERE user_id = ?';
            params.push(req.user.id);
        }

        query += ' ORDER BY date DESC';

        const [orders] = await db.getDb().query(query, params);

        // Fetch all items
        // Note: For production, fetching all items is inefficient. Better to fetch items for displayed orders only.
        // But for MVP simplicity matching previous JSON logic:
        const [items] = await db.getDb().query('SELECT * FROM order_items');

        // Combine
        const combinedOrders = orders.map(order => {
            const orderItems = items.filter(item => item.order_id === order.id).map(item => ({
                id: item.id,
                productId: item.product_id,
                title: item.title,
                price: parseFloat(item.price),
                quantity: item.quantity,
                image: item.image
            }));

            return {
                id: order.id,
                userId: order.user_id,
                total: parseFloat(order.total),
                status: order.status,
                date: order.date,
                shippingAddress: {
                    name: order.shipping_name,
                    address: order.shipping_address,
                    city: order.shipping_city,
                    zipCode: order.shipping_zip,
                    phone: order.shipping_phone
                },
                items: orderItems,
                paymentMethod: order.payment_method,
                transactionId: order.transaction_id || ''
            };
        });

        res.json(combinedOrders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

app.post('/api/orders', authenticateToken, async (req, res) => {
    const { userId, items, total, shippingAddress, paymentMethod, status, transactionId } = req.body;

    try {
        const [result] = await db.getDb().query(
            `INSERT INTO orders (user_id, total, status, shipping_name, shipping_address, shipping_city, shipping_zip, shipping_phone, payment_method, transaction_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, total, status || 'Processing', shippingAddress.name, shippingAddress.address, shippingAddress.city, shippingAddress.zipCode, shippingAddress.phone || null, paymentMethod, transactionId || null]
        );

        const orderId = result.insertId;

        if (items && items.length > 0) {
            // Bulk insert items
            const values = items.map(item => [orderId, item.id || null, item.title, item.price, item.quantity, item.image]);

            // Note: If values is empty, this query would fail, but we checked length > 0
            await db.getDb().query(
                `INSERT INTO order_items (order_id, product_id, title, price, quantity, image) VALUES ?`,
                [values]
            );
        }

        res.status(201).json({ id: orderId, message: 'Order placed successfully' });

        // Send confirmation email in background
        const userEmail = shippingAddress.email || (await db.getDb().query('SELECT email FROM users WHERE id = ?', [userId]))[0][0]?.email;
        if (userEmail) {
            sendOrderEmail({ id: orderId, total, shippingAddress, paymentMethod }, userEmail);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error', details: err.message });
        console.log(err.message)
    }
});

app.put('/api/orders/:id/status', authenticateToken, adminOnly, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.getDb().query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
        res.json({ id, status });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/orders/:id', authenticateToken, adminOnly, async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    try {
        if (reason) {
            const [orders] = await db.getDb().query('SELECT * FROM orders WHERE id = ?', [id]);
            if (orders.length > 0) {
                const order = orders[0];
                
                await db.getDb().query('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [
                    order.user_id, 
                    `Your order #${order.id} for $${order.total} was cancelled by Admin. Reason: ${reason}`
                ]);

                const [users] = await db.getDb().query('SELECT email FROM users WHERE id = ?', [order.user_id]);
                const userEmail = users[0]?.email;
                if (userEmail) {
                    await sendCancellationEmail(order, reason, userEmail);
                }
            }
        }
        await db.getDb().query('DELETE FROM orders WHERE id = ?', [id]);
        res.json({ message: 'Order deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const [notifications] = await db.getDb().query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', 
            [req.user.id]
        );
        res.json(notifications);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

const sendCancellationEmail = async (order, reason, userEmail) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

    try {
        const mailOptions = {
            from: `"ShopHub" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: `Order Cancelled - #${order.id}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                    <h2 style="color: #dc2626;">Order Cancelled</h2>
                    <p>Hi ${order.shipping_name || 'Customer'},</p>
                    <p>We are writing to inform you that your order <strong>#${order.id}</strong> has been cancelled.</p>
                    
                    <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fca5a5;">
                        <h3 style="margin-top: 0; color: #b91c1c;">Cancellation Reason</h3>
                        <p style="color: #991b1b;">${reason}</p>
                    </div>

                    <p>If you have any questions or concerns, please reply to this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #6b7280;">ShopHub Inc. | Quality Products, Delivered.</p>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        console.log(`[CANCELLATION EMAIL] Sent to ${userEmail} for Order #${order.id}`);
    } catch (err) {
        console.error('Email error:', err);
    }
};



// 4. Slides
app.get('/api/slides', async (req, res) => {
    try {
        const [slides] = await db.getDb().query('SELECT * FROM slides ORDER BY created_at DESC');
        res.json(slides);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

app.post('/api/slides', upload.single('imageFile'), authenticateToken, adminOnly, async (req, res) => {
    let { title, subtitle, image } = req.body;
    if (req.file) image = req.file.filename;

    try {
        const [result] = await db.getDb().query(
            'INSERT INTO slides (title, subtitle, image) VALUES (?, ?, ?)',
            [title, subtitle, image]
        );
        res.status(201).json({ id: result.insertId, title, subtitle, image });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

app.put('/api/slides/:id', upload.single('imageFile'), authenticateToken, adminOnly, async (req, res) => {
    const { id } = req.params;
    let { title, subtitle, image } = req.body;
    if (req.file) image = req.file.filename;

    try {
        await db.getDb().query(
            'UPDATE slides SET title=?, subtitle=?, image=? WHERE id=?',
            [title, subtitle, image, id]
        );
        res.json({ id, title, subtitle, image });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

app.delete('/api/slides/:id', authenticateToken, adminOnly, async (req, res) => {
    const { id } = req.params;
    try {
        await db.getDb().query('DELETE FROM slides WHERE id = ?', [id]);
        res.json({ message: 'Slide deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// 6. Subscribers
app.post('/api/subscribers', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    try {
        await db.getDb().query('INSERT INTO subscribers (email) VALUES (?)', [email]);
        res.status(201).json({ message: 'Subscribed successfully!' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'You are already subscribed!' });
        }
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/subscribers', authenticateToken, adminOnly, async (req, res) => {
    try {
        const [rows] = await db.getDb().query('SELECT * FROM subscribers ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 7. Reviews
app.get('/api/products/:id/reviews', async (req, res) => {
    const { id } = req.params;
    try {
        const [reviews] = await db.getDb().query(
            'SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC',
            [id]
        );
        res.json(reviews);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

app.post('/api/reviews', async (req, res) => {
    const { productId, userId, userName, rating, comment } = req.body;
    try {
        // Verification: Check if user has a 'Delivered' order for this product
        const [orders] = await db.getDb().query(
            `SELECT o.id FROM orders o 
             JOIN order_items oi ON o.id = oi.order_id 
             WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'Delivered'`,
            [userId, productId]
        );

        if (orders.length === 0) {
            return res.status(403).json({
                error: 'Verification failed',
                message: 'You can only review products that have been delivered to you.'
            });
        }

        const [result] = await db.getDb().query(
            'INSERT INTO reviews (product_id, user_id, user_name, rating, comment) VALUES (?, ?, ?, ?, ?)',
            [productId, userId, userName, rating, comment]
        );
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});


// 5. Email Notifications


const sendOrderEmail = async (order, userEmail) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

    try {
        const mailOptions = {
            from: `"ShopHub" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: `Order Confirmation - #${order.id}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                    <h2 style="color: #2563eb;">Thank you for your order!</h2>
                    <p>Hi ${order.shippingAddress.name},</p>
                    <p>Your order <strong>#${order.id}</strong> has been placed successfully and is being processed.</p>
                    
                    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Order Summary</h3>
                        <p>Total Amount: <strong>\$${order.total.toFixed(2)}</strong></p>
                        <p>Payment Method: ${order.paymentMethod}</p>
                    </div>

                    <p>We'll notify you once your items have been shipped.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #6b7280;">ShopHub Inc. | Quality Products, Delivered.</p>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        console.log(`[ORDER EMAIL] Confirmation sent to ${userEmail} for Order #${order.id}`);
    } catch (err) {
        console.error('Email error:', err);
    }
};

app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;

    // Check for credentials
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('Email credentials missing in .env');
        return res.status(500).json({ error: 'Server email configuration missing' });
    }

    try {

        const mailOptions = {
            from: `"ShopHub Contact" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER, // Send to owner
            replyTo: email, // Valid email from form
            subject: `ShopHub Inquiry: ${subject}`,
            text: `You have received a new message from your website contact form.\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
        };

        await transporter.sendMail(mailOptions);
        console.log(`[CONTACT FORM] Email sent to owner from ${email}`);
        res.json({ message: 'Message sent successfully!' });

    } catch (err) {
        console.error('Email error:', err);
        res.status(500).json({ error: 'Failed to send email. Checks logs.' });
    }
});


// Start Server
const startServer = async () => {
    await db.initDB();
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
};

startServer();
