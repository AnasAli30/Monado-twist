// Utility functions for handling API responses and errors

/**
 * Safely parse JSON response from API calls
 * Handles empty responses and malformed JSON
 */
export async function safeJsonResponse(response: Response): Promise<any> {
  if (!response.ok) {
    console.error(`API Error: ${response.status} ${response.statusText}`);
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  
  if (!text || text.trim() === '') {
    console.error('Empty response from API');
    throw new Error('Empty response from API');
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to parse JSON response:', text);
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`);
  }
}

/**
 * Enhanced fetch wrapper with better error handling
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<any> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      ...options
    });

    return await safeJsonResponse(response);
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    throw error;
  }
}

/**
 * POST request with JSON body and safe response handling
 */
export async function safePost(url: string, data: any, options?: RequestInit): Promise<any> {
  return safeFetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
    ...options
  });
}

/**
 * Handle API errors consistently across the application
 */
export function handleApiError(error: any, context: string = 'API request') {
  console.error(`${context} failed:`, error);
  
  if (error.message.includes('Failed to fetch')) {
    return 'Network error. Please check your connection.';
  }
  
  if (error.message.includes('Empty response')) {
    return 'Server returned empty response. Please try again.';
  }
  
  if (error.message.includes('Invalid JSON')) {
    return 'Server returned invalid response. Please try again.';
  }
  
  if (error.message.includes('API Error')) {
    return `Server error: ${error.message}`;
  }
  
  return 'An unexpected error occurred. Please try again.';
}


