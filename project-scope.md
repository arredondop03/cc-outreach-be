# Project Scope

## Problem
Reaching out to people at companies I'm interested in working at is repetitive and messy.
When I reach out to multiple people, I might forget to follow up, what I have already sent, who I have already contacted at a company, etc.

## Solution
A CRM-like application (single user) where the system does the repetitive work (enrichment, message drafting, scheduling) and tells me exactly which task to do next each day.

## Users and Scale
- Single user (me). One account, email and password login, no signup.
- Monday-Friday: send at least 10 emails per day (initial or follow-up) and complete every other scheduled follow-up (LinkedIn).
- Saturday-Sunday: prepare the following week. Review scheduled tasks and make sure all contacts I'll reach out to are enriched.

## V1 Success Criteria
I can complete a sequence with a contact and start a sequence with the next contact from the same company, mostly from within the app. Emails are sent from the app after I review them. Only sending LinkedIn requests and reading replies happen outside the app.

## Sequence
Each contact goes through 5 steps across 2 channels (email, LinkedIn), spaced 3 business days apart (weekends and holidays excluded):
1. Initial email
2. LinkedIn connection request
3. Follow-up email 1
4. Follow-up email 2
5. Breakup email

Rules:
- Only one contact per company can be in a sequence at a time.
- After the breakup email and a waiting period, the contact becomes `done` and I start a sequence with another contact from the same company.
- When a contact engages, they leave the sequence: status becomes `engaged` and the next pending follow-up is deleted. I keep logging activity for them. The company stays `active`, and no other contact at it can start a sequence.

## Statuses

### Contacts
- `new`: enriched and ready for the initial email.
- `in_sequence`: contacted at least once and currently in the sequence.
- `engaged`: responded to a message; out of the sequence. Activity logging continues.
- `done`: never answered, asked not to be contacted, or the company was archived.
- `never_contacted`: never contacted (e.g. company archived before outreach).

### Follow-ups
- `pending`: scheduled.
- `completed`: task done.
- `wont_do`: decided not to do the task.

### Companies
- `new`: company created.
- `ready_for_sequence`: has an associated contact with status `new`.
- `active`: has a contact currently in a sequence.
- `archived`: no longer interested in the company. On archive, all its contacts become `done` or `never_contacted`, and all its pending follow-ups become `completed` or `wont_do`.

## Features (V1)

### Companies and contacts
- Create a company from its LinkedIn URL; enrichment via an Apify actor.
- Contact data comes from the existing `all_contacts` data (copied once from Supabase into the app's PostgreSQL database, then used as a read-only source) or an Apify actor.
- Manual create for companies and contacts (full CRUD for both).

### Message generation
- Drafts depend on: the contact's role, the job post, my experience, the sequence step, what I've already sent that person.
- Length: short and direct. 20-39 words for emails, up to 200 characters for LinkedIn connection requests .
- I review and edit every message before it is used.
- Email: the draft is stored in the app and edited there. Once I have reviewed it, I click send and the app sends it through SendGrid. Follow-ups are threaded under the original email. Replies go to my own mailbox.
- LinkedIn: I copy and paste the message.

### Daily task view
- Shows the first task scheduled for the day.
- Overdue follow-ups stay pending and come first. Order: all follow-ups first, then new initial emails until the daily goal (10 sent emails) is met.
- Sending an email completes its task and logs the interaction automatically. For LinkedIn tasks, clicking "next" does the same.

### Weekly planning view (next week)
- Per day: the follow-ups scheduled, and whether enough contacts are enriched to reach the 10-email goal. If not, show how many are missing.
- If a contact has completed their last step, flag that I need to select a new contact for that company, with the ability to do it from this view.

### Activity logging
- Automatic when completing a task, including every email sent from the app.
- Manual logging of inbound and outbound interactions, as separate actions. Inbound replies are always logged by hand, since replies arrive in my mailbox, not the app.
- Activity history displayed per contact/company.

## Out of Scope for V1
- Analytics (data is collected only).
- Job post discovery ("show new job posts relevant for me"): V2.
- Sending LinkedIn messages from the app (email is sent from the app via SendGrid).
- Automatic reply detection or inbox sync.
- Sending without review, bulk sending, or scheduled auto-send. Every email is sent by an explicit click.
- Multi-user support.

## Open Questions
- Testing: until a real sending domain is set up, use `parredondo2724@gmail.com` as the SendGrid sender, reply-to, and test recipient.
- Sending domain: which domain or verified sender to use in SendGrid, and which mailbox to use as the reply-to address. Cold outreach from a new domain may need warm-up and domain authentication to avoid spam filtering.

## Configuration
- Holidays (not business days, besides weekends): 2026-11-26, 2026-11-27, 2026-12-24, 2026-12-25, 2026-12-31, 2027-01-01, 2027-01-18.
- Waiting period after the breakup email: 3 business days.
