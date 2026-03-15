# Mission: Secure File-Drop & Persistent URL Shortener

## 1. Project Overview
Develop a high-security URL shortener and file-sharing application. The system must distinguish between **File Retention** (how long the file exists in the cloud) and **Link Access** (how long a specific short-link remains active).

## 2. Technical Stack Requirements
* **Backend:** Azure Functions (Isolated Worker Model) using **.NET 9**.
* **Data Layer:** Azure Cosmos DB using **Entity Framework Core 9**.
* **Storage:** Azure Blob Storage for file hosting.
* **Architecture:** Clean Architecture with strict **Interface-based** Dependency Injection.
* **Frontend:** React (Vite), Material-UI (MUI), TanStack Query (React Query), Axios.
* **Authentication:** `@react-oauth/google`.

## 3. Core Functional Requirements

### A. Persistent URL Shortener
* Standard shortened URLs must be **persistent** by default (no automatic expiry).
* Data Model must support standard redirection logic.

### B. File Retention Logic (The "Storage" Life)
* User must select a "Physical Retention" period for uploaded files.
* **Allowed Tiers:** 1 Hour, 1 Day, 3 Days, 1 Week, 2 Weeks, 1 Month, 2 Months, 3 Months.
* **Cleanup Policy:** Do NOT use Cosmos DB native TTL. Implement an `ICleanupService` triggered by a **Timer-Triggered Azure Function** (running every 30 minutes) to manually delete expired Blobs and Cosmos DB metadata.

### C. File Access URLs (The "Link" Life)
* When a file is uploaded, the system generates a "Short URL" for access.
* **Short-Link Expiry Tiers:** 15 Minutes, 1 Hour, or 1 Day.
* **Logic:** The link must stop working after this period, even if the file still exists in storage for 3 months.
* **Security:** Generate Azure Blob **SAS Tokens** that match the Link Expiry duration.

## 4. Data Models & Interface Scaffolding
* **Entities:**
    * `ShortUrl`: { Id, LongUrl, CreatedBy, IsPersistent }
    * `FileMetadata`: { Id, BlobName, StorageExpirationUtc, CreatedAt }
    * `AccessLink`: { Id, FileId, LinkExpirationUtc, ShortCode }
* **Interfaces:**
    * `IFileService`: Handle uploads and SAS token generation.
    * `ILinkService`: Handle short-code generation and redirection logic.
    * `IRetentionService`: Logic to calculate `DateTime.UtcNow` offsets for 15m through 3 months.

## 5. Agent Execution Steps
1.  **Phase 1:** Generate the C# POCOs and EF Core 9 DBContext configuration.
2.  **Phase 2:** Implement the `ICleanupService` and the Timer-Trigger Function logic.
3.  **Phase 3:** Build the Backend API (Azure Functions) for file processing and URL redirection.
4.  **Phase 4:** Build the React UI featuring an upload dashboard with dual-dropdowns for "File Retention" and "Link Expiry."
5.  **Phase 5:** Verify that a link with a 15-minute expiry returns a `410 Gone` after expiration, even if the storage retention is set to 3 months.

---
**Initial Artifacts Requested:** 1. System Architecture Diagram.
2. Cosmos DB Schema Design.
3. Retention Calculation Service Implementation.