document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
        const response = await axios.post('http://localhost:3000/login', {
            username,
            password
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.status === 200) {
            const result = response.data;
            const token = result.token;
            storeToken(token)
            alert(result.msg);
            redirectToProfile();
        } else {
            alert('Authentication failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('Error during login:', error);
        alert('An error occurred during login');
    }
});
function storeToken(token) {
    localStorage.setItem('token', token);
}
function redirectToProfile() {
    window.location.href = './profile.html';
}