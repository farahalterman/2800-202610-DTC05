var clickCount = 0;
var url = "rnfgreRtt.html"

function easterEggTrigger() {
    if (clickCount >= 5) {
            window.open(url, '_blank').focus();
            clickCount = 0;
    }
}

document.getElementById("easterEgg").addEventListener("click", () => {
    clickCount++;
    easterEggTrigger();
});