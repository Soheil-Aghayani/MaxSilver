(function () {
  'use strict';

  const installButton = document.getElementById('installAppButton');
  const instructionsDialog = document.getElementById('installInstructionsDialog');
  const instructionsSteps = document.getElementById('installInstructionsSteps');
  const closeInstructions = document.getElementById('closeInstallInstructions');
  if (!installButton) return;

  let installPrompt = null;
  const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function showInstallInstructions() {
    const steps = isAppleMobile
      ? ['در Safari دکمهٔ اشتراک‌گذاری را بزنید.', 'گزینهٔ «Add to Home Screen» یا «افزودن به صفحهٔ اصلی» را انتخاب و تأیید کنید.']
      : /Android/i.test(navigator.userAgent)
        ? ['منوی مرورگر را باز کنید.', 'گزینهٔ «Install app» یا «Add to Home screen» را انتخاب و نصب را تأیید کنید.']
        : ['منوی مرورگر را باز کنید.', 'گزینهٔ «Install Max Silver» یا «Install app» را انتخاب کنید.'];
    instructionsSteps.replaceChildren(...steps.map((step) => {
      const item = document.createElement('li');
      item.textContent = step;
      return item;
    }));
    if (typeof instructionsDialog.showModal === 'function') instructionsDialog.showModal();
    else instructionsDialog.setAttribute('open', '');
  }

  if (isInstalled()) installButton.hidden = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
  });

  installButton.addEventListener('click', async () => {
    if (!installPrompt) {
      showInstallInstructions();
      return;
    }
    const prompt = installPrompt;
    installPrompt = null;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice && choice.outcome === 'accepted') installButton.hidden = true;
    } catch (error) {
      console.warn('The browser could not open the install prompt.', error);
      showInstallInstructions();
    }
  });

  closeInstructions.addEventListener('click', () => {
    if (typeof instructionsDialog.close === 'function') instructionsDialog.close();
    else instructionsDialog.removeAttribute('open');
  });

  window.addEventListener('appinstalled', () => { installButton.hidden = true; });

  if ('serviceWorker' in navigator) {
    const appBase = new URL('./', location.href);
    navigator.serviceWorker.register(new URL('service-worker.js', appBase), { scope: appBase.pathname })
      .catch((error) => console.warn('Offline dashboard support could not be enabled.', error));
  }
})();
