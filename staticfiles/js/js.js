function loadOnlineUsers() {
    fetch('/get_online_users/')
        .then(res => res.json())
        .then(users => {
            const list = document.getElementById('onlineUserList');
            list.innerHTML = '';
            users.forEach(user => {
                const li = document.createElement('li');
                li.textContent = user.username;
                list.appendChild(li);
            });
        })
        .catch(e => console.log('Failed to load online users', e));
}

setInterval(loadOnlineUsers, 5000);
loadOnlineUsers();
