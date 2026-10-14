// Email notifications are sent from the browser of the person who writes, through EmailJS (emailjs.com).
// Fill the three values once and email starts working for everyone who chose "email" in their panel:
//   1. Create a free EmailJS account and connect an email service (Gmail, Outlook ...)  -> service id
//   2. Create a template whose variables are {{to_email}}, {{to_name}}, {{subject}}, {{message}}, {{link}}  -> template id
//   3. Account > API keys > public key                                                                       -> key
// The public key is meant to be public; restrict the allowed domain in the EmailJS dashboard to this site.
window.MS_NOTIFY = { emailjs: { service: '', template: '', key: '' } };