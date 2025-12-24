/**
 * Cloud Sync Utility
 * Handles syncing booklets with the cloud via Vercel API
 */

const API_BASE = '/api/booklet';

/**
 * Create a new booklet in the cloud
 */
export async function createBooklet(data) {
  try {
    const response = await fetch(`${API_BASE}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('Failed to create booklet');
    return await response.json();
  } catch (error) {
    console.error('Create booklet error:', error);
    return null;
  }
}

/**
 * Fetch a booklet from the cloud
 */
export async function fetchBooklet(id) {
  try {
    const response = await fetch(`${API_BASE}/${id}`);

    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to fetch booklet');

    return await response.json();
  } catch (error) {
    console.error('Fetch booklet error:', error);
    return null;
  }
}

/**
 * Update a booklet in the cloud
 */
export async function updateBooklet(id, data) {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('Failed to update booklet');
    return await response.json();
  } catch (error) {
    console.error('Update booklet error:', error);
    return null;
  }
}

/**
 * Delete a booklet from the cloud
 */
export async function deleteBooklet(id) {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });

    return response.ok;
  } catch (error) {
    console.error('Delete booklet error:', error);
    return false;
  }
}

/**
 * Generate a shareable URL for a booklet
 */
export function getShareUrl(id) {
  const base = window.location.origin + window.location.pathname;
  return `${base}?id=${id}`;
}

/**
 * Get booklet ID from URL
 */
export function getBookletIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

/**
 * Check if cloud sync is available (API exists)
 */
export async function isSyncAvailable() {
  try {
    // Try to hit the API - if it 404s on create, we're not deployed yet
    const response = await fetch(`${API_BASE}/create`, {
      method: 'OPTIONS',
    });
    return response.ok || response.status === 405;
  } catch {
    return false;
  }
}
