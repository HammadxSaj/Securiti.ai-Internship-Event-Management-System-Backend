import 'dotenv/config'
import express from "express";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";
import cors from "cors";
// import { initializeNotificationService, listenForNewEvents } from './sendNotificationEmails.js';

const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors());
app.use(bodyParser.json());

app.get("/", async (_req, res) => {
  res.status(200).json({ hello: "world" });
});

app.post("/send-email", async (req, res) => {
  console.log(req);
  const { to, subject, html } = req.body;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Use `true` for port 465, `false` for all other ports
    auth: {
      user: process.env.Email,
      pass: process.env.Password,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: process.env.Email,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject: subject,
    html: html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    res.status(200).json({ message: "Emails sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ message: "Error sending email", error });
  }
});

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});


// initializeNotificationService();
// listenForNewEvents();