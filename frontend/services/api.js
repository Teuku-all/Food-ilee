export const API_BASE_URL =
  'http://localhost:5000/api';
  
  export async function deleteWaste(id) {

  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/wastes/${id}`,
    {
      method: 'DELETE',

      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return response.json();
}