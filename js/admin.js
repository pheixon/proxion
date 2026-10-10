const ADMIN_TOKEN_KEY = 'proxion:blog_token';

function adminToken() {
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp * 1000 > Date.now()) return token;
  } catch {}
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  return null;
}

const adminMode = new URLSearchParams(location.search).get('admin') === '1' || !!adminToken();

async function adminLogin() {
  if (adminToken()) return true;
  const password = prompt('Enter admin password');
  if (!password) return false;
  const res = await fetch('api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    alert(res.status === 429 ? 'Too many attempts, try again later' : 'Access denied');
    return false;
  }
  sessionStorage.setItem(ADMIN_TOKEN_KEY, (await res.json()).token);
  return true;
}

async function adminFetch(url, options = {}) {
  const send = () => fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken()}` },
  });
  let res = await send();
  if (res.status === 401) {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    if (await adminLogin()) res = await send();
  }
  if (!res.ok) alert(`Request failed (${res.status})`);
  return res;
}
