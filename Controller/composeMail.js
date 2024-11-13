// // controllers/emailController.js
// const Email = require('../models/Email');
// const multer = require('multer');
// const nodemailer = require('nodemailer');
// const path = require('path');

// // Multer configuration for handling file attachments
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => cb(null, 'uploads/'),
//     filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
// });
// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB limit
// }).array('attachments', 10); // Maximum of 10 attachments

// // Nodemailer transporter configuration
// const transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: process.env.SMTP_PORT || 587,
//     secure: process.env.SMTP_PORT === 465, // true for 465, false for other ports
//     auth: {
//         user: process.env.SMTP_USER,
//         pass: process.env.SMTP_PASS,
//     },
// });

// // Controller function to send an email
// exports.sendEmail = (req, res) => {
//     console.log(' process.env.SMTP_PORT === 465 process.env.SMTP_PORT === 465 process.env.SMTP_PORT === 465 process.env.SMTP_PORT === 465', process.env.SMTP_PORT === 465)
//     upload(req, res, async (err) => {
//         if (err) {
//             return res.status(500).json({ error: 'File upload failed', details: err.message });
//         }

//         const { from, to, subject, text } = req.body;

//         if (!from || !to || !subject || !text) {
//             return res.status(400).json({ error: 'Please provide from, to, subject, and text fields.' });
//         }

//         try {
//             // Collect any attachments if provided
//             const attachments = req.files?.map((file) => ({
//                 filename: file.originalname,
//                 path: file.path,
//             })) || [];

//             // Send email via Nodemailer
//             await transporter.sendMail({
//                 from,
//                 to,
//                 subject,
//                 text,
//                 attachments,
//             });

//             // Save email to DB (optional, for tracking or logging)
//             const newEmail = new Email({
//                 from,
//                 to,
//                 subject,
//                 text,
//                 folder: 'sent',
//                 attachments,
//             });
//             await newEmail.save();

//             res.status(200).json({ message: 'Email sent successfully', email: newEmail });
//         } catch (error) {
//             res.status(500).json({ error: 'Failed to send email', details: error.message });
//         }
//     });
// };



const nodemailer = require('nodemailer');
const fs = require('fs/promises');
const Email = require('../Model/EmailModel');
const User = require('../Model/UserModel');
const crypto = require('crypto');

// Function to decrypt the password
async function getDecryptedPassword(encryptedPassword) {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const [iv, encrypted] = encryptedPassword.split(':');
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

const parseEmails = (emails) => emails.split(',').map(email => email.trim()).filter(email => email);

async function prepareAttachments(attachments) {
    const mailAttachments = [];

    for (const attachment of attachments) {
        const { filename, path } = attachment;
        try {
            const stats = await fs.stat(path);
            if (stats.size > 2 * 1024 * 1024 * 1024) {
                throw new Error(`Attachment ${filename} exceeds the 2GB size limit.`);
            }
            mailAttachments.push({ filename, path, size: stats.size });
        } catch (fileError) {
            console.error(`Error accessing file at path ${path}:`, fileError);
            throw new Error(`Cannot access attachment ${filename}. Ensure the file path is valid.`);
        }
    }
    return mailAttachments;
}

exports.sendEmail = async (req, res) => {
    const { user_id, to, subject, text, html, cc, bcc, attachments } = req.body;

   
    if (!user_id || !to || !subject || (!text && !html)) {
        return res.status(400).json({ error: 'user_id, to, subject, and either text or html content are required.' });
    }

    try {
        const user = await User.findById(user_id);
        if (!user || !user.email || !user.hashedSmtpPassword) {
            return res.status(404).json({ error: 'User not found or missing SMTP credentials.' });
        }

        const smtpPassword = await getDecryptedPassword(user.hashedSmtpPassword);
        if (!smtpPassword) {
            return res.status(403).json({ error: 'Invalid SMTP credentials' });
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT, 10) || 587,
            secure: parseInt(process.env.SMTP_PORT, 10) === 465,
            auth: {
                user: user.email,
                pass: smtpPassword,
            },
        });

        // Prepare attachments
        const mailAttachments = attachments && Array.isArray(attachments) ? await prepareAttachments(attachments) : [];

        // Send email with HTML content, plain text, and attachments
        const mailOptions = {
            from: user.email,
            to: parseEmails(to),
            subject,
            text,                   // Plain text content
            html,                   // HTML content
            cc: parseEmails(cc || ''),
            bcc: parseEmails(bcc || ''),
            attachments: mailAttachments
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);

        // Save email to database
        const emailData = {
            from: user.email,
            to: parseEmails(to),
            cc: parseEmails(cc || ''),
            bcc: parseEmails(bcc || ''),
            subject,
            text,
            html,                    // Save both HTML and plain text in the database
            folder: 'sent',
            starred: false,
            conversation: false,
            watched: false,
            user_id: user._id,
            date: new Date(),
            attachments: mailAttachments.map(att => ({
                filename: att.filename,
                path: att.path,
                size: att.size
            }))
        };

        const savedEmail = await Email.create(emailData);

        res.status(200).json({ 
            message: 'Email sent and saved successfully', 
            info: info.response, 
            email: savedEmail 
        });

    } catch (error) {
        console.error('Failed to send email:', error);
        res.status(500).json({ error: 'Failed to send email', details: error.message });
    }
};

// {
//     "user_id": "user123",
//     "to": "recipient@example.com",
//     "subject": "Hello with links",
//     "text": "Visit OpenAI or send me an email!",
//     "links": [
//         { "displayText": "OpenAI", "url": "https://www.openai.com" },
//         { "displayText": "email", "url": "mailto:someone@example.com" }
//     ]
// }


('front emnd please do not astimte it ')
// npm install formik yup axios @mui/material @mui/icons-material
// //frontend 
// import React, { useState } from 'react';
// import { useFormik } from 'formik';
// import * as Yup from 'yup';
// import axios from 'axios';
// import {
//     Container, Box, TextField, Button, Typography, IconButton, InputAdornment
// } from '@mui/material';
// import AttachFileIcon from '@mui/icons-material/AttachFile';
// import SendIcon from '@mui/icons-material/Send';

// const SendEmail = () => {
//     const [attachments, setAttachments] = useState([]);

//     // Formik setup with Yup validation
//     const formik = useFormik({
//         initialValues: {
//             user_id: '',
//             to: '',
//             cc: '',
//             bcc: '',
//             subject: '',
//             text: '',
//             html: '',
//         },
//         validationSchema: Yup.object({
//             user_id: Yup.string().required('User ID is required'),
//             to: Yup.string().required('Recipient email is required'),
//             subject: Yup.string().required('Subject is required'),
//             text: Yup.string(),
//             html: Yup.string(),
//         }),
//         onSubmit: async (values) => {
//             const formData = new FormData();
//             formData.append('user_id', values.user_id);
//             formData.append('to', values.to);
//             formData.append('subject', values.subject);
//             formData.append('text', values.text);
//             formData.append('html', values.html);
//             formData.append('cc', values.cc);
//             formData.append('bcc', values.bcc);

//             attachments.forEach((file, index) => {
//                 formData.append(`attachments[${index}]`, file, file.name);
//             });

//             try {
//                 const response = await axios.post('/api/send-email', formData, {
//                     headers: { 'Content-Type': 'multipart/form-data' },
//                 });
//                 alert(response.data.message);
//                 formik.resetForm();
//                 setAttachments([]);
//             } catch (error) {
//                 console.error('Error sending email:', error);
//                 alert('Failed to send email.');
//             }
//         },
//     });

//     // Handle file input change
//     const handleFileChange = (event) => {
//         setAttachments([...event.target.files]);
//     };

//     return (
//         <Container maxWidth="sm" sx={{ mt: 5, boxShadow: 2, borderRadius: 2, p: 3 }}>
//             <Typography variant="h5" gutterBottom align="center">
//                 Compose Email
//             </Typography>
//             <form onSubmit={formik.handleSubmit}>
//                 <TextField
//                     fullWidth
//                     label="User ID"
//                     variant="outlined"
//                     margin="normal"
//                     {...formik.getFieldProps('user_id')}
//                     error={formik.touched.user_id && Boolean(formik.errors.user_id)}
//                     helperText={formik.touched.user_id && formik.errors.user_id}
//                 />
//                 <TextField
//                     fullWidth
//                     label="To"
//                     variant="outlined"
//                     margin="normal"
//                     {...formik.getFieldProps('to')}
//                     error={formik.touched.to && Boolean(formik.errors.to)}
//                     helperText={formik.touched.to && formik.errors.to}
//                 />
//                 <TextField
//                     fullWidth
//                     label="CC"
//                     variant="outlined"
//                     margin="normal"
//                     {...formik.getFieldProps('cc')}
//                 />
//                 <TextField
//                     fullWidth
//                     label="BCC"
//                     variant="outlined"
//                     margin="normal"
//                     {...formik.getFieldProps('bcc')}
//                 />
//                 <TextField
//                     fullWidth
//                     label="Subject"
//                     variant="outlined"
//                     margin="normal"
//                     {...formik.getFieldProps('subject')}
//                     error={formik.touched.subject && Boolean(formik.errors.subject)}
//                     helperText={formik.touched.subject && formik.errors.subject}
//                 />
//                 <TextField
//                     fullWidth
//                     label="Plain Text Content"
//                     variant="outlined"
//                     multiline
//                     rows={4}
//                     margin="normal"
//                     {...formik.getFieldProps('text')}
//                 />
//                 <TextField
//                     fullWidth
//                     label="HTML Content"
//                     variant="outlined"
//                     multiline
//                     rows={4}
//                     margin="normal"
//                     {...formik.getFieldProps('html')}
//                 />
//                 <Box display="flex" alignItems="center" justifyContent="space-between" my={2}>
//                     <label htmlFor="file-upload">
//                         <input
//                             type="file"
//                             multiple
//                             id="file-upload"
//                             style={{ display: 'none' }}
//                             onChange={handleFileChange}
//                         />
//                         <Button
//                             variant="outlined"
//                             component="span"
//                             startIcon={<AttachFileIcon />}
//                         >
//                             Attach Files
//                         </Button>
//                     </label>
//                     {attachments.length > 0 && (
//                         <Typography variant="body2">
//                             {attachments.length} file(s) selected
//                         </Typography>
//                     )}
//                 </Box>
//                 <Button
//                     type="submit"
//                     fullWidth
//                     variant="contained"
//                     color="primary"
//                     endIcon={<SendIcon />}
//                     sx={{ mt: 2 }}
//                 >
//                     Send Email
//                 </Button>
//             </form>
//         </Container>
//     );
// };

// export default SendEmail;
