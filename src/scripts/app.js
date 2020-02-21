if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/swHostBoot.js', {scope: "/"}).then(function(reg) {
        console.log('Yay, service worker is live!', reg);
    }).catch(function(err) {
        console.log('No oats for you.', err);
    });
}
