# Billing System Testing Guide

## Overview
This guide helps you test the complete billing flow from admin bill generation to customer payment.

## Prerequisites
1. Backend server running on port 8000
2. Frontend running on port 8082 (or other available port)
3. Firebase authentication configured
4. At least one citizen user registered

## Testing Flow

### 1. Admin Login
- Navigate to the app
- Click on "Admin Login"
- Enter admin credentials
- Verify you're redirected to admin dashboard

### 2. Generate Section-wise Bills
- In admin dashboard, click the "Bills" button (top right)
- Click the lightning bolt icon (⚡) to open "Generate Section Bills"
- Select service type: Electricity, Water, Gas, or Air Pollution
- Fill in required fields:
  - Billing Period (e.g., "January 2024")
  - Due Date (e.g., "2024-12-31")
  - Base Rate, Unit Rate, Fixed Charges (optional)
- Toggle "Generate for all citizens" ON
- Click "Generate Bills"
- Verify success message with number of bills generated

### 3. Customer Login & Bill Display
- Logout from admin panel (click logout icon)
- Login as a citizen user
- Navigate to "Bills" tab
- Verify bills are displayed in sections:
  - ELECTRICITY section with electricity bills
  - WATER section with water bills
  - GAS section with gas bills
  - AIR POLLUTION section with air pollution bills
- Each section should show:
  - Section header with service type and bill count
  - Individual bill cards with bill number, amount, due date
  - Pay button for unpaid bills

### 4. Bill Payment Testing
- Click on any unpaid bill
- Verify payment screen shows:
  - Bill details (service type, amount, due date)
  - Payment method selection (UPI, Card, Net Banking, Wallet)
- Select UPI payment method
- Click "Pay [Amount]" button
- Verify payment processes and shows success screen
- Check receipt shows:
  - Transaction ID
  - Receipt Number
  - Bill Number
  - Service Type

### 5. Bill Status Verification
- Navigate back to Bills tab
- Verify paid bill shows:
  - Paid status badge
  - No "Pay Now" button
  - Green checkmark or paid indicator

## Key Features to Verify

### Admin Panel Features:
✅ Bill generation by service section
✅ Bulk bill generation for all citizens
✅ Customizable rates (base, unit, fixed charges)
✅ Service type selection (Electricity, Water, Gas, Air Pollution)
✅ Bill listing with citizen details

### Customer Panel Features:
✅ Section-wise bill organization
✅ Bill details display
✅ Multiple payment methods (UPI, Card, Net Banking, Wallet)
✅ Payment processing with receipt generation
✅ Bill status updates (pending → paid)
✅ Logout functionality

## Expected Behavior

### Bill Generation:
- Bills are created with "pending" status
- Each bill gets unique bill number (BILLXXXXXXX)
- Consumer numbers auto-generated (SERVICE_TYPE + first 8 chars of citizen ID)
- Amount calculated based on service type rates

### Payment Processing:
- Successful payments update bill status to "paid"
- Transaction IDs and receipt numbers generated
- Payment records stored with method details

### UI/UX:
- Responsive design for mobile and web
- Loading states during operations
- Error handling with user-friendly messages
- Consistent theming and styling

## Troubleshooting

### If bills don't appear:
1. Check admin bill generation was successful
2. Verify citizen user is logged in
3. Refresh customer bills page
4. Check browser console for errors

### If payment fails:
1. Verify backend server is running
2. Check Firebase authentication
3. Verify bill ID is valid
4. Check network connectivity

### If logout doesn't work:
1. Verify Firebase configuration
2. Check AsyncStorage permissions
3. Check browser console for errors

## Test Data Examples

### Electricity Bill:
- Service Type: Electricity
- Base Rate: ₹50
- Unit Rate: ₹5 per unit
- Fixed Charges: ₹50
- Typical Amount: ₹300-₹800

### Water Bill:
- Service Type: Water
- Base Rate: ₹30
- Unit Rate: ₹0.02 per liter
- Fixed Charges: ₹30
- Typical Amount: ₹50-₹230

### Gas Bill:
- Service Type: Gas
- Base Rate: ₹40
- Unit Rate: ₹15 per cubic meter
- Fixed Charges: ₹40
- Typical Amount: ₹190-₹1540

### Air Pollution Bill:
- Service Type: Air Pollution
- Base Rate: ₹200 (fixed)
- Typical Amount: ₹200

## Success Criteria
✅ Admin can generate bills by section
✅ Bills appear in correct customer sections
✅ Payment flow completes successfully
✅ Bill status updates correctly
✅ Receipt generation works
✅ Logout functionality works for both panels
✅ No console errors
✅ Responsive design maintained

## Notes
- All payments are mock/simulated for testing
- Bills are stored in Firestore
- Authentication uses Firebase Auth
- The system supports both English and Hindi languages
