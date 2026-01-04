
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const uploadAsset = async (file: File, folder: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    // Use query param for path
    const url = new URL(`${API_URL}/api/upload`);
    url.searchParams.append('path', folder);

    const response = await fetch(url.toString(), {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Upload failed');
    }

    const data = await response.json();
    return data.url;
};
