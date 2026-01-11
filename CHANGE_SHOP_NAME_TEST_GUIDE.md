# Change Shop Name - Test Guide

## Feature Overview
Vendors can now change their shop name at any time through WhatsApp chat.

### Commands
- `change name` - Start the name change process
- `rename shop` - Alternative command
- `edit name` - Alternative command

---

## How It Works

### Flow Diagram
```
Vendor types "change name"
    ↓
Bot shows current name and asks for new name
    ↓
Vendor types new name (or "cancel")
    ↓
Bot updates name in database
    ↓
Confirmation message shown
    ↓
Name updated on Customer PWA
```

---

## Test Scenarios

### Test 1: Change Shop Name (Happy Path)
**Steps:**
1. Open WhatsApp Demo: http://localhost:3000/whatsapp-demo.html
2. Complete onboarding or use existing vendor
3. Type: `change name`
4. See current name displayed
5. Type new name: `My New Shop Name`
6. See confirmation message

**Expected Result:**
```
✏️ Change Shop Name

Current name: [Old Name]

What would you like to rename your shop to?

Type the new name or "cancel" to keep current name.
```

Then after entering new name:
```
✅ Shop Name Updated!

Old name: [Old Name]
New name: My New Shop Name

Your shop name has been changed successfully!

Type "help" for more options.
```

**Status:** ✅ Should update name

---

### Test 2: Cancel Name Change
**Steps:**
1. Type: `change name`
2. Type: `cancel`

**Expected Result:**
```
❌ Name change cancelled.

Your shop name remains: [Current Name]

Type "help" for more options.
```

**Status:** ✅ Should keep old name

---

### Test 3: Invalid Name (Too Short)
**Steps:**
1. Type: `change name`
2. Type: `A` (single character)

**Expected Result:**
```
❌ Name too short. Please enter a valid shop name (at least 2 characters).
```

**Status:** ✅ Should reject and ask again

---

### Test 4: Verify on Customer PWA
**Steps:**
1. Change shop name via WhatsApp
2. Open Customer PWA: http://localhost:3000/
3. Click "🔄 Refresh" button
4. Click on your shop marker

**Expected Result:**
- ✅ Shop shows new name on map
- ✅ Shop details show new name
- ✅ Old name is gone

**Status:** ✅ Should sync to PWA

---

### Test 5: Alternative Commands
**Steps:**
1. Type: `rename shop` → Should work
2. Type: `edit name` → Should work

**Expected Result:**
- ✅ All commands trigger name change flow

**Status:** ✅ Should work

---

### Test 6: Name Change in Welcome Back Message
**Steps:**
1. Change shop name
2. Refresh page
3. Type: `start`

**Expected Result:**
```
👋 Welcome back, [New Name]!

✅ Your shop is already active!

📊 Shop Status:
• Name: [New Name]
...
```

**Status:** ✅ Should show new name

---

## Commands Reference

### Shop Management Commands
```
• "change name" - Change shop name
• "show products" - View all products
• "delete shop" - Remove entire shop
```

### Where to Find
- **Welcome back message** - Shows "change name" option
- **Help command** - Lists "change name" under Shop Management
- **Any time** - Can change name whenever needed

---

## Technical Details

### Files Modified
1. **whatsapp-bot.js**
   - Added `change_name` onboarding step
   - Added name change handler in `handleOngoingSupport()`
   - Added `updateVendorName()` method
   - Updated `isCommand()` to recognize name change commands
   - Updated help message
   - Updated welcome back message

### API Endpoint Used
```javascript
PUT /api/vendors/{vendorId}
Body: {
  "name": "New Shop Name",
  "businessName": "New Shop Name"
}
```

### Database Update
- Updates both `name` and `businessName` fields
- Changes reflect immediately in database
- Customer PWA shows updated name after refresh

---

## User Experience Flow

### Before
```
Vendor: "I want to change my shop name"
Bot: "Sorry, you need to delete shop and create new one"
Vendor: 😞 (loses all products and data)
```

### After
```
Vendor: "change name"
Bot: "What would you like to rename your shop to?"
Vendor: "New Name"
Bot: "✅ Shop Name Updated!"
Vendor: 😊 (keeps all products and data)
```

---

## Edge Cases Handled

### ✅ Empty Name
- Rejects names with less than 2 characters
- Asks user to try again

### ✅ Cancel Operation
- User can type "cancel" to abort
- Original name is preserved

### ✅ Database Error
- Shows error message if update fails
- Logs error to console
- User can try again

### ✅ No Vendor ID
- Only works for vendors with existing shops
- New vendors must complete onboarding first

---

## Integration Points

### 1. WhatsApp Bot
- Handles name change command
- Validates input
- Updates conversation state

### 2. Backend API
- PUT endpoint updates vendor
- Returns updated vendor data
- Validates name field

### 3. Customer PWA
- Fetches vendors from API
- Shows updated name on map
- Displays new name in shop details

---

## Success Criteria

| Criteria | Status |
|----------|--------|
| Can change name via WhatsApp | ✅ Yes |
| Name updates in database | ✅ Yes |
| Name shows on Customer PWA | ✅ Yes |
| Can cancel name change | ✅ Yes |
| Validates name length | ✅ Yes |
| Shows in help command | ✅ Yes |
| Shows in welcome message | ✅ Yes |
| Alternative commands work | ✅ Yes |

---

## Demo Script

### Quick Demo (1 minute)
```
"Let me show you how easy it is to change your shop name..."

1. Type "change name"
2. "My Awesome Food Stall"
3. "Done! Let's verify on the customer app..."
4. Open Customer PWA
5. Click Refresh
6. "See? The name is updated!"
```

### Full Demo (2 minutes)
```
"Sometimes vendors want to rebrand or fix a typo..."

1. Type "change name"
2. Show current name
3. Type new name
4. Show confirmation
5. Open Customer PWA
6. Show old name (before refresh)
7. Click Refresh
8. Show new name (after refresh)
9. "That's how easy it is!"
```

---

## Troubleshooting

### Issue: Name not updating on PWA
**Solution:**
1. Click "🔄 Refresh" button in Customer PWA
2. Check browser console for errors
3. Verify vendor ID exists
4. Check server logs

### Issue: "Failed to update shop name"
**Solution:**
1. Check server is running
2. Check database connection
3. Verify vendor exists in database
4. Check API endpoint is working

### Issue: Name change not persisting
**Solution:**
1. Check if vendor has realVendorId
2. Verify API call is successful
3. Check database for updated name
4. Refresh conversation state

---

## Future Enhancements (Optional)

### Nice to Have
1. **Name history** - Track previous names
2. **Name validation** - Check for profanity
3. **Duplicate check** - Warn if name exists
4. **Undo option** - Revert to previous name
5. **Preview** - Show how name looks before confirming

### Not Required Now
These are optional improvements, not critical for MVP.

---

## Conclusion

✅ **Feature Complete**

Vendors can now easily change their shop name through WhatsApp without losing any data. The change syncs to the Customer PWA immediately after refresh.

**Key Benefits:**
- ✅ Easy to use
- ✅ No data loss
- ✅ Instant updates
- ✅ Can cancel anytime
- ✅ Validates input

**Test it now:** http://localhost:3000/whatsapp-demo.html

Type: `change name` 🚀
