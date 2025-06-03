document.addEventListener('DOMContentLoaded', function () {
    const balanceElement = document.getElementById('balance');
    let balance = parseFloat(balanceElement?.textContent || '0');
    const csrfToken = document.getElementById('csrfToken')?.value || '';
    const telegramId = document.getElementById('telegram-id')?.value || '';
    const betAmountSelect = document.getElementById("betAmount");
    const playButton = document.getElementById("play-game-btn");
    const waitingStatus = document.getElementById("waitingStatus");

    if (playButton) {
        playButton.addEventListener("click", function () {
            const betAmount = parseInt(betAmountSelect.value);

            if (betAmount > balance) {
                alert("Insufficient balance. Choose a lower bet.");
                return;
            }

            fetch('/play_game/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    telegram_id: telegramId,
                    bet_amount: betAmount
                })
            })
            .then(response => {
                if (response.redirected) {
                    // Redirect to the game board if server sends redirect
                    window.location.href = response.url;
                    return null;
                }
                return response.json();
            })
            .then(data => {
                if (!data) return;

                if (data.status === "success") {
                    // Deduct locally shown balance
                    balance -= betAmount;
                    balanceElement.textContent = balance.toFixed(2);

                    // Show waiting message if game not redirected yet
                    if (waitingStatus) {
                        waitingStatus.style.display = 'block';
                    }
                } else if (data.status === "error") {
                    alert(data.message || "Failed to create game.");
                }
            })
            .catch(err => {
                console.error("Start game error:", err);
            });
        });
    }
});
