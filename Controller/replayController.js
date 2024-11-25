// // controllers/emailController.js
// const Email = require('../Model/EmailModel');
// const multer = require('multer');
// const path = require('path');

// // Multer configuration (for handling attachments)
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => cb(null, 'uploads/'),
//     filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
// });
// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB limit
// }).array('attachments', 10);

// // Controller to handle replying to an email
// exports.replyToEmail = (req, res) => {
//     upload(req, res, async (err) => {
//         if (err) {
//             return res.status(500).json({ error: 'File upload failed' });
//         }

//         const { replyText, from, to, subject } = req.body;
//         const { originalEmailId } = req.params;

//         try {
//             // Find the original email
//             const originalEmail = await Email.findById(originalEmailId);
//             if (!originalEmail) {
//                 return res.status(404).json({ error: 'Original email not found' });
//             }

//             // Format the reply content, including the original email text
//             const replyContent = `${replyText}\n\n--- Original Message ---\nFrom: ${originalEmail.from}\nTo: ${originalEmail.to}\nSubject: ${originalEmail.subject}\n\n${originalEmail.text}`;

//             // Prepare attachments
//             const attachments = req.files.map((file) => ({
//                 filename: file.originalname,
//                 path: file.path,
//             }));

//             // Create the reply email document
//             const replyEmail = new Email({
//                 from,
//                 to,
//                 subject: `Re: ${originalEmail.subject}`, // Prefix with "Re:"
//                 text: replyContent,
//                 folder: 'sent',
//                 attachments,
//                 conversation: true,
//                 inReplyTo: originalEmail._id, // Reference to the original email
//             });

//             await replyEmail.save();
//             res.status(200).json({ message: 'Reply sent successfully', replyEmail });
//         } catch (error) {
//             res.status(500).json({ error: 'Failed to send reply' });
//         }
//     });
// };



const nodemailer = require('nodemailer');
const fs = require('fs/promises');
const Email = require('../Model/EmailModel');
const User = require('../Model/UserModel');
const crypto = require('crypto');
const moment = require('moment'); // For formatting date/time

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

// Helper function to parse email addresses from a comma-separated string
const parseEmails = (emails) => emails.split(',').map(email => email.trim()).filter(email => email);

// Function to prepare attachments for the email
async function prepareAttachments(attachments) {
    const mailAttachments = [];

    for (const attachment of attachments) {
        const { filename, path } = attachment;
        try {
            // Check file size and add it to the attachment array if valid
            const stats = await fs.stat(path);
            if (stats.size > 2 * 1024 * 1024 * 1024) { // 2GB limit
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

// Reply email controller function
exports.replyEmail = async (req, res) => {
    const { user_id, originalEmailId, text, html } = req.body;
    const attachments = req.files || [];

    // Check required fields are provided
    if (!user_id || !originalEmailId || (!text && !html)) {
        return res.status(400).json({ error: 'user_id, originalEmailId, and either text or html content are required.' });
    }

    try {
        // Step 1: Fetch the original email from the database
        const originalEmail = await Email.findById(originalEmailId);
        if (!originalEmail) {
            return res.status(404).json({ error: 'Original email not found.' });
        }

        // Step 2: Format the original email as quoted text
        let originalEmailQuoted = '-----Original Message-----\n';
        originalEmailQuoted += `From: ${originalEmail.from}\n`;
        originalEmailQuoted += `Sent: ${moment(originalEmail.date).format('ddd, MMM D, YYYY [at] h:mm A')}\n`;
        originalEmailQuoted += `To: ${originalEmail.to.join(', ')}\n`;
        originalEmailQuoted += `Subject: ${originalEmail.subject}\n\n`;

        // Only include text and/or HTML from the original email if they exist
        if (originalEmail.text) originalEmailQuoted += `${originalEmail.text}\n`;
        if (originalEmail.html) originalEmailQuoted += originalEmail.html;


        // Plain text version of the reply
        const replyText = `
            ${text}

            ${originalEmailQuoted}
        `;

        // Step 4: Fetch the user's SMTP credentials
        const user = await User.findById(user_id);
        if (!user || !user.email || !user.hashedSmtpPassword) {
            return res.status(404).json({ error: 'User not found or missing SMTP credentials.' });
        }

        const smtpPassword = await getDecryptedPassword(user.hashedSmtpPassword);
        if (!smtpPassword) {
            return res.status(403).json({ error: 'Invalid SMTP credentials' });
        }

        // Step 5: Set up the SMTP transporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT, 10) || 465,
            secure: parseInt(process.env.SMTP_PORT, 10) === 465,
            auth: {
                user: user.email,
                pass: smtpPassword,
            },
        });

        // Step 6: Prepare attachments if provided
        const mailAttachments = attachments && Array.isArray(attachments) ? await prepareAttachments(attachments) : [];

        // Step 7: Send the reply email
        const mailOptions = {
            from: user.email,
            to: parseEmails(originalEmail.from), // Reply to the original sender
            subject: `Re: ${originalEmail.subject}`, // Prefix "Re:" to the original subject
            text: replyText,
            cc: parseEmails(originalEmail.cc || ''),
            bcc: parseEmails(originalEmail.bcc || ''),
            attachments: mailAttachments,
            inReplyTo: originalEmail._id,
            references: originalEmail._id,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Reply sent:', info.response);

        // Step 8: Save reply to the database
        const replyData = {
            from: user.email,
            to: parseEmails(originalEmail.from),
            cc: parseEmails(originalEmail.cc || ''),
            bcc: parseEmails(originalEmail.bcc || ''),
            subject: `Re: ${originalEmail.subject}`,
            text: replyText,
            folder: 'sent',
            starred: false,
            conversation: true, // Link to original email thread
            watched: false,
            user_id: user._id,
            date: new Date(),
            attachments: mailAttachments.map(att => ({
                filename: att.filename,
                path: att.path,
                size: att.size
            }))
        };

        const savedReply = await Email.create(replyData);

        // Respond with success and email data
        res.status(200).json({
            message: 'Reply sent and saved successfully',
            info: info.response,
            email: savedReply
        });

    } catch (error) {
        console.error('Failed to send reply:', error);
        res.status(500).json({ error: 'Failed to send reply', details: error.message });
    }
};



// ('frontend code')
// npm install formik yup axios

// jsx file 
// import React, { useState } from 'react';
// import { Formik, Form, Field, ErrorMessage } from 'formik';
// import * as Yup from 'yup';
// import axios from 'axios';
// import './EmailReply.css';

// const EmailReply = ({ originalEmail }) => {
//     const [responseMessage, setResponseMessage] = useState('');
//     const [attachments, setAttachments] = useState([]);

//     const handleFileChange = (event) => {
//         setAttachments([...event.target.files]);
//     };

//     // Validation schema
//     const validationSchema = Yup.object().shape({
//         text: Yup.string().when('html', {
//             is: (html) => !html || html.length === 0,
//             then: Yup.string().required('Either text or HTML content is required.'),
//         }),
//         html: Yup.string().when('text', {
//             is: (text) => !text || text.length === 0,
//             then: Yup.string().required('Either text or HTML content is required.'),
//         }),
//     });

//     // Handle email reply form submission
//     const handleSubmit = async (values, { setSubmitting, resetForm }) => {
//         setSubmitting(true);
//         setResponseMessage('');
        
//         // Creating form data
//         const formData = new FormData();
//         formData.append('user_id', values.user_id);
//         formData.append('originalEmailId', originalEmail.id);
//         formData.append('text', values.text);
//         formData.append('html', values.html);
//         attachments.forEach((file, index) => {
//             formData.append(`attachments[${index}]`, file, file.name);
//         });

//         try {
//             const response = await axios.post('/api/reply-email', formData, {
//                 headers: { 'Content-Type': 'multipart/form-data' },
//             });
//             setResponseMessage(response.data.message || 'Reply sent successfully');
//             resetForm();
//             setAttachments([]);
//         } catch (error) {
//             setResponseMessage(error.response?.data?.error || 'Failed to send reply');
//             console.error('Error sending reply:', error);
//         } finally {
//             setSubmitting(false);
//         }
//     };

//     return (
//         <div className="email-reply">
//             <h2>Reply to Email</h2>
//             <Formik
//                 initialValues={{ user_id: '', text: '', html: '' }}
//                 validationSchema={validationSchema}
//                 onSubmit={handleSubmit}
//             >
//                 {({ isSubmitting, setFieldValue }) => (
//                     <Form>
//                         <label htmlFor="user_id">User ID</label>
//                         <Field type="text" id="user_id" name="user_id" placeholder="User ID" />
//                         <ErrorMessage name="user_id" component="div" className="error" />

//                         <label htmlFor="text">Plain Text Reply</label>
//                         <Field as="textarea" id="text" name="text" placeholder="Write your plain text reply here" />
//                         <ErrorMessage name="text" component="div" className="error" />

//                         <label htmlFor="html">HTML Reply</label>
//                         <Field as="textarea" id="html" name="html" placeholder="Write your HTML reply here" />
//                         <ErrorMessage name="html" component="div" className="error" />

//                         <label>Attachments</label>
//                         <input type="file" multiple onChange={(e) => {
//                             handleFileChange(e);
//                             setFieldValue('attachments', e.currentTarget.files);
//                         }} />
                        
//                         {/* Display original email in quoted text */}
//                         <div className="original-email-quote">
//                             <p>-----Original Message-----</p>
//                             <p><strong>From:</strong> {originalEmail.from}</p>
//                             <p><strong>Sent:</strong> {originalEmail.date}</p>
//                             <p><strong>To:</strong> {originalEmail.to}</p>
//                             <p><strong>Subject:</strong> {originalEmail.subject}</p>
//                             {originalEmail.html ? (
//                                 <div dangerouslySetInnerHTML={{ __html: originalEmail.html }}></div>
//                             ) : (
//                                 <p>{originalEmail.text}</p>
//                             )}
//                         </div>

//                         <button type="submit" disabled={isSubmitting}>
//                             {isSubmitting ? 'Sending...' : 'Send Reply'}
//                         </button>
//                     </Form>
//                 )}
//             </Formik>
//             {responseMessage && <div className="response-message">{responseMessage}</div>}
//         </div>
//     );
// };

// export default EmailReply;

// css file 
// .email-reply {
//     max-width: 600px;
//     margin: auto;
//     padding: 20px;
//     border: 1px solid #ddd;
//     border-radius: 5px;
//     background-color: #f9f9f9;
//     box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
// }

// .email-reply h2 {
//     text-align: center;
//     color: #333;
// }

// label {
//     font-weight: bold;
//     color: #555;
//     margin-top: 10px;
// }

// textarea,
// input[type="text"] {
//     width: 100%;
//     padding: 10px;
//     margin-top: 5px;
//     margin-bottom: 15px;
//     border-radius: 4px;
//     border: 1px solid #ccc;
// }

// button {
//     display: block;
//     width: 100%;
//     padding: 10px;
//     background-color: #1a73e8;
//     color: white;
//     border: none;
//     border-radius: 4px;
//     font-weight: bold;
//     cursor: pointer;
// }

// button:hover {
//     background-color: #155bb5;
// }

// .error {
//     color: red;
//     font-size: 0.9em;
// }

// .original-email-quote {
//     background-color: #f1f1f1;
//     padding: 15px;
//     margin-top: 20px;
//     border-left: 3px solid #ccc;
//     font-size: 0.9em;
// }

// .response-message {
//     text-align: center;
//     margin-top: 20px;
//     color: green;
// }

// @media (max-width: 768px) {
//     .email-reply {
//         padding: 15px;
//     }

//     button {
//         font-size: 0.9em;
//         padding: 8px;
//     }

//     label,
//     .original-email-quote {
//         font-size: 0.9em;
//     }
// }

