# User Dashboard Backend Flow

This document explains how user dashboard data is stored so it is easy to inspect in MongoDB Compass.

## Collections

### `users`
Primary user profile document.

Important fields:
- `name`
- `email`
- `age`
- `bloodGroup`
- `city`
- `phone`
- `isAvailable`
- `lastDonationDate`

Use this collection to understand the latest saved profile state for each user.

### `userbloodrequests`
Stores blood requests created from the user dashboard.

Important fields:
- `user`: reference to the user who created the request
- `userName`: denormalized user name for easy reading in Compass
- `patientName`
- `bloodGroup`
- `units`
- `hospital`
- `hospitalName`
- `city`
- `reason`
- `patientCondition`
- `notes`
- `status`

This is user-scoped, so multiple users can create requests independently.

### `userdonationrecords`
Stores donation records added from the user dashboard.

Important fields:
- `user`: reference to the user
- `userName`: denormalized user name for easy reading in Compass
- `hospitalName`
- `bloodGroup`
- `unitsDonated`
- `donationDate`

Each user can have many donation records.

### `useractivitylogs`
Stores timeline-style actions performed by the user.

Important fields:
- `user`
- `userName`
- `type`
- `message`
- `meta`

Examples:
- profile updated
- blood request submitted
- donation completed

### `usernotifications`
Stores notification data for the user dashboard and floating notification alert.

Important fields:
- `user`
- `userName`
- `audience`
- `type`
- `title`
- `message`
- `details`
- `hospitalName`
- `location`
- `eventDate`
- `isActive`

Notification flow:
- `audience: "all_users"` means shared event notifications for every user
- `audience: "specific_user"` means the notification belongs to one user

This makes the collection readable in Compass:
- event notifications are shared
- request/profile/donation notifications are user-specific

## Flow

### 1. Profile Management
Frontend:
- `PATCH /api/user-dashboard/profile`

Backend:
- updates the `users` document
- syncs donor availability into `donors`
- creates an entry in `useractivitylogs`
- creates a user-specific entry in `usernotifications`

### 2. Create Blood Request
Frontend:
- `POST /api/user-dashboard/requests`

Backend:
- creates a document in `userbloodrequests`
- keeps request details structured: `reason`, `patientCondition`, `notes`
- creates an activity log entry
- creates a user-specific notification

### 3. Add Donation Record
Frontend:
- `POST /api/user-dashboard/donations`

Backend:
- creates a document in `userdonationrecords`
- updates `users.lastDonationDate` when needed
- syncs donor profile into `donors`
- creates an activity log entry
- creates a user-specific notification

### 4. Notifications shown on dashboard
Frontend:
- `GET /api/user-dashboard`

Backend:
- reads:
  - `usernotifications`
  - `useractivitylogs`
  - `userbloodrequests`
  - `userdonationrecords`
  - `bloodinventory`
  - `bloodrequests`
  - `hospitals`
- returns:
  - profile and overview
  - donation history
  - nearby hospitals
  - available blood inventory
  - emergency matches
  - notifications
  - recent activity

## Multi-user behavior

This design supports multiple users clearly:
- each user has one profile in `users`
- each user can have many blood requests in `userbloodrequests`
- each user can have many donation records in `userdonationrecords`
- each user can have many activity logs in `useractivitylogs`
- each user can have many personal notifications in `usernotifications`
- all users can also see shared event notifications in `usernotifications` with `audience: "all_users"`

For Compass readability, user-owned records now also store `userName` directly, so someone can identify ownership without manually resolving the `user` ObjectId.

In MongoDB Compass, you can filter by `user` to inspect one user's complete dashboard trail.
