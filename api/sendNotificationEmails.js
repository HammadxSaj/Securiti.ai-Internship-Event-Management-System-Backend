import 'dotenv/config';
import axios from 'axios';
import { getFirestore, doc, getDoc, collection, getDocs, updateDoc, onSnapshot } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import https from 'https';
// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBAxvi2Ir8A7t7TxSJTIa_GPGquPySpuXs",
  authDomain: "eventiti-ec4f0.firebaseapp.com",
  projectId: "eventiti-ec4f0",
  storageBucket: "eventiti-ec4f0.appspot.com",
  messagingSenderId: "524356556966",
  appId: "1:524356556966:web:27444a531f016d2eb43c67",
  measurementId: "G-HXJDLTVM65"
};
// Initialize Firebase
const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase);
const timers = {};
const votingEndDateListeners = {};
const agent = new https.Agent({ rejectUnauthorized: false });
// Fetch user emails
const fetchUserEmails = async () => {
  console.log("Fetching Emails");
  try {
    const usersCollection = collection(db, "users");
    const usersSnapshot = await getDocs(usersCollection);
    return usersSnapshot.docs.map(doc => doc.data().email);
  } catch (error) {
    console.error("Error fetching user emails:", error);
    return [];
  }
};
const sendVotingDateChangeEmail = async (eventId, previousDate, newDate) => {
  const userEmails = await fetchUserEmails();
  const eventName = await fetchEventName(eventId);
  let emailData;
  if (newDate > previousDate) {
    // Voting date extended
    emailData = {
      to: userEmails,
      subject: `Voting Date Extended for ${eventName}`,
      html: `
        <div>
          <p>Hi there,</p>
          <p>The voting period for the event ${eventName} has been extended! :ballot_box_with_ballot:</p>
          <p>You now have more time to cast your vote for your favorite idea.</p>
          <p>Best regards,<br>The Frontend Interns</p>
        </div>
      `,
    };
  } else {
    // Voting date shortened
    emailData = {
      to: userEmails,
      subject: `Voting Date Shortened for ${eventName}`,
      html: `
        <div>
          <p>Hi there,</p>
          <p>The voting period for the event ${eventName} has been shortened. :alarm_clock:</p>
          <p>Please make sure to cast your vote before the new deadline.</p>
          <p>Best regards,<br>The Frontend Interns</p>
        </div>
      `,
    };
  }
  try {
    console.log(`Sending voting date change email for event: ${eventId}`);
    // await axios.post("https://eventiti-backend.vercel.app/send-email", emailData, { httpsAgent: agent });
  } catch (error) {
    console.error(`Error sending date change email for event ${eventId}:`, error);
  }
};
// Fetch event name by ID
const fetchEventName = async (eventId) => {
  console.log("Fetching Events");
  try {
    const eventDoc = await getDoc(doc(db, "events", eventId));
    return eventDoc.exists() ? eventDoc.data().title : null;
  } catch (error) {
    console.error("Error fetching event name:", error);
    return null;
  }
};
const fetchWinnerIdeaName = async (eventId) => {
  try {
    const winnerIdeaDoc = await getDoc(
      doc(db, "events", eventId, "details", "winnerIdea")
    );
    if (winnerIdeaDoc.exists()) {
      return winnerIdeaDoc.data().title;
    }
  } catch (error) {
    console.error("Error fetching winner idea hosting date:", error);
  }
  return null;
};
const sendReminderEmail = async (eventId) => {
  try {
    const userEmails = await fetchUserEmails();
    const eventName = await fetchEventName(eventId);
    const reminderEmailData = {
      to: userEmails,
      subject: `Reminder: Voting Ends Soon for ${eventName}! Cast Your Vote Now!`,
      html: `
        <div>
          <p>Hi there,</p>
          <p>This is a friendly reminder that the voting period for the event ${eventName} is ending in less than an hour! :alarm_clock:</p>
          <p>Don't miss out on your chance to cast your vote for your favorite idea. Make sure your voice is heard!</p>
          <p>Thank you for participating in our event. Your opinion matters!</p>
          <p>Best regards,<br>The Frontend Interns</p>
        </div>
      `,
    };
    console.log(`Sending reminder email for event: ${eventId}`);
    await axios.post("https://eventiti-backend.vercel.app/send-email", reminderEmailData, { httpsAgent: agent });
  } catch (error) {
    console.error(`Error sending reminder email for event ${eventId}:`, error);
  }
};
// Check voting end date and send emails
const checkVotingAndSendEmails = async (eventId,votingDetailsData) => {
  try {
      const data = votingDetailsData;
      const votingEndDate = data.votingEndDate.toDate();
      const now = new Date();
      const winnerIdeaTitle= await fetchWinnerIdeaName(eventId); // Get the winner idea title
      const eventName = await fetchEventName(eventId);
      const emailSent = data.emailSent;
      const userEmails = await fetchUserEmails();
      console.log(`Winner Idea Title: ${winnerIdeaTitle}`);
      console.log(`Event Name: ${eventName}`);
      console.log(`Voting end date: ${votingEndDate}`);
      console.log(`Current date: ${now}`);
      if (now >= votingEndDate) {
        const emailData = {
          to: userEmails,
          subject: `Exciting News: The Winner for ${eventName} is ${winnerIdeaTitle}! Register Now!`,
          html: `
            <div>
              <p> Congratulations! :tada:</p>
              <p>We are thrilled to announce that the winner for the event ${eventName} is <strong>${winnerIdeaTitle}</strong>! :trophy::sparkles: Your incredible contribution has truly made a difference, and we couldn't be happier for you.</p>
              <p>Don't miss out on the excitement! :partying_face: Register now to stay updated and be part of the celebration.</p>
              <p>Thank you for being a part of our amazing community. We look forward to seeing you at the event!</p>
              <p>Warmest regards,<br>The Frontend Interns</p>
            </div>
          `,
        };
        if (!emailSent) {
          console.log(`Sending winnernotification email for event: ${eventId} and winner:${winnerIdeaTitle}`);
          await axios.post("https://eventiti-backend.vercel.app/send-email", emailData, { httpsAgent: agent });
          await updateDoc(doc(db, "events", eventId, "details", "votingDetails"), { emailSent: true });
        } else {
          console.log("Email already sent for event: ", eventId);
        }
      } else {
        console.log(`Voting has not ended yet for event: ${eventId}`);
      }
  } catch (error) {
    console.error(`Error processing event ${eventId}:`, error);
  }
};
// Set up listener for voting end date changes
const setVotingEndDateListener = (eventId) => {
  if (votingEndDateListeners[eventId]) {
    console.log(`Listener already set up for event: ${eventId}`);
    return;
  }
  const votingDetailsRef = doc(db, "events", eventId, "details", "votingDetails");
  let previousVotingEndDate = null;
  console.log(`Setting up listener for event: ${eventId}`);
  votingEndDateListeners[eventId] = onSnapshot(votingDetailsRef, async (docSnapshot) => {
    if (docSnapshot.exists()) {
      const data = docSnapshot.data();
      const votingEndDate = data.votingEndDate ? data.votingEndDate.toDate() : null;
      console.log(`Document data for event ${eventId}:`, data);
      if (previousVotingEndDate === null || (votingEndDate && previousVotingEndDate.getTime() !== votingEndDate.getTime())) {
        console.log(`Voting end date changed for event ${eventId}: ${previousVotingEndDate} to ${votingEndDate}`);
        if (timers[eventId]) {
          clearTimeout(timers[eventId]);
          console.log(`Cleared previous timer for event: ${eventId}`);
        }
        const currentTime = new Date();
        const timeUntilEnd = votingEndDate.getTime() - currentTime.getTime();
        console.log(`Time until end for event ${eventId}: ${timeUntilEnd} milliseconds`);
        if (timeUntilEnd > -10000) {
          // Add 30,000 milliseconds (30 seconds) to the timeUntilEnd
          const adjustedTimeUntilEnd = timeUntilEnd + 10000;
          timers[eventId] = setTimeout(async () => {
            console.log(`Timer triggered for event: ${eventId}`);
            await checkVotingAndSendEmails(eventId, data);
          }, adjustedTimeUntilEnd);
        } else {
          console.log(`Voting end date ${votingEndDate} has already passed for event: ${eventId}`);
        }
        if (timeUntilEnd > 3600000) {
          const reminderTime = timeUntilEnd - 3600000; // 1 hour before voting end
          timers[eventId] = setTimeout(async () => {
            console.log(`Reminder timer triggered for event: ${eventId}`);
            await sendReminderEmail(eventId);
          }, reminderTime);
        } else {
          console.log(`Voting end date ${votingEndDate} is less than one hour away for event: ${eventId}`);
        }
        if (previousVotingEndDate !== null) {
          try {
            await updateDoc(doc(db, "events", eventId, "details", "votingDetails"), { emailSent: false });
            console.log(`emailSent reset to false for event: ${eventId}`);
            await sendVotingDateChangeEmail(eventId, previousVotingEndDate, votingEndDate);
          } catch (error) {
            console.error(`Error updating emailSent for event ${eventId}:`, error);
          }
        }
        previousVotingEndDate = votingEndDate;
      }
    } else {
      console.log(`Voting details document does not exist for event: ${eventId}`);
    }
  }, (error) => {
    console.error(`Error handling snapshot for event ${eventId}:`, error);
  });
};
// Initialize notification service for existing events
const initializeNotificationService = async () => {
  try {
    const eventsCollection = collection(db, "events");
    const eventsSnapshot = await getDocs(eventsCollection);
    const eventIds = eventsSnapshot.docs.map(doc => doc.id);
    eventIds.forEach(eventId => setVotingEndDateListener(eventId));
  } catch (error) {
    console.error("Error fetching event IDs:", error);
  }
};
// Listen for new events in real-time
const listenForNewEvents = () => {
  const eventsCollectionRef = collection(db, "events");
  onSnapshot(eventsCollectionRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const newEventId = change.doc.id;
        console.log(`New event added: ${newEventId}`);
        setVotingEndDateListener(newEventId);
      }
    });
  }, (error) => {
    console.error("Error listening for new events:", error);
  });
};

export { initializeNotificationService, listenForNewEvents } 
// Start the services
// initializeNotificationService();
// listenForNewEvents();
console.log("Notification service and new event listener started.");