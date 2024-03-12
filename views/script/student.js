document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fetch users from the /users endpoint using Axios
        const response = await axios.get('http://localhost:3000/students');
        const users = response.data;
        
        // Display users in the HTML
        const userListElement = document.getElementById('userList');
        users.forEach(user => {
            const listItem = document.createElement('li');
            listItem.innerHTML =`
             <h2>Username: ${user.username}</h2>
             <button onclick="deleteStudent('${user.username}')">Delete</button>
             `;
            userListElement.appendChild(listItem);
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        alert('Error fetching users. Please try again later.');
    }
});
async function deleteStudent(username){
    try{
        const response= await axios.delete(`http://localhost:3000/students/${username}`);
        console.log('Server response:', response.data);
        if(response.status===200){
            alert('Student deleted successfully');
            location.reload();
        }
        else{
            alert('Error deleting student. Please try again later.');
        }
    }catch(error){
        console.error('Error deleting student:', error);
        alert('An error occurred while deleting the student. Please try again later.');
    }
}