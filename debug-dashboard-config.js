// Quick debug script to check dashboard config in browser console
// Open browser console and run this:
/*
async function checkDashboardConfig() {
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open('PortfolioTrackerDB', 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const tx = db.transaction('userSettings', 'readonly');
  const store = tx.objectStore('userSettings');
  const req = store.get('dashboard-config');

  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      console.log('Dashboard Config:', req.result);
      console.log('Version:', req.result?.version);
      console.log('Widget Settings:', req.result?.widgetSettings);
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
}

checkDashboardConfig();
*/

// To reset and test:
/*
async function resetDashboardConfig() {
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open('PortfolioTrackerDB', 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const tx = db.transaction('userSettings', 'readwrite');
  const store = tx.objectStore('userSettings');
  store.delete('dashboard-config');

  return new Promise((resolve) => {
    tx.oncomplete = () => {
      console.log('Dashboard config deleted. Refresh page to get defaults.');
      resolve();
    };
  });
}

resetDashboardConfig();
*/
