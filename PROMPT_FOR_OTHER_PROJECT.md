# Prompt: Implement Real-Time Win Notifications with Pusher

Use this prompt to implement the Pusher notification system in your project:

---

## Prompt Text

```
I need to implement a real-time notification system using Pusher that displays top notifications when users win, purchase spins, or withdraw tokens. The notifications should appear at the top of the page with smooth animations.

Requirements:
1. Frontend Component:
   - Create a React component that subscribes to Pusher channel
   - Display notifications at the top of the page (fixed position, z-index: 100000)
   - Support 3 event types: 'win', 'purchase', 'withdraw'
   - Show user profile picture, name (or truncated address), amount, and token type
   - Implement 4 different animation types: right-left, left-right, top-bottom, bottom-top
   - Each notification should randomly use one animation type
   - Handle smooth transitions when new notifications arrive
   - Show default message when no notifications are active
   - Different background colors for each event type:
     - Win: green gradient (#4CAF50 to #8BC34A)
     - Withdraw: gold gradient (#FFD700 to #FFF8DC)
     - Purchase: colorful gradient (blue to green to yellow)

2. Backend Integration:
   - Add Pusher triggers in API endpoints:
     - Win event: After processing a win transaction
     - Purchase event: After user buys spins
     - Withdraw event: After user withdraws tokens
   - Include user data: name, address, amount, token (if applicable), profile picture URL, spins (for purchase)

3. Dependencies:
   - Install: pusher (^5.2.0) and pusher-js (^8.4.0)
   - Use ethers.js for token amount formatting (USDC uses 6 decimals, others use 18)

4. Environment Variables:
   - PUSHER_APP_ID
   - PUSHER_SECRET
   - NEXT_PUBLIC_PUSHER_KEY
   - NEXT_PUBLIC_PUSHER_CLUSTER
   - PUSHER_CLUSTER

5. Features:
   - Real-time updates across all connected clients
   - Automatic cleanup on component unmount
   - Error handling for Pusher connection failures
   - Support for different token types with proper decimal formatting
   - Responsive design that works on mobile and desktop

Please implement:
1. The WinNotifications.tsx component with all animations and styling
2. Backend Pusher trigger code snippets for win, purchase, and withdraw events
3. Integration instructions for adding the component to the main page
4. Environment variable setup guide

The notification bar should be 25px height, positioned at the top, with smooth slide animations. Use FontAwesome icons if available, otherwise use emojis.
```

---

## Alternative Shorter Prompt

```
Implement a real-time notification bar at the top of the page using Pusher that shows:
- User wins (with token amount and type)
- User purchases (with spin count)
- User withdrawals (with amount)

Requirements:
- React component that subscribes to Pusher channel 'Monad-spin'
- Events: 'win', 'purchase', 'withdraw'
- 4 animation types (randomly selected): right-left, left-right, top-bottom, bottom-top
- Display: user profile picture, name/address, amount, token type
- Different colored backgrounds for each event type
- Backend: Add pusher.trigger() calls in win, purchase, and withdraw API endpoints
- Install pusher and pusher-js packages
- Use environment variables for Pusher credentials

The component should handle smooth transitions, cleanup on unmount, and show a default message when inactive.
```

---

## Step-by-Step Implementation Checklist

Use this checklist when implementing:

- [ ] Create Pusher account and app
- [ ] Add Pusher credentials to environment variables
- [ ] Install dependencies: `npm install pusher pusher-js`
- [ ] Create `components/Home/WinNotifications.tsx` component
- [ ] Add Pusher initialization in component
- [ ] Implement event listeners for 'win', 'purchase', 'withdraw'
- [ ] Add animation styles (4 types)
- [ ] Implement notification state management
- [ ] Add user profile picture display
- [ ] Format token amounts correctly (USDC: 6 decimals, others: 18)
- [ ] Add default message when no notifications
- [ ] Import and add component to main page
- [ ] Add `pusher.trigger()` in win API endpoint
- [ ] Add `pusher.trigger()` in purchase API endpoint
- [ ] Add `pusher.trigger()` in withdraw API endpoint
- [ ] Test notifications with different event types
- [ ] Verify animations work smoothly
- [ ] Test on mobile devices
- [ ] Add error handling for Pusher connection failures

---

## Quick Reference: Pusher Trigger Format

```typescript
// Win Event
await pusher.trigger('Monad-spin', 'win', {
  name: user?.name,
  address: to,
  amount: amount,
  token: tokenName, // optional
  pfpUrl: pfpUrl
});

// Purchase Event
await pusher.trigger('Monad-spin', 'purchase', {
  name: user?.name,
  address: address,
  amount: amount,
  spins: spinCount,
  pfpUrl: pfpUrl
});

// Withdraw Event
await pusher.trigger('Monad-spin', 'withdraw', {
  address: address,
  amount: amount,
  name: name || '',
  pfpUrl: pfpUrl
});
```

---

## Troubleshooting

**Notifications not showing:**
- Check Pusher credentials in environment variables
- Verify channel name matches ('Monad-spin')
- Check event names match ('win', 'purchase', 'withdraw')
- Check browser console for Pusher connection errors

**Animations not working:**
- Verify CSS animations are properly defined
- Check that animation classes are applied correctly
- Ensure will-change property is set for performance

**Backend events not triggering:**
- Verify Pusher is initialized with correct credentials
- Check that pusher.trigger() is called after successful operations
- Add try-catch blocks around trigger calls
- Check server logs for Pusher errors



