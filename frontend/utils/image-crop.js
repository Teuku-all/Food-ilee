export async function cropSquareImage(image, zoom, cropX, cropY, filename) {
  if (!image?.naturalWidth || !image?.naturalHeight)
    throw new Error('Foto belum siap diproses. Coba pilih ulang.');

  const side = Math.min(image.naturalWidth, image.naturalHeight) / zoom;
  const startX = (image.naturalWidth - side) * cropX;
  const startY = (image.naturalHeight - side) * cropY;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Foto gagal diproses.');
  context.drawImage(image, startX, startY, side, side, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Foto gagal diproses.'))),
      'image/jpeg',
      0.9,
    );
  });
  return new File([blob], filename, { type: 'image/jpeg' });
}
