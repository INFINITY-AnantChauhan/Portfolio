const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;
// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Serve static files
app.use(express.static('.'));
// Serve the main portfolio page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
// Contact form endpoint
app.post('/send-email', async (req, res) => {
    const { name, email, message } = req.body;
    // Validate input
    if (!name || !email || !message) {
        return res.status(400).json({ 
            success: false, 
            message: 'Please fill in all fields.' 
        });
    }
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Please enter a valid email address.' 
        });
    }
    try {
        // Create a test account with Ethereal Email (for development)
        // In production, you would use your actual email credentials
        let testAccount = await nodemailer.createTestAccount();
        // Create transporter
        let transporter = nodemailer.createTransporter({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
        // Email content
        const mailOptions = {
            from: `"Portfolio Contact Form" <${testAccount.user}>`,
            to: "anantchauhan2006@gmail.com",
            subject: `New Contact Form Message from ${name}`,
            text: `
Name: ${name}
Email: ${email}
Message: ${message}
            `,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #00d4ff;">New Contact Form Message</h2>
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 10px;">
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Message:</strong></p>
                        <div style="background: white; padding: 15px; border-radius: 5px; margin-top: 10px;">
                            ${message.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                    <p style="color: #666; font-size: 12px; margin-top: 20px;">
                        This message was sent from your portfolio contact form.
                    </p>
                </div>
            `
        };
        // Send email
        let info = await transporter.sendMail(mailOptions);
        console.log("Message sent: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        res.json({ 
            success: true, 
            message: 'Message sent successfully!',
            previewUrl: nodemailer.getTestMessageUrl(info) // For development testing
        });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send message. Please try again later.' 
        });
    }
});
// Add CORS preflight handler
app.options('/save-message', cors());
// Alternative: Simple file-based message storage
app.post('/save-message', (req, res) => {
    console.log('Received save-message request:', req.body);
    console.log('Request headers:', req.headers);
    
    const { name, email, message } = req.body;
    const fs = require('fs');
    
    // Validate input
    if (!name || !email || !message) {
        console.log('Validation failed: missing fields');
        return res.status(400).json({ 
            success: false, 
            message: 'Please fill in all fields.' 
        });
    }
    const timestamp = new Date().toISOString();
    const messageData = {
        timestamp,
        name,
        email,
        message
    };
    try {
        // Read existing messages or create empty array
        let messages = [];
        if (fs.existsSync('messages.json')) {
            const fileContent = fs.readFileSync('messages.json', 'utf8');
            messages = JSON.parse(fileContent);
        }
        // Add new message
        messages.push(messageData);
        // Save to file
        fs.writeFileSync('messages.json', JSON.stringify(messages, null, 2));
        console.log('New message saved successfully:', messageData);
        res.json({ 
            success: true, 
            message: 'Message saved successfully! You will be contacted soon.' 
        });
    } catch (error) {
        console.error('Error saving message:', error);
        console.error('Error stack:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to save message. Please try again later.' 
        });
    }
});
// Endpoint to view saved messages (for your reference)
app.get('/messages', (req, res) => {
    const fs = require('fs');
    
    try {
        if (fs.existsSync('messages.json')) {
            const fileContent = fs.readFileSync('messages.json', 'utf8');
            const messages = JSON.parse(fileContent);
            res.json({ success: true, messages });
        } else {
            res.json({ success: true, messages: [] });
        }
    } catch (error) {
        console.error('Error reading messages:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to load messages.' 
        });
    }
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Portfolio server running on http://0.0.0.0:${PORT}`);
    console.log(`Access your portfolio at: http://localhost:${PORT}`);
    console.log(`View messages at: http://localhost:${PORT}/messages`);
});
