const sdk = require('@farcaster/frame-sdk');
console.log('Frame SDK exports:', Object.keys(sdk).filter(k => k.includes('Notification')));

try {
    const mini = require('@farcaster/miniapp-sdk');
    console.log('Miniapp SDK exports:', Object.keys(mini).filter(k => k.includes('Notification')));
} catch (e) {
    console.log('Miniapp SDK failed to load');
}
