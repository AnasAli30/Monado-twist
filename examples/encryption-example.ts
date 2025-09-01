// Example of how to use the encryption system in your frontend components

import { makeEncryptedRequest } from '@/lib/frontend-crypto';

// Example: Making an encrypted request to win.ts API
export async function submitWinRequest(winData: {
  to: string;
  amount: number;
  fid: number;
  pfpUrl?: string;
  randomKey: string;
  fusedKey: string;
}) {
  try {
    const response = await makeEncryptedRequest('/api/win', winData);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Win request successful:', result);
      return result;
    } else {
      console.error('Win request failed:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Encryption or network error:', error);
    return null;
  }
}

// Example: Making an encrypted request to generate-signature.ts API
export async function generateSignature(signatureData: {
  userAddress: string;
  tokenAddress: string;
  amount: string;
  tokenName: string;
  name?: string;
  randomKey: string;
  fusedKey: string;
  pfpUrl?: string;
}) {
  try {
    const response = await makeEncryptedRequest('/api/generate-signature', signatureData);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Signature generated successfully:', result);
      return result.signature;
    } else {
      console.error('Signature generation failed:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Encryption or network error:', error);
    return null;
  }
}

// Example: React component usage
export function ExampleComponent() {
  const handleWinSubmission = async () => {
    const winData = {
      to: '0x1234567890123456789012345678901234567890',
      amount: 0.01,
      fid: 12345,
      pfpUrl: 'https://example.com/profile.jpg',
      randomKey: 'generated_random_key_12345_1234567890',
      fusedKey: 'generated_fused_key_hash'
    };

    const result = await submitWinRequest(winData);
    if (result) {
      alert('Win request submitted successfully!');
    } else {
      alert('Failed to submit win request');
    }
  };

  const handleSignatureGeneration = async () => {
    const signatureData = {
      userAddress: '0x1234567890123456789012345678901234567890',
      tokenAddress: '0x0987654321098765432109876543210987654321',
      amount: '1000000000000000000', // 1 token in wei
      tokenName: 'MON',
      name: 'User Name',
      randomKey: 'generated_random_key_12345_1234567890',
      fusedKey: 'generated_fused_key_hash',
      pfpUrl: 'https://example.com/profile.jpg'
    };

    const signature = await generateSignature(signatureData);
    if (signature) {
      console.log('Generated signature:', signature);
    } else {
      alert('Failed to generate signature');
    }
  };

  return (
    <div>
      <button onClick={handleWinSubmission}>
        Submit Win Request (Encrypted)
      </button>
      <button onClick={handleSignatureGeneration}>
        Generate Signature (Encrypted)
      </button>
    </div>
  );
}


