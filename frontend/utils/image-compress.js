export async function compressImage(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();

    const maxDimension = 1920;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Foto gagal dikompres.');

    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('Foto gagal dikompres.'))),
        'image/jpeg',
        0.82,
      );
    });
    if (blob.size >= file.size && scale === 1) return file;

    const filename = `${file.name.replace(/\.[^.]+$/, '') || 'image'}.jpg`;
    return new File([blob], filename, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
