Internship Application Tracker
Overview
This web application helps streamline the internship application process by automatically tracking your applications directly from your Gmail account. It intelligently parses your emails to identify application statuses, company names, and job roles, then organizes them into a clean, easy-to-use Kanban board.

Features
Automatic Tracking: Connects securely to your Gmail account to find and parse application-related emails.

AI-Powered Parsing: Uses the Google Gemini API to accurately extract company and role information from email subjects, even with varied formats.

Kanban Dashboard: Visualizes your application pipeline with columns for "Applied," "Assessment," "Interview," "Offer," and "Rejected."

Latest Status Updates: Automatically consolidates multiple emails for the same role, ensuring only the most recent status is displayed.

Smart Filtering: Intelligently filters out irrelevant emails (like university course notifications) for a cleaner board.

Secure Authentication: Uses the official Google Identity Services (OAuth 2.0) for secure, read-only access to your emails.

How It Works
The application follows a three-step process to build your dashboard:

Gmail API Scan: It first queries the Gmail API for all emails in the last 6 months containing keywords like "application," "interview," or "offer," while filtering out common irrelevant terms.

Gemini API Extraction: The subject lines of these emails are then sent in batches to the Google Gemini API. The AI model extracts the company name and job role from each subject and returns it as structured JSON.

Frontend Rendering: The application combines the company/role data from Gemini with a local keyword search on the email content to determine the application's status. This information is then used to render the final Kanban board.

Setup and Installation
To run this project locally, you will need to set up a project in the Google Cloud Console and get three separate credentials.

Prerequisites
Visual Studio Code (or any other code editor).

The Live Server extension for VS Code.

Step-by-Step Instructions
Clone or Download the Repository:
Get the three project files (index.html, style.css, script.js) and place them in a single folder on your computer.

Create a Google Cloud Project:

Go to the Google Cloud Console.

Create a new project.

Enable the Gmail API:

In your new project, navigate to APIs & Services > Library.

Search for "Gmail API" and click Enable.

Create OAuth 2.0 Client ID (for Gmail):

Go to APIs & Services > OAuth consent screen.

Choose External user type and fill in the required app information (app name, user support email).

Under Test users, add the Google email addresses you want to test the app with.

Now, go to APIs & Services > Credentials.

Click + CREATE CREDENTIALS and select OAuth client ID.

Choose Web application as the application type.

Under Authorized JavaScript origins, add http://localhost:5500 and http://127.0.0.1:5500.

Under Authorized redirect URIs, add http://localhost:5500 and http://127.0.0.1:5500.

Click Create. Copy the Client ID.

Create an API Key (for Gmail):

In Credentials, click + CREATE CREDENTIALS and select API key.

Copy the key.

Click on the new key to edit it. Under API restrictions, select Restrict key and choose the Gmail API.

Create a Gemini API Key:

Go to Google AI Studio.

Click Get API key and create a key in your Google Cloud Project.

Copy the key.

Add Credentials to script.js:

Open the script.js file.

Paste your three keys into the corresponding constants at the top of the file:

const GMAIL_API_KEY = 'YOUR_GMAIL_API_KEY_HERE';
const CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';

Launch the Application:

Open the project folder in VS Code.

Right-click the index.html file and select Open with Live Server.

Technologies Used
Frontend: HTML5, CSS3, Vanilla JavaScript

APIs:

Google Gmail API

Google Gemini API

Google Identity Services (OAuth 2.0)

Icons: Lucide Icons

Future Improvements
[ ] Allow users to manually add or edit applications.

[ ] Implement a backend server to securely store API keys instead of client-side.

[ ] Add drag-and-drop functionality to the Kanban board.

[ ] Integrate with Google Calendar to automatically add interview dates.