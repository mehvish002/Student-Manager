document.addEventListener('DOMContentLoaded', async () => {
    try {
        const token = await getTokenFromStorage();
        if (token) {
            fetchUserProfile(token);
        } else {
            alert('Invalid or missing token. Please log in.');
            window.location.href = './login.html';
        }
    } catch (error) {
        console.error('Error fetching token from storage:', error);
        document.getElementById('profile').innerText = 'Error fetching token';
    }
});

async function getTokenFromStorage() {
    return localStorage.getItem('token');
}

async function fetchUserProfile(token) {
    try {
        document.getElementById('profile').innerText = 'Loading profile...';
        const API_URL = 'http://localhost:3000'
        const response = await axios.get(API_URL + '/profile', {
            headers: {
                'Authorization': token
            }
        });
        if (response.status === 200) {
            const userProfile = response.data;
            displayUserProfile(userProfile);
        } else {
            document.getElementById('profile').innerText = 'Invalid token or server error';
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
        document.getElementById('profile').innerText = 'Error fetching user profile';
        
    }
}

function displayUserProfile(userProfile) {
    document.getElementById('profile').innerHTML = `
    <p>Welcome to ${userProfile.username}'s profile.`;
}
