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

// Parse email addresses
const parseEmails = (emails) => 
    emails ? emails.split(',').map(email => email.trim()).filter(email => email) : [];

// Prepare email attachments
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
        } catch (error) {
            console.error(`Error accessing file at path ${path}:`, error);
            throw new Error(`Cannot access attachment ${filename}. Ensure the file path is valid.`);
        }
    }
    return mailAttachments;
}

// Send email controller
exports.sendEmail = async (req, res) => {
    const { user_id, to, subject, text, html, cc, bcc, attachments } = req.body;

    if (!user_id || !to || !subject || (!text && !html)) {
        return res.status(400).json({
            error: 'user_id, to, subject, and either text or html content are required.',
        });
    }

    try {
        // Fetch user and SMTP credentials
        const user = await User.findById(user_id);
        if (!user || !user.email || !user.hashedSmtpPassword) {
            return res.status(404).json({ error: 'User not found or missing SMTP credentials.' });
        }

        const smtpPassword = await getDecryptedPassword(user.hashedSmtpPassword);
        if (!smtpPassword) {
            return res.status(403).json({ error: 'Invalid SMTP credentials.' });
        }

        // Configure nodemailer transporter with DKIM options
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT, 10) || 465,
            secure: parseInt(process.env.SMTP_PORT, 10) === 465,
            auth: {
                user: user.email,
                pass: smtpPassword,
            },
            tls: { rejectUnauthorized: false },
            dkim: {
                domainName: 'yourdomain.com',
                keySelector: 'default',
                privateKey: process.env.DKIM_PRIVATE_KEY,
            },
        });

        // Prepare attachments
        const mailAttachments = attachments && Array.isArray(attachments)
            ? await prepareAttachments(attachments)
            : [];

        // Email options
        const mailOptions = {
            // from: `"${user.firstname} ${user.secoundname}" <${user.email}>`,
            from: `${user.email}`,
            to: parseEmails(to),
            cc: parseEmails(cc),
            bcc: parseEmails(bcc),
            subject,
            text,
            html,
            attachments: mailAttachments,
        };

        try {
            // Send email
            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent:', info.response);

            // Save sent email to the database
            const emailData = {
                from: user.email,
                to: parseEmails(to),
                cc: parseEmails(cc),
                bcc: parseEmails(bcc),
                subject,
                text,
                html,
                folder: 'sent',
                starred: false,
                conversation: false,
                watched: false,
                user_id: user._id,
                date: new Date(),
                attachments: mailAttachments.map(att => ({
                    filename: att.filename,
                    path: att.path,
                    size: att.size,
                })),
            };

            const savedEmail = await Email.create(emailData);

            return res.status(200).json({
                message: 'Email sent and saved successfully.',
                info: info.response,
                email: savedEmail,
            });

        } catch (deliveryError) {
            console.error('Delivery error:', deliveryError);

            // Notify sender about the delivery failure
            const notificationMailOptions = {
                from: 'Mail Delivery Subsystem <mailer-daemon@example.com>',
                to: user.email,
                subject: `Delivery Status Notification (Failure)`,
                text: `
                Your email to ${to} could not be delivered.
                Error Details: ${deliveryError.message}

                This is an automatically generated message. Please do not reply.
                `,
                html: `
                <p>Your email to <strong>${to}</strong> could not be delivered.</p>
                <p><strong>Error Details:</strong> ${deliveryError.message}</p>
                <p>This is an automatically generated message. Please do not reply.</p>
                `,
            };
            await transporter.sendMail(notificationMailOptions);

            return res.status(500).json({
                error: 'Failed to deliver email. Notification has been sent to the sender.',
                details: deliveryError.message,
            });
        }
    } catch (error) {
        console.error('Failed to send email:', error);
        return res.status(500).json({ error: 'Unexpected error occurred.', details: error.message });
    }
};






































//final done
// const nodemailer = require('nodemailer');
// const fs = require('fs/promises');
// const Email = require('../Model/EmailModel');
// const User = require('../Model/UserModel');
// const crypto = require('crypto');

// // Function to decrypt the password
// async function getDecryptedPassword(encryptedPassword) {
//     const algorithm = 'aes-256-cbc';
//     const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
//     const [iv, encrypted] = encryptedPassword.split(':');
//     const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
//     let decrypted = decipher.update(encrypted, 'hex', 'utf8');
//     decrypted += decipher.final('utf8');
//     return decrypted;
// }

// // Parse email addresses
// const parseEmails = (emails) => emails.split(',').map(email => email.trim()).filter(email => email);

// // Prepare email attachments
// async function prepareAttachments(attachments) {
//     const mailAttachments = [];
//     for (const attachment of attachments) {
//         const { filename, path } = attachment;
//         try {
//             const stats = await fs.stat(path);
//             if (stats.size > 2 * 1024 * 1024 * 1024) {
//                 throw new Error(`Attachment ${filename} exceeds the 2GB size limit.`);
//             }
//             mailAttachments.push({ filename, path, size: stats.size });
//         } catch (fileError) {
//             console.error(`Error accessing file at path ${path}:`, fileError);
//             throw new Error(`Cannot access attachment ${filename}. Ensure the file path is valid.`);
//         }
//     }
//     return mailAttachments;
// }

// // Send email controller
// exports.sendEmail = async (req, res) => {
//     const { user_id, to, subject, text, html, cc, bcc, attachments } = req.body;

//     if (!user_id || !to || !subject || (!text && !html)) {
//         return res.status(400).json({ error: 'user_id, to, subject, and either text or html content are required.' });
//     }

//     try {
//         // Fetch user and SMTP credentials
//         const user = await User.findById(user_id);
//         if (!user || !user.email || !user.hashedSmtpPassword) {
//             return res.status(404).json({ error: 'User not found or missing SMTP credentials.' });
//         }

//         const smtpPassword = await getDecryptedPassword(user.hashedSmtpPassword);
//         if (!smtpPassword) {
//             return res.status(403).json({ error: 'Invalid SMTP credentials' });
//         }

//         // Configure nodemailer transporter with DKIM options
//         const transporter = nodemailer.createTransport({
//             host: process.env.SMTP_HOST,
//             port: parseInt(process.env.SMTP_PORT, 10) || 465,
//             secure: parseInt(process.env.SMTP_PORT, 10) === 465,
//             auth: {
//                 user: user.email,
//                 pass: smtpPassword,
//             },
//             tls: {
//                 rejectUnauthorized: false,
//             },
//             dkim: {
//                 domainName: 'yourdomain.com',
//                 keySelector: 'default',
//                 privateKey: `-----BEGIN PRIVATE KEY-----
// MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC4I8aq1LWSw0e+
// kkVK8Jnf7KdR6DGNkZi/jarQXL5xGPtRshTikQOAv4TJG/e9k3H4+XyA+JZBmPv5
// 0EPBYNkpLf2pcDFaUzf/p6enyXrfSRSrCC6mMv4ARGplrKhwlp7CqPNkzGBSe5Hh
// 82vybavRPLwTEuzKu57AIGtc33v8xbZzymF2AhmVJaZ3OzwkP7v+nwByHpMBAoUZ
// 1ftUx/39zfFB50J5cxZCT8L5L9XUQIrjd1E+XAG6Dv3NE+fQZDhfhB0eCzenZ41A
// 5Bo8svYovjAvOgsqbyujbWcwWehF+i5KooYafl3L32LRmT0GFBuN5XOF8aPbWBvS
// fwh/cKg/AgMBAAECggEAHaHwPhyF7czMNmBOk109vfnVAUrW8pvME4NmSiqqoQOu
// qfp4/u7sO+NWKJD+IL1iGXl4rj6S25KVdiGsTanauJREnmhGIO2EdPlTcx5qzhTy
// JQXnj+pj0sIvxxXuc1Phz5ylsoJrO8rT8qMcK4K3pC/caktg3M0tomh1LphuWQJn
// oDDloslh8wbmktBlk4YmK87IwHpBFnf8pE8ch4+Ff2UyalpoUP7d2x4cSChZO5wc
// Qvg48PeHn9JyBz9Um0Uy3K2zYF/SbBROJYcmx9N4yVD5qFrEoO8ziBDate5iSTi3
// wMPiTJ4peOR2jjtA4KaE9OSkEFiaUyG6G+SCp+dr2QKBgQD6S7EI20HOI+vEzoLF
// 2AoZeW52GLzZX+7S/YAW7LbxRbeqSAQsPib9iZ9Nb8VIyon44xJ15zUd3vw4MY2T
// K9GIUB3YhARmiZkEB26wxFFiV8ehuOy8Yr7J2TDz8ABpR1hAKR0BzoDsIijFvnIn
// skWY9WuQXcFZhk5wCzOSN56YKQKBgQC8VhvZuQHvwGKuxtUenJwf8Tg+7NfD7YlY
// tFFO9npMR/mwDgB9cdjvTJaZI7H0Npk9LQ65f6ci+4NbF0Y0JoBbqhGEEBNlPEbO
// NrJFK3oK1Ytgr782GeUqWuWFLrmKdhghYn+OW68J3kqMpitjoshqNw1ft28z+HtZ
// ktMmQ+LqJwKBgE2FZ/2AOy9nfLxl4ab5NJeTPp0hKEyDI+sBTMzM4BR2LV52E6TI
// UzcvisFnHslewcDuQ2d1BsSLrb6RynGMnscDWVsX+GzxrQzMaIIjK7mzykbSibAH
// PWQy+rBy4w24ZSLqGOvYU6HPKqWkSKL22gt356q8/weFS4H0VjKxO1ORAoGAEKFd
// 5jTS+fO4AwzlpsVXd+6Z89yAFPn1pdKOV3WmSPQWFTi3TFxwNnlB1xXy0ci8cU14
// PmMKRCmHaNS+Sz6XGQEEeO/edpMDAZSM21TCexBuNURvkvxoYvwRxlfg5FwXN2N2
// NgDcjPeHB7JopGysW8yurqQI+sLXSYqQgJGACQMCgYEArSpGb/GaJNHLhPdW7Dc+
// e+zWR72a7ctstHHIK9qkfBPP2hAtswnSNKdJLCyz+nzItEiENYskG7+GCiMpoXaP
// WfsHjFx4hyP6tlWPLuZK5H614tICt6IPloGIo8DxAU8JoyiHWG9032vlDq9GaqsV
// L3EAUaQJV/RwCr2ogxYQoxI=
// -----END PRIVATE KEY-----`
//             }
//         });

//         // Prepare attachments
//         const mailAttachments = attachments && Array.isArray(attachments) ? await prepareAttachments(attachments) : [];
//         let email = user.email
//         // Email options
//         const mailOptions = {
//             from: (user.firstname +' '+ user.secoundname) < email >,
//             to: parseEmails(to),
//             cc: parseEmails(cc || ''),
//             bcc: parseEmails(bcc || ''),
//             subject,
//             text,
//             html,
//             attachments: mailAttachments,
//         };

//         try {
//             // Send email
//             const info = await transporter.sendMail(mailOptions);
//             console.log('mailOptionsmailOptionsmailOptionsmailOptions)
//             console.log('Email sent:', info.response);

//             // Save sent email to the database
//             const emailData = {
//                 from: user.email,
//                 to: parseEmails(to),
//                 cc: parseEmails(cc || ''),
//                 bcc: parseEmails(bcc || ''),
//                 subject,
//                 text,
//                 html,
//                 folder: 'sent',
//                 starred: false,
//                 conversation: false,
//                 watched: false,
//                 user_id: user._id,
//                 date: new Date(),
//                 attachments: mailAttachments.map(att => ({
//                     filename: att.filename,
//                     path: att.path,
//                     size: att.size
//                 }))
//             };

//             const savedEmail = await Email.create(emailData);

//             return res.status(200).json({
//                 message: 'Email sent and saved successfully',
//                 info: info.response,
//                 email: savedEmail
//             });

//         } catch (deliveryError) {
//             console.error('Delivery error:', deliveryError);

//             // Notify sender about the delivery failure
//             const notificationMailOptions = {
//                 from: 'Mail Delivery Subsystem <mailer-daemon@example.com>',
//                 to: user.email,
//                 subject: `Delivery Status Notification (Failure)`,
//                 text: `
//                 Your email to ${to} could not be delivered.
//                 Error Details: ${deliveryError.message}
                
//                 This is an automatically generated message. Please do not reply.
//                 `,
//                 html: `
//                 <p>Your email to <strong>${to}</strong> could not be delivered.</p>
//                 <p><strong>Error Details:</strong> ${deliveryError.message}</p>
//                 <p>This is an automatically generated message. Please do not reply.</p>
//                 `,
//             };
//             console.log(notificationMailOptions)
//             await transporter.sendMail(notificationMailOptions);
//             return res.status(500).json({
//                 error: 'Failed to deliver email. Notification has been sent to the sender.',
//                 details: deliveryError.message,
//             });
//         }

//     } catch (error) {
//         console.error('Failed to send email:', error);
//         return res.status(500).json({ error: 'Unexpected error occurred.', details: error.message });
//     }
// };




































































































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


// ('front emnd please do not astimte it ')
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
