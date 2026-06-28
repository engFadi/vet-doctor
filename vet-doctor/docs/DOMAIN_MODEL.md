# Vet Doctor — Domain Model (source of truth)

This document is transcribed directly from the **Detailed Class Model (Figure 4)** and the
**Analysis Class Model (Figure 3)** in the Final Report (Section 3.1). Every Sequelize model,
enumeration, association, and the methods exposed through controllers/services must map to what
is recorded here. When a future task adds a model, it must match the classes below.

Datatype mapping used for implementation (Sequelize / SQLite):

| Report datatype | Sequelize type        |
| --------------- | --------------------- |
| Integer / int   | `INTEGER`             |
| String          | `STRING`              |
| Text            | `TEXT`                |
| Decimal         | `DECIMAL` / `FLOAT`   |
| Boolean         | `BOOLEAN`             |
| Date            | `DATEONLY`            |
| DateTime        | `DATE`                |
| `<enum>`        | `ENUM(...)`           |

---

## Enumerations

| Enum                | Values                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `AppointmentStatus` | REQUESTED, CONFIRMED, EN_ROUTE, IN_PROGRESS, COMPLETED, CANCELLED, VETERINARIAN_ASSIGNED, UNACKNOWLEDGED, REASSIGNED, ESCALATED |
| `AccountStatus`     | ACTIVE, LOCKED, PENDING_APPROVAL, SUSPENDED                                                                    |
| `ServiceType`       | ROUTINE_CHECK_UP, EMERGENCY_VISIT, FARM_VISIT                                                                  |
| `AvailabilityStatus`| AVAILABLE, UNAVAILABLE, BOOKED                                                                                 |
| `ConsultationStatus`| PENDING, ACCEPTED, DECLINED, COMPLETED                                                                         |
| `ReviewStatus`      | PENDING, APPROVED, REMOVED                                                                                     |
| `PaymentMethod`     | CASH_ON_DELIVERY, CREDIT_DEBIT_CARD                                                                            |
| `PaymentStatus`     | PENDING, PAID, FAILED, REFUNDED                                                                                |

---

## Classes

### RegisteredUser  *(abstract superclass)*
Attributes: `userId: Integer (PK)`, `fullName: String`, `email: String (unique)`,
`phoneNumber: String`, `passwordHash: String`, `address: String`,
`accountStatus: AccountStatus`, `registrationDate: DateTime`, `failedLoginAttempts: Integer`
Operations: `login(email, password): Boolean`, `logout(): void`, `resetPassword(token): void`,
`updateProfile(): void`
> Implementation note: modeled as a single `User` table with a `role` discriminator
> (`client` / `veterinarian` / `admin`) plus role-specific tables/columns below.

### Customer  *(extends RegisteredUser)*
Attributes: `customerType: String`  *(pet owner / farmer)*
Operations: `bookAppointment(service, serviceArea, dateTime): Appointment`,
`rescheduleAppointment(appointment, newDateTime): void`,
`makePayment(invoice, method): Payment`, `cancelAppointment(appointment): void`,
`requestConsultation(): ConsultationRequest`, `trackAppointment(appointment): AppointmentStatus`

### Veterinarian  *(extends RegisteredUser)*
Attributes: `licenseNumber: String`, `specialization: String`, `serviceArea: String`,
`yearsOfExperience: Integer`, `profilePhoto: String`, `averageRating: Decimal`,
`isApproved: Boolean`
Operations: `conductAppointment(appointment): void`,
`updateAppointmentStatus(appointment, status): void`, `manageAvailability(slot): void`,
`submitMedicalRecord(appointment): MedicalRecord`, `acknowledgeEmergency(appointment): void`,
`declineEmergency(appointment): void`, `respondToConsultation(request, accept: Boolean): void`

### Administrator  *(extends RegisteredUser)*
Operations: `approveVeterinarian(vet): void`,
`manageUserAccountStatus(user, status, reason): void`, `configureServicePrices(service): void`,
`moderateReview(review): void`, `generatePerformanceReport(period): PerformanceReport`,
`suspendAccount(user, reason): void`

### Appointment
Attributes: `appointmentId: Integer (PK)`, `appointmentDateTime: DateTime`,
`visitLocation: String`, `reasonForVisit: Text`, `status: AppointmentStatus`,
`priorityFlag: Boolean`, `followUpDate: Date [0..1]`, `acknowledgedAt: DateTime`
Operations: `create(): void`, `cancel(): void`, `reschedule(newDateTime): void`,
`updateStatus(status): void`, `flagForFollowUp(date): void`

### Service
Attributes: `serviceId: Integer (PK)`, `serviceType: ServiceType`, `name: String`,
`description: Text`, `basePrice: Decimal`, `estimatedDuration: Integer`
Operations: `updatePrice(newPrice): void`, `getDetails(): String`

### AvailabilitySlot
Attributes: `slotId: Integer (PK)`, `date: Date`, `startTime: DateTime`, `endTime: DateTime`,
`status: AvailabilityStatus`
Operations: `markUnavailable(): void`, `markBooked(): void`, `isAvailable(): Boolean`

### Animal
Attributes: `animalId: Integer (PK)`, `name: String`, `species: String`, `breed: String`,
`age: Integer`, `weight: Decimal`, `gender: String`
Operations: `getProfile(): String`, `updateDetails(): void`

### MedicalRecord
Attributes: `recordId: Integer (PK)`, `visitDate: Date`, `diagnosis: Text`,
`attachedFiles: String`, `createdAt: DateTime`
Operations: `createRecord(): void`, `attachFile(file): void`, `viewRecord(): String`

### Prescription
Attributes: `prescriptionId: Integer (PK)`, `medicationName: String`, `dosage: String`,
`frequency: String`, `duration: String`, `instructions: Text`, `issuedDate: Date`
Operations: `generatePDF(): void`, `getDetails(): String`

### Invoice
Attributes: `invoiceId: Integer (PK)`, `issueDate: Date`, `baseAmount: Decimal`,
`additionalCharges: Decimal`, `totalAmount: Decimal`, `status: PaymentStatus`
Operations: `generateInvoice(): void`, `calculateTotal(): Decimal`,
`addCharges(description, amount): void`, `downloadPDF(): void`

### Payment
Attributes: `paymentId: Integer (PK)`, `amount: Decimal`, `paymentMethod: PaymentMethod`,
`paymentStatus: PaymentStatus`, `paymentDate: DateTime`, `maskedCardReference: String [0..1]`
Operations: `processPayment(): Boolean`, `refund(): void`, `getReceipt(): String`

### CreditCard
Attributes: `cardNumber: String`, `cardHolderName: String`, `expiryDate: String`
Operations: `requestAuthorization(bankSystem): Boolean`
> Per SR6.15/SR6.16: full card numbers are never persisted — only `maskedCardReference`.

### Cash
Attributes: `receiptId: Integer`
Operations: `printReceipt(): String`

### Review
Attributes: `reviewId: Integer (PK)`, `rating: Integer (1..5)`, `reviewText: Text`,
`status: ReviewStatus`, `submissionDate: DateTime`
Operations: `submit(): void`, `moderate(status): void`, `remove(reason): void`

### ConsultationRequest
Attributes: `requestId: Integer (PK)`, `requestDate: DateTime`, `consultationType: String`,
`status: ConsultationStatus`, `scheduledTime: DateTime [0..1]`
Operations: `sendRequest(): void`, `accept(): void`, `decline(): void`

### PerformanceReport
Attributes: `reportId: Integer (PK)`, `generatedDate: Date`, `reportPeriod: String`,
`totalBookings: Integer`, `totalRevenue: Decimal`, `profitMargin: Decimal`
Operations: `generate(): void`, `exportPDF(): void`, `exportSpreadsheet(): void`

### VetRegistry  *(service/helper)*
Attributes: `registryId: Integer`
Operations: `findNextQualifiedVet(specialization, serviceArea, slot): Veterinarian [0..1]`
> Used for automatic vet assignment (SR3.8) and emergency reassignment (Use Case 4 / E1).

---

## External systems (mocked services)

### NotificationSystem  *(→ `src/services/notificationService.js`)*
Attributes: `notificationId: Integer`
Operations: `sendNotification(to, subject, body): Boolean`

### BankPaymentSystem  *(→ `src/services/paymentGateway.js`)*
Attributes: `bankSystemId: Integer`
Operations: `authorize(cardNumber, amount): Boolean`

---

## Relationships (from the class diagram)

- `RegisteredUser` ◁—— `Customer`, `Veterinarian`, `Administrator`  *(generalization)*
- `Customer` 1 ——< `Animal` *(a client owns many animals)*
- `Customer` 1 ——< `Appointment` >—— 1 `Veterinarian`
- `Appointment` 1 —— 1 `Service`
- `Appointment` 1 —— 0..1 `Invoice` 1 —— 0..1 `Payment`
- `Payment` ◁—— `CreditCard`, `Cash`
- `CreditCard` ——> `BankPaymentSystem`
- `Veterinarian` 1 ——< `AvailabilitySlot`
- `Appointment` 1 ——< `MedicalRecord` 1 ——< `Prescription`
- `MedicalRecord` >—— 1 `Animal`
- `Appointment` 1 —— 0..1 `Review` >—— 1 `Veterinarian`
- `Appointment` 1 ——< `ConsultationRequest`
- `Administrator` ——> `PerformanceReport`
- `VetRegistry` ——> `Veterinarian` *(queries for assignment)*
- System ——> `NotificationSystem` *(«include» Send Notification across use cases)*

---

_Source: Vet Doctor Final Report (COMP433, Group 10), Section 3.1 — Figures 3 & 4._
