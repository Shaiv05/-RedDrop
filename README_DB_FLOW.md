# RedDrop DB Flow (Hospital Dashboard)

This file explains how hospital dashboard data is stored and how to inspect it quickly in MongoDB Compass.

## 1. Data Flow Diagram

```text
Hospitals (master)
   |
   | hospital _id
   v
BloodRequests -----------------------> EmergencyHospitals
   |                                      |
   | request _id                          | mirrors urgent hospital request context
   v                                      v
DonationRecords <------------------- Hospital Dashboard Actions
   |
   | updates stock context
   v
BloodInventories
   |
   | every important update logs
   v
ActivityLogs

Donors (global pool) -> used by dashboard for donor management/listing
```

## 2. Core Collections

- `hospitals`
- `donors`
- `bloodrequests`
- `emergencyhospitals`
- `bloodinventories`
- `donationrecords`
- `activitylogs`

## 3. Ownership Fields (Dashboard Collections)

The following collections explicitly include hospital identity fields:

- `bloodinventories`
- `donationrecords`
- `activitylogs`

Each document includes:

- `hospital` (ObjectId reference)
- `hospitalName`
- `hospitalEmail`
- `hospitalLicenseNumber`
- `dashboardScope` = `"hospital_dashboard"`

This makes hospital ownership obvious directly in Compass.

## 4. Suggested Reading Order in Compass

Open in this order for best understanding:

1. `hospitals`
2. `bloodrequests`
3. `emergencyhospitals`
4. `bloodinventories`
5. `donationrecords`
6. `activitylogs`
7. `donors`

## 5. Ready-to-Copy Compass Filters

Replace `<HOSPITAL_OBJECT_ID>` and `<HOSPITAL_EMAIL>` with real values.

### 5.1 Find a hospital first

```json
{ "email": "<HOSPITAL_EMAIL>" }
```

### 5.2 Requests for one hospital

```json
{ "hospital": { "$oid": "<HOSPITAL_OBJECT_ID>" } }
```

### 5.3 Urgent open requests for one hospital

```json
{
  "hospital": { "$oid": "<HOSPITAL_OBJECT_ID>" },
  "isUrgent": true,
  "status": "open"
}
```

### 5.4 Emergency dashboard entries for one hospital

```json
{ "hospital": { "$oid": "<HOSPITAL_OBJECT_ID>" } }
```

### 5.5 Inventory rows for one hospital

```json
{ "hospital": { "$oid": "<HOSPITAL_OBJECT_ID>" } }
```

### 5.6 Low stock alerts in inventory

```json
{
  "hospital": { "$oid": "<HOSPITAL_OBJECT_ID>" },
  "$expr": { "$lte": ["$units", "$minLevel"] }
}
```

### 5.7 Donation records for one hospital

```json
{ "hospital": { "$oid": "<HOSPITAL_OBJECT_ID>" } }
```

### 5.8 Activity logs for one hospital

```json
{ "hospital": { "$oid": "<HOSPITAL_OBJECT_ID>" } }
```

### 5.9 Dashboard-scoped documents (ownership check)

```json
{ "dashboardScope": "hospital_dashboard" }
```

### 5.10 Find records missing ownership fields (audit check)

For `bloodinventories`, `donationrecords`, or `activitylogs`:

```json
{
  "$or": [
    { "hospitalName": { "$exists": false } },
    { "hospitalName": "" },
    { "hospitalEmail": { "$exists": false } },
    { "hospitalLicenseNumber": { "$exists": false } }
  ]
}
```

## 6. Quick CLI Helpers

Run from `backend`:

- Reset dashboard collections:
  - `npm run reset:dashboard`
- Seed dashboard data:
  - `npm run seed:dashboard`
- Backfill ownership fields:
  - `npm run backfill:dashboard`

## 7. Expected Flow for One Hospital Action

Example: hospital marks a request completed.

1. Request status changes in `bloodrequests`.
2. (Optional) donation entry saved in `donationrecords`.
3. Inventory changes in `bloodinventories`.
4. Action appears in `activitylogs`.

This gives traceable, hospital-scoped history across collections.
