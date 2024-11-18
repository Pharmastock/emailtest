// Imports
const express = require('express');
const dotenv = require('dotenv');
const { SMTPServer } = require('smtp-server');
const mongoose = require('mongoose');
const cors = require('cors');
const { simpleParser } = require('mailparser');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const authRoutes = require('./routes/authRoutes');
const endPoint = require('./routes/index');
const emailRoutes = require('./routes/emailRoutes');
const replyemailRoutes = require('./routes/replyemailRoutes');
const trashManageRoutes = require('./routes/moveToTrashRoute');
const Email = require('./Model/EmailModel');
const User = require('./Model/UserModel'); // Import the User model
const { permanentlyDeleteEmails } = require('./utilities/deleteOnDateMail');


// Environment Configuration
dotenv.config();


// MongoDB Connection
const connectDB = async () => {
  // console.log('here in connections of dataabaase ')
  try {
    await mongoose.connect(process.env.MONGO_URI, { /* No deprecated options needed */ });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1); // Exit on DB connection failure
  }
};

// Initialize Express App
const app = express();

connectDB();

// Schedule the deletion function to run at midnight every day
cron.schedule('0 0 * * *', async () => {
  console.log('Running scheduled email deletion task...');
  await permanentlyDeleteEmails();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// CORS Settings for Allowed Origins
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.DOMAIN || 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, multipart/form-data');
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

// 404 Error Handler for Undefined Routes
app.use((req, res) => {
  res.status(404).json({ error: 'Resource not found. Please check the URL.' });
});

// General Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// HTTP Server Setup with Port Management
let httpPort = process.env.PORT || 3000;
let httpServer;

const startHttpServer = (port) => {
  httpServer = app.listen(port, () => {
    console.log(`HTTP server running on port ${port}`);
  });

  httpServer.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is in use. Trying next port...`);
      startHttpServer(port + 1);
    } else {
      console.error('HTTP server error:', error.message);
    }
  });
};

startHttpServer(httpPort);

// SMTP Server Setup with Dedicated Port
const smtpPort = process.env.SMTP_PORT || 25;
// const smtpServer = new SMTPServer({
//   authOptional: true,

//   async onData(stream, session, callback) {
//     let emailData = '';
//     stream.on('data', (chunk) => {
//       emailData += chunk.toString();
//     });

//     stream.on('end', async () => {
//       try {
//         // Parse email data
//         const { from, to, subject, text } = parseEmailData(emailData);

//         // Find the user by the recipient's email address
//         const user = await User.findOne({ email: to });

//         // If user not found, reject the email and notify the sender
//         if (!user) {
//           console.error(`User not found for recipient email: ${to}`);
//           return callback(new Error(`Recipient ${to} not found`)); // This will notify the sender
//         }

//         // If user is found, create and save the email
//         const email = new Email({
//           from,
//           to,
//           subject,
//           text,
//           folder: 'inbox',
//           user_id: user._id // Link email to the recipient's user ID
//         });
//         await email.save();

//         callback(null); // Successfully processed the email
//       } catch (error) {
//         console.error('Error saving email:', error.message);
//         callback(new Error('Error processing email data'));
//       }
//     });
//   },

//   onError(err) {
//     console.error('SMTP server error:', err.message);
//   }
// });

// Start SMTP Server
//
const smtpServer = new SMTPServer({
  // allowInsecureAuth: true,
  authOptional: true,
  // onConnect(session, cb) {
  //   console.log('onconnect', session.id)
  //   cb()
  // },
  // onMailFrom(address, session, cb) {
  //   console.log('onMailFrom', address.address, session.id)
  //   cb()
  // },
  // onRcptTo(address, session, cb) {
  //   console.log('onRcptTo', address.address, session.id)
  //   cb()
  // },

  async onData(stream, session, callback) {
    let emailData = '';
    stream.on('data', (chunk) => {
      console.log('emailDataemailData', emailData)
      emailData += chunk.toString();
    });

    stream.on('end', async () => {
      try {
        // Parse the email using mailparser
        const parsed = await simpleParser(emailData);
        const { from, to, cc, bcc, subject, text, html, attachments } = parsed;
        console.log(from, to, cc, bcc, subject, text, html, attachments)
        // Find the user by the recipient's email address
        const recipient = to && to.value && to.value[0].address;
        const user = await User.findOne({ email: recipient });

        if (!user) {
          console.error(`User not found for recipient email: ${recipient}`);
          return callback(new Error(`Recipient ${recipient} not found`)); // Notify the sender
        }

        // Prepare the email document to save in the database
        const email = new Email({
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
          user_id: user._id // Link email to the recipient's user ID
        });

        // Handle attachments
        if (attachments && attachments.length > 0) {
          email.attachments = [];

          for (const attachment of attachments) {
            // Check file size (2GB = 2147483648 bytes)
            if (attachment.size > 2147483648) {
              console.error('Attachment size exceeds the maximum limit of 2GB');
              return callback(new Error('Attachment size exceeds the maximum limit of 2GB'));
            }

            // Save attachment to disk
            const filePath = path.join(__dirname, 'uploads', attachment.filename);
            const writeStream = fs.createWriteStream(filePath);
            attachment.content.pipe(writeStream);

            // Wait until the file is fully written
            await new Promise((resolve, reject) => {
              writeStream.on('finish', resolve);
              writeStream.on('error', reject);
            });

            // Store the file path in the email document's attachments
            email.attachments.push({ filename: attachment.filename, path: filePath });
          }
        }

        // Save the email to the database
        await email.save();
        callback(null); // Successfully processed the email
      } catch (error) {
        console.error('Error processing email:', error.message);
        callback(new Error('Error processing email data'));
      }
    });
  },

  onError(err) {
    console.error('SMTP server error:', err.message);
  }
});

// Ensure the uploads directory exists
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

// Start listening on the specified SMTP port
smtpServer.listen(smtpPort, (err) => {
  if (err) {
    console.error(`Failed to start SMTP server on port ${smtpPort}:`, err.message);
  } else {
    console.log(`SMTP server running on port ${smtpPort}`);
  }
});

// Graceful Shutdown for Nodemon Restart or Exit
const gracefulShutdown = () => {
  console.log('Graceful shutdown initiated...');
  if (httpServer) {
    httpServer.close(() => console.log('HTTP server closed gracefully.'));
  }
  if (smtpServer) {
    smtpServer.close(() => console.log('SMTP server closed gracefully.'));
  }
  process.exit(0);
};

process.once('SIGUSR2', gracefulShutdown);

// Helper Function to Parse Email Data
function parseEmailData(emailData) {
  const from = emailData.match(/From: (.+)/)?.[1] || '';
  const to = emailData.match(/To: (.+)/)?.[1] || '';
  const subject = emailData.match(/Subject: (.+)/)?.[1] || '';
  const text = emailData.replace(/^(From|To|Subject): .+$/gm, '').trim();
  return { from, to, subject, text };

}

module.exports = app;
