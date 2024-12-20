// // Imports
// const express = require('express');
// const dotenv = require('dotenv');
// const { SMTPServer } = require('smtp-server');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const { simpleParser } = require('mailparser');
// const fs = require('fs');
// const path = require('path');
// const cron = require('node-cron');
// const authRoutes = require('./routes/authRoutes');
// const endPoint = require('./routes/index');
// const emailRoutes = require('./routes/emailRoutes');
// const replyemailRoutes = require('./routes/replyemailRoutes');
// const trashManageRoutes = require('./routes/moveToTrashRoute');
// const Email = require('./Model/EmailModel');
// const User = require('./Model/UserModel'); // Import the User model
// const { permanentlyDeleteEmails } = require('./utilities/deleteOnDateMail');


// // Environment Configuration
// dotenv.config();


// // MongoDB Connection
// const connectDB = async () => {
//   // console.log('here in connections of dataabaase ')
//   try {
//     await mongoose.connect(process.env.MONGO_URI, { /* No deprecated options needed */ });
//     console.log('MongoDB connected successfully');
//   } catch (error) {
//     console.error('MongoDB connection error:', error.message);
//     process.exit(1); // Exit on DB connection failure
//   }
// };

// // Initialize Express App
// const app = express();

// connectDB();

// // Schedule the deletion function to run at midnight every day
// cron.schedule('0 0 * * *', async () => {
//   console.log('Running scheduled email deletion task...');
//   await permanentlyDeleteEmails();
// });

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.static(path.join(__dirname, 'public')));

// // CORS Settings for Allowed Origins
// app.use((req, res, next) => {
//   res.setHeader('Access-Control-Allow-Origin', process.env.DOMAIN || 'http://localhost:3000');
//   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, multipart/form-data,application/octet-stream');
//   next();
// });

// // Routes

// //deanger end point
// app.use('/api', endPoint);
// //this all apis for user 
// app.use('/api/user', authRoutes);
// //this all apis for send get and delete mails 
// app.use('/api/email', emailRoutes);
// app.use('/api/replyemail', replyemailRoutes);
// app.use('/api/trashmanageemail', trashManageRoutes);

// // 404 Error Handler for Undefined Routes
// app.use((req, res) => {
//   res.status(404).json({ error: 'Resource not found. Please check the URL.' });
// });

// // General Error Handler
// app.use((err, req, res, next) => {
//   console.error('Error:', err);
//   res.status(err.status || 500).json({
//     message: err.message || 'Internal Server Error',
//     error: process.env.NODE_ENV === 'development' ? err : {}
//   });
// });

// // HTTP Server Setup with Port Management
// let httpPort = process.env.PORT || 3000;
// let httpServer;

// const startHttpServer = (port) => {
//   httpServer = app.listen(port, () => {
//     console.log(`HTTP server running on port ${port}`);
//   });

//   httpServer.on('error', (error) => {
//     if (error.code === 'EADDRINUSE') {
//       console.warn(`Port ${port} is in use. Trying next port...`);
//       startHttpServer(port + 1);
//     } else {
//       console.error('HTTP server error:', error.message);
//     }
//   });
// };

// startHttpServer(httpPort);

// // SSL Configuration for SMTP
// const sslOptions = {
//   key: fs.readFileSync(path.join(__dirname, 'cert', 'key.pem')),
//   cert: fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem')),
// };

// // SMTP Server Setup with Dedicated Port
// const smtpPort = process.env.SMTP_PORT || 25;
// // const smtpServer = new SMTPServer({
// //   authOptional: true,

// //   async onData(stream, session, callback) {
// //     let emailData = '';
// //     stream.on('data', (chunk) => {
// //       emailData += chunk.toString();
// //     });

// //     stream.on('end', async () => {
// //       try {
// //         // Parse email data
// //         const { from, to, subject, text } = parseEmailData(emailData);

// //         // Find the user by the recipient's email address
// //         const user = await User.findOne({ email: to });

// //         // If user not found, reject the email and notify the sender
// //         if (!user) {
// //           console.error(`User not found for recipient email: ${to}`);
// //           return callback(new Error(`Recipient ${to} not found`)); // This will notify the sender
// //         }

// //         // If user is found, create and save the email
// //         const email = new Email({
// //           from,
// //           to,
// //           subject,
// //           text,
// //           folder: 'inbox',
// //           user_id: user._id // Link email to the recipient's user ID
// //         });
// //         await email.save();

// //         callback(null); // Successfully processed the email
// //       } catch (error) {
// //         console.error('Error saving email:', error.message);
// //         callback(new Error('Error processing email data'));
// //       }
// //     });
// //   },

// //   onError(err) {
// //     console.error('SMTP server error:', err.message);
// //   }
// // });

// // Start SMTP Server
// //
// const smtpServer = new SMTPServer({
//   allowInsecureAuth: true,
//   authOptional: true,
//   secure: true,
//   ...sslOptions,
//   onConnect(session, cb) {
//     console.log('onconnect', session.id)
//     cb()
//   },
//   onMailFrom(address, session, cb) {
//     console.log('onMailFrom', address.address, session.id)
//     cb()
//   },
//   onRcptTo(address, session, cb) {
//     console.log('onRcptTo', address.address, session.id)
//     cb()
//   },

//   async onData(stream, session, callback) {
//     let emailData = '';
//     stream.on('data', (chunk) => {
//       console.log('emailDataemailData', emailData)
//       emailData += chunk.toString();
//     });

//     stream.on('end', async () => {
//       try {
//         // Parse the email using mailparser
//         const parsed = await simpleParser(emailData);
//         const { from, to, cc, bcc, subject, text, html, attachments } = parsed;
//         console.log(from, to, cc, bcc, subject, text, html, attachments)
//         // Find the user by the recipient's email address
//         const recipient = to && to.value && to.value[0].address;
//         const user = await User.findOne({ email: recipient });

//         if (!user) {
//           console.error(`User not found for recipient email: ${recipient}`);
//           return callback(new Error(`Recipient ${recipient} not found`)); // Notify the sender
//         }

//         // Prepare the email document to save in the database
//         const email = new Email({
//           from: from.text, // Plain text version of the sender
//           to: to.value.map((item) => item.address),
//           cc: cc ? cc.value.map((item) => item.address) : [],
//           bcc: bcc ? bcc.value.map((item) => item.address) : [],
//           subject,
//           text,
//           html,
//           folder: 'inbox',
//           starred: false,
//           conversation: false,
//           watched: false,
//           user_id: user._id // Link email to the recipient's user ID
//         });

//         // Handle attachments
//         if (attachments && attachments.length > 0) {
//           email.attachments = [];

//           for (const attachment of attachments) {
//             // Check file size (2GB = 2147483648 bytes)
//             if (attachment.size > 2147483648) {
//               console.error('Attachment size exceeds the maximum limit of 2GB');
//               return callback(new Error('Attachment size exceeds the maximum limit of 2GB'));
//             }

//             // Save attachment to disk
//             const filePath = path.join(__dirname, 'uploads', attachment.filename);
//             const writeStream = fs.createWriteStream(filePath);
//             attachment.content.pipe(writeStream);

//             // Wait until the file is fully written
//             await new Promise((resolve, reject) => {
//               writeStream.on('finish', resolve);
//               writeStream.on('error', reject);
//             });

//             // Store the file path in the email document's attachments
//             email.attachments.push({ filename: attachment.filename, path: filePath });
//           }
//         }

//         // Save the email to the database
//         await email.save();
//         callback(null); // Successfully processed the email
//       } catch (error) {
//         console.error('Error processing email:', error.message);
//         callback(new Error('Error processing email data'));
//       }
//     });
//   },

//   onError(err) {
//     console.error('SMTP server error:', err.message);
//   }
// });

// // Ensure the uploads directory exists
// if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
//   fs.mkdirSync(path.join(__dirname, 'uploads'));
// }

// // Start listening on the specified SMTP port
// smtpServer.listen(smtpPort, (err) => {
//   if (err) {
//     console.error(`Failed to start SMTP server on port ${smtpPort}:`, err.message);
//   } else {
//     console.log(`SMTP server running on port ${smtpPort}`);
//   }
// });

// // Graceful Shutdown for Nodemon Restart or Exit
// const gracefulShutdown = () => {
//   console.log('Graceful shutdown initiated...');
//   if (httpServer) {
//     httpServer.close(() => console.log('HTTP server closed gracefully.'));
//   }
//   if (smtpServer) {
//     smtpServer.close(() => console.log('SMTP server closed gracefully.'));
//   }
//   process.exit(0);
// };

// process.once('SIGUSR2', gracefulShutdown);

// // Helper Function to Parse Email Data
// function parseEmailData(emailData) {
//   const from = emailData.match(/From: (.+)/)?.[1] || '';
//   const to = emailData.match(/To: (.+)/)?.[1] || '';
//   const subject = emailData.match(/Subject: (.+)/)?.[1] || '';
//   const text = emailData.replace(/^(From|To|Subject): .+$/gm, '').trim();
//   return { from, to, subject, text };

// }

// module.exports = app;




const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const cron = require('node-cron');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

//database connections 
const connectDB = require('./config/db');
//all routes
const authRoutes = require('./routes/authRoutes');
const endPoint = require('./routes/index');
const emailRoutes = require('./routes/emailRoutes');
const replyemailRoutes = require('./routes/replyemailRoutes');
const trashManageRoutes = require('./routes/moveToTrashRoute');
const { permanentlyDeleteEmails } = require('./utilities/deleteOnDateMail');

//import all file for sending and receving emails 
const User = require('./Model/UserModel');
const Email = require('./Model/EmailModel');

// Load Environment Variables
dotenv.config();

// // MongoDB Connection
// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI, {});
//     console.log('MongoDB connected successfully');
//   } catch (error) {
//     console.error('MongoDB connection error:', error.message);
//     process.exit(1);
//   }
// };

// Initialize Express App
const app = express();
connectDB();
// connectDB

// Schedule the deletion function to run at midnight every day
cron.schedule('0 0 * * *', async () => {
  console.log('Running scheduled email deletion task...');
  await permanentlyDeleteEmails();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// CORS Configuration
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.DOMAIN || 'https://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, multipart/form-data', 'application/octet-stream');
  next();
});

// Routes

//deanger end point
app.use('/api', endPoint);
//this all apis for user 
app.use('/api/user', authRoutes);
//this all apis for send get and delete mails 
app.use('/api/email', emailRoutes);
app.use('/api/replyemail', replyemailRoutes);
app.use('/api/trashmanageemail', trashManageRoutes);

// const sslOptions = {
//   key: fs.readFileSync('/path/to/private.key'),
//   cert: fs.readFileSync('/path/to/certificate.crt'),
//   ca: fs.readFileSync('/path/to/ca_certificate.crt') // Optional, for CA certificates
// };

// SSL Configuration
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'cert', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem')),
  ca: fs.readFileSync(path.join(__dirname, 'cert', 'ca_certificate.crt'))
};


// Handle Received Emails (SMTP Server for Port 25)
const smtpReceiver = new SMTPServer({
  secure: false, // Not using TLS for port 25
  authOptional: true,
  async onData(stream, session, callback) {
    let emailData = '';

    stream.on('data', (chunk) => {
      emailData += chunk.toString();
    });

    stream.on('end', async () => {
      try {
        console.log('heare in receive mail')
        const parsed = await simpleParser(emailData);
        const { from, to, cc, bcc, subject, text, html, attachments } = parsed;
        // Extract recipient's email
        const recipientEmail = to && to.value && to.value[0]?.address;

        // Find user by recipient's email
        const user = await User.findOne({ email: recipientEmail });
        if (!user) {
          console.error(`User not found for email: ${recipientEmail}`);
          return callback(new Error(`Recipient ${recipientEmail} not found`));
        }

        // Prepare the email document
        const email = new Email({
          // from: from.text,
          // to: to.value.map((item) => item.address),
          from: from.text, // Plain text version of the sender
          to: to.value.map((item) => item.address),
          cc: cc ? cc.value.map((item) => item.address) : [],
          bcc: bcc ? bcc.value.map((item) => item.address) : [],
          subject,
          text,
          html,
          folder: 'inbox',
          starred: false,
          conversation: false,
          watched: false,
          user_id: user._id,
        });

        // Handle attachments
        // if (attachments && attachments.length > 0) {
        //   email.attachments = [];

        //   for (const attachment of attachments) {
        //     if (attachment.size > 2147483648) {
        //       console.error('Attachment size exceeds 2GB');
        //       return callback(new Error('Attachment size exceeds 2GB'));
        //     }

        //     const filePath = path.join(__dirname, 'uploads', attachment.filename);
        //     const writeStream = fs.createWriteStream(filePath);

        //     attachment.content.pipe(writeStream);

        //     await new Promise((resolve, reject) => {
        //       writeStream.on('finish', resolve);
        //       writeStream.on('error', reject);
        //     });

        //     email.attachments.push({ filename: attachment.filename, path: filePath });
        //   }
        // }
        if (attachments && attachments.length > 0) {
          email.attachments = [];

          for (const attachment of attachments) {
            if (attachment.size > 2147483648) {
              console.error('Attachment size exceeds 2GB');
              return callback(new Error('Attachment size exceeds 2GB'));
            }

            const filePath = path.join(__dirname, 'uploads', attachment.filename);

            // Write the content directly to the file
            await fs.promises.writeFile(filePath, attachment.content);

            email.attachments.push({ filename: attachment.filename, path: filePath });
          }
        }

        await email.save();
        callback(null);
      } catch (error) {
        console.error('Error processing email:', error.message);
        callback(new Error('Error processing email data'));
      }
    });
  },
});

smtpReceiver.listen(25, () => {
  console.log('SMTP server listening on port 25 for receiving emails');
});


// // Create SMTP server
// const smtpSender = new SMTPServer({
//   banner: 'mail.avinixsolutions.com ESMTP Server',
//   secure: true, // TLS enabled
//   key: fs.readFileSync(path.join(__dirname, 'cert', 'key.pem')),
//   cert: fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem')),
//   ca: fs.readFileSync(path.join(__dirname, 'cert', 'ca_certificate.crt')),
//   onAuth: async (auth, session, callback) => {
//     try {
//       const user = await User.findOne({ email: auth.username });
//       console.log(user, '----------------user')
//       console.log(auth.password, '----------------auth.password')
//       console.log(await bcrypt.compare(auth.password, user.hashedSmtpPassword), '----------------await bcrypt.compare(auth.password, user.smtpPassword)')
//       if (!user) {
//         return callback(new Error('Invalid credentials: User not found'));
//       }

//       const isPasswordValid = await bcrypt.compare(auth.password, user.hashedSmtpPassword);
//       console.log(isPasswordValid, 'auth.password--------------------------')
//       // if (!isPasswordValid) {
//       //     return callback(new Error('Invalid credentials: Incorrect password'));
//       // }
//       // Ensure emails are sent from the authenticated user's domain.
//       console.log('auth.usernameauth.username------------------------', auth.username)
//       if (!auth.username.endsWith('@avinixsolutions.com')) {
//         return callback(new Error('Relay access denied'));
//       }

//       callback(null, { user: auth.username });
//     } catch (error) {
//       console.error('Authentication failed:', error);
//       callback(new Error('Authentication failed'));
//     }
//   },
//   onData(stream, session, callback) {
//     console.log('here in onData')
//     stream.pipe(process.stdout); // Print the email to console for demo purposes
//     stream.on('end', callback);
//   },
//   onMailFrom(address, session, callback) {
//     console.log(`Incoming email from: ${address.address}`);
//     callback();
//   },
//   onRcptTo(address, session, callback) {
//     console.log(`Outgoing email to: ${address.address}`);
//     callback();
//   },
//   // tls: {
//   //   rejectUnauthorized: false,
//   // },
//   onData(stream, session, callback) {
//     console.log('Sending email...');
//     stream.on('end', callback);
//   },

//   disabledCommands: ['STARTTLS', 'AUTH PLAIN', 'AUTH LOGIN'], // Disable unnecessary commands

//   tls: {
//     rejectUnauthorized: false, // Allow self-signed certificates
//   },
// });


// smtpSender.listen(465, () => {
//   console.log('SMTP server listening on port 465 for sending emails');
// });
const smtpSender = new SMTPServer({
  banner: 'mail.avinixsolutions.com',
  secure: true,
  key: fs.readFileSync(path.join(__dirname, 'cert', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem')),
  ca: fs.readFileSync(path.join(__dirname, 'cert', 'ca_certificate.crt')),
  authMethods: ['LOGIN'], // Enable login authentication
  onAuth: async (auth, session, callback) => {
    try {
      const user = await User.findOne({ email: auth.username });
      if (!user) {
        return callback(new Error('Invalid credentials: User not found'));
      }
      console.log(user, '------------------------------------------------user')
      // const isPasswordValid = await bcrypt.compare(auth.password, user.hashedSmtpPassword);
      // if (!isPasswordValid) {
      //     return callback(new Error('Invalid credentials: Incorrect password'));
      // }

      // if (!auth.username.endsWith('@avinixsolutions.com')) {
      //   return callback(new Error('Relay access denied'));
      // }

      callback(null, { user: auth.username });
    } catch (error) {
      console.error('Authentication failed:', error);
      callback(new Error('Authentication failed'));
    }
  },
  onMailFrom(address, session, callback) {
    console.log(`Incoming email from: ${address.address}`);
    callback();
  },
  onRcptTo(address, session, callback) {
    console.log(`Outgoing email to: ${address.address}`);
    callback();
  },
  onData(stream, session, callback) {
    console.log('Processing email data...');
    stream.pipe(process.stdout);
    stream.on('end', callback);
  },
  tls: { rejectUnauthorized: false },
  disabledCommands: ['STARTTLS'], // STARTTLS is disabled as the connection is already secure
});

smtpSender.listen(465, () => {
  console.log('SMTP server listening on port 465 for sending emails');
});








// Step 1: Create SMTP Server to Receive Emails
const server = new SMTPServer({
  authOptional: true, // Allow unauthenticated users to send emails
  onData(stream, session, callback) {
      let emailData = '';
      stream.on('data', (chunk) => {
          emailData += chunk;
      });
      stream.on('end', () => {
          console.log('Received Email Data:');
          console.log(emailData);
          callback(null); // Indicate success
      });
  },
  onAuth(auth, session, callback) {
      // Implement authentication logic if needed
      if (auth.username === 'test' && auth.password === 'password') {
          return callback(null, { user: 'test-user' });
      }
      return callback(new Error('Authentication failed'));
  },
});

server.listen(587, () => {
  console.log('SMTP Server is listening on port 587');
});



// Step 2: Function to Send Email using Nodemailer
async function sendEmail() {
  // Create a Nodemailer transport
  const transporter = nodemailer.createTransport({
      host: 'localhost',
      port: 587,
      secure: false, // Use STARTTLS or plaintext connection
      tls: {
          rejectUnauthorized: false, // Allow self-signed certificates
      },
  });

  // Email details
  const mailOptions = {
      from: 'check@avinixsolutions.com',
      to: 'milinchhipavadiya@gmail.com',
      subject: 'Test Email 11111111',
      text: 'This is a test email 1111',
      html: '<b>This is a test email</b>',
  };

  try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent: ', info.response);
  } catch (error) {
      console.error('Error sending email: ', error);
  }
}

// Send a test email after the server starts
setTimeout(() => {
  sendEmail();
}, 5000);









// HTTPS Server
const httpsPort = process.env.PORT || 443;
https.createServer(sslOptions, app).listen(httpsPort, () => {
  console.log(`HTTPS server running on port ${httpsPort}`);
});




const smtpServer = new SMTPServer({
  banner: 'Simple Testing SMTP Server',
  logger: true, // Enable logging for debugging
  secure: false, // Use a non-secure connection for testing
  onAuth(auth, session, callback) {
      console.log(`Authentication request for: ${auth.username}`);
      // Accept all authentications for testing purposes
      callback(null, { user: auth.username });
  },
  onMailFrom(address, session, callback) {
      console.log(`Mail from: ${address.address}`);
      callback(); // Always accept sender for testing
  },
  onRcptTo(address, session, callback) {
      console.log(`Recipient: ${address.address}`);
      callback(); // Always accept recipients for testing
  },
  onData(stream, session, callback) {
      console.log('Receiving email data...');
      let emailData = '';
      stream.on('data', chunk => {
          emailData += chunk;
      });
      stream.on('end', () => {
          console.log(`Email data received:\n${emailData}`);
          callback(); // Signal email received successfully
      });
  },
  disabledCommands: ['STARTTLS'], // Simplify setup by disabling TLS
});

smtpServer.listen(1025, () => {
  console.log('SMTP server is running on port 1025');
});


// Graceful Shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  smtpReceiver.close(() => console.log('SMTP receiver closed'));
  smtpSender.close(() => console.log('SMTP sender closed'));
  process.exit(0);
});

module.exports = app;







































































// // Imports33
// const express = require('express');
// const dotenv = require('dotenv');
// const { SMTPServer } = require('smtp-server');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const { simpleParser } = require('mailparser');
// const fs = require('fs');
// const path = require('path');
// const cron = require('node-cron');
// const authRoutes = require('./routes/authRoutes');
// const endPoint = require('./routes/index');
// const emailRoutes = require('./routes/emailRoutes');
// const replyemailRoutes = require('./routes/replyemailRoutes');
// const trashManageRoutes = require('./routes/moveToTrashRoute');
// const Email = require('./Model/EmailModel');
// const User = require('./Model/UserModel');
// const { permanentlyDeleteEmails } = require('./utilities/deleteOnDateMail');

// // Environment Configuration
// dotenv.config();

// // MongoDB Connection
// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
//     console.log('MongoDB connected successfully');
//   } catch (error) {
//     console.error('MongoDB connection error:', error.message);
//     process.exit(1); // Exit on DB connection failure
//   }
// };

// // Initialize Express App
// const app = express();

// connectDB();

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.static(path.join(__dirname, 'public')));

// // CORS Settings for Allowed Origins
// app.use((req, res, next) => {
//   res.setHeader('Access-Control-Allow-Origin', process.env.DOMAIN || 'http://localhost:3000');
//   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//   next();
// });

// // Routes
// app.use('/api', endPoint);
// app.use('/api/user', authRoutes);
// app.use('/api/email', emailRoutes);
// app.use('/api/replyemail', replyemailRoutes);
// app.use('/api/trashmanageemail', trashManageRoutes);

// // 404 Error Handler
// app.use((req, res) => {
//   res.status(404).json({ error: 'Resource not found. Please check the URL.' });
// });

// // General Error Handler
// app.use((err, req, res, next) => {
//   console.error('Error:', err);
//   res.status(err.status || 500).json({
//     message: err.message || 'Internal Server Error',
//     error: process.env.NODE_ENV === 'development' ? err : {}
//   });
// });

// // HTTP Server
// const httpPort = process.env.PORT || 3000;
// app.listen(httpPort, () => {
//   console.log(`HTTP server running on port ${httpPort}`);
// });

// // SMTP Server with SSL
// const smtpPort = process.env.SMTP_PORT || 465; // SSL port
// const smtpServer = new SMTPServer({
//   secure: true, // Enforces SSL
//   key: fs.readFileSync(path.join(__dirname, 'cert', 'key.pem')),
//   cert: fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem')),
//   authOptional: true,
//   onConnect(session, cb) {
//     console.log('onconnect', session.id)
//     cb()
//   },
//   onMailFrom(address, session, cb) {
//     console.log('onMailFrom', address.address, session.id)
//     cb()
//   },
//   onRcptTo(address, session, cb) {
//     console.log('onRcptTo', address.address, session.id)
//     cb()
//   },

//   async onData(stream, session, callback) {
//     console.log('here in check function while we receive mail.')
//     let emailData = '';
//     stream.on('data', (chunk) => {
//       emailData += chunk.toString();
//     });

//     stream.on('end', async () => {
//       try {
//         // Parse the email using mailparser
//         const parsed = await simpleParser(emailData);
//         const { from, to, subject, text, html, attachments } = parsed;

//         // Get recipient email
//         const recipient = to && to.value && to.value[0].address;
//         const user = await User.findOne({ email: recipient });

//         if (!user) {
//           console.error(`User not found for recipient email: ${recipient}`);
//           return callback(new Error(`Recipient ${recipient} not found`));
//         }

//         // Prepare email document
//         const email = new Email({
//           from: from.text,
//           to: to.value.map((item) => item.address),
//           subject,
//           text,
//           html,
//           folder: 'inbox',
//           user_id: user._id
//         });

//         // Handle attachments
//         if (attachments && attachments.length > 0) {
//           email.attachments = [];

//           for (const attachment of attachments) {
//             const filePath = path.join(__dirname, 'uploads', attachment.filename);
//             fs.writeFileSync(filePath, attachment.content); // Save the attachment
//             email.attachments.push({ filename: attachment.filename, path: filePath });
//           }
//         }

//         // Save email
//         await email.save();
//         callback(null);
//       } catch (error) {
//         console.error('Error processing email:', error.message);
//         callback(new Error('Error processing email data'));
//       }
//     });
//   },

//   onError(err) {
//     console.error('SMTP server error:', err.message);
//   }
// });

// // Ensure uploads directory exists
// if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
//   fs.mkdirSync(path.join(__dirname, 'uploads'));
// }

// // Start SMTP Server
// smtpServer.listen(smtpPort, () => {
//   console.log(`SMTP server running on port ${smtpPort}`);
// });














// // Imports
// const express = require('express');
// const dotenv = require('dotenv');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const { SMTPServer } = require('smtp-server');
// const { simpleParser } = require('mailparser');
// const fs = require('fs');
// const path = require('path');
// const cron = require('node-cron');

// // Import Models
// const Email = require('./Model/EmailModel');
// const User = require('./Model/UserModel');

// // Import Routes
// const authRoutes = require('./routes/authRoutes');
// const emailRoutes = require('./routes/emailRoutes');
// const replyemailRoutes = require('./routes/replyemailRoutes');
// const trashManageRoutes = require('./routes/moveToTrashRoute');
// const endPoint = require('./routes/index');

// // Load Environment Variables
// dotenv.config();

// // MongoDB Connection
// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });
//     console.log('MongoDB connected successfully');
//   } catch (error) {
//     console.error('MongoDB connection error:', error.message);
//     process.exit(1);
//   }
// };

// // Initialize Express App
// const app = express();
// connectDB();

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.static(path.join(__dirname, 'public')));

// // CORS Configuration
// app.use((req, res, next) => {
//   res.setHeader('Access-Control-Allow-Origin', process.env.DOMAIN || 'http://localhost:3000');
//   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//   next();
// });

// // Routes
// app.use('/api', endPoint);
// app.use('/api/user', authRoutes);
// app.use('/api/email', emailRoutes);
// app.use('/api/replyemail', replyemailRoutes);
// app.use('/api/trashmanageemail', trashManageRoutes);

// // Scheduled Task for Deleting Emails
// cron.schedule('0 0 * * *', async () => {
//   console.log('Running scheduled email deletion task...');
//   await permanentlyDeleteEmails();
// });

// // SSL Configuration for SMTP
// const sslOptions = {
//   key: fs.readFileSync(path.join(__dirname, 'cert', 'key.pem')),
//   cert: fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem')),
// };

// // SMTP Server
// const smtpServer = new SMTPServer({
//   secure: true,
//   ...sslOptions,
//   authOptional: true,
//   onConnect(session, cb) {
//     console.log('onconnect', session.id)
//     cb()
//   },
//   onMailFrom(address, session, cb) {
//     console.log('onMailFrom', address.address, session.id)
//     cb()
//   },
//   onRcptTo(address, session, cb) {
//     console.log('onRcptTo', address.address, session.id)
//     cb()
//   },
//   async onData(stream, session, callback) {
//     let emailData = '';
//     stream.on('data', (chunk) => {
//       emailData += chunk.toString();
//     });

//     stream.on('end', async () => {
//       try {
//         const parsed = await simpleParser(emailData);
//         const { from, to, cc, bcc, subject, text, html, attachments } = parsed;

//         const recipientEmail = to?.value?.[0]?.address;
//         const user = await User.findOne({ email: recipientEmail });

//         if (!user) {
//           console.error(`User not found for email: ${recipientEmail}`);
//           return callback(new Error(`Recipient ${recipientEmail} not found`));
//         }

//         const email = new Email({
//           from: from.text,
//           to: to.value.map((item) => item.address),
//           cc: cc ? cc.value.map((item) => item.address) : [],
//           bcc: bcc ? bcc.value.map((item) => item.address) : [],
//           subject,
//           text,
//           html,
//           folder: 'inbox',
//           starred: false,
//           conversation: false,
//           watched: false,
//           user_id: user._id,
//         });

//         if (attachments?.length > 0) {
//           email.attachments = [];
//           const uploadDir = path.join(__dirname, 'uploads');
//           if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

//           for (const attachment of attachments) {
//             const filePath = path.join(uploadDir, attachment.filename);
//             fs.writeFileSync(filePath, attachment.content);
//             email.attachments.push({ filename: attachment.filename, path: filePath });
//           }
//         }

//         await email.save();
//         callback(null);
//       } catch (error) {
//         console.error('Error processing email:', error.message);
//         callback(new Error('Error processing email data'));
//       }
//     });
//   },

//   onError(err) {
//     console.error('SMTP server error:', err.message);
//   },
// });

// // Ensure the uploads directory exists
// if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
//   fs.mkdirSync(path.join(__dirname, 'uploads'));
// }

// // Start SMTP Server
// const smtpPort = process.env.SMTP_PORT || 465;
// smtpServer.listen(smtpPort, (err) => {
//   if (err) {
//     console.error(`Failed to start SMTP server on port ${smtpPort}:`, err.message);
//   } else {
//     console.log(`Secure SMTP server running on port ${smtpPort}`);
//   }
// });

// // HTTP Server
// const httpPort = process.env.PORT || 3000;
// const httpServer = app.listen(httpPort, () => {
//   console.log(`HTTP server running on port ${httpPort}`);
// });

// // Graceful Shutdown
// const gracefulShutdown = () => {
//   console.log('Graceful shutdown initiated...');
//   if (httpServer) {
//     httpServer.close(() => console.log('HTTP server closed gracefully.'));
//   }
//   if (smtpServer) {
//     smtpServer.close(() => console.log('SMTP server closed gracefully.'));
//   }
//   process.exit(0);
// };

// process.once('SIGUSR2', gracefulShutdown);
// process.on('SIGINT', gracefulShutdown);
// process.on('SIGTERM', gracefulShutdown);

// module.exports = app;
