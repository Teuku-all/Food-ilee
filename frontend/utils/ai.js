export function analyzeWaste(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  // organik
  if (
    text.includes('nasi') ||
    text.includes('makanan') ||
    text.includes('sayur') ||
    text.includes('buah') ||
    text.includes('ikan')
  ) {
    return {
      category: 'Organik',

      recommendation: 'Limbah dapat dijadikan kompos atau pakan ternak.',
    };
  }

  // plastik
  if (text.includes('plastik') || text.includes('botol') || text.includes('gelas')) {
    return {
      category: 'Anorganik',

      recommendation: 'Limbah dapat didaur ulang.',
    };
  }

  // minyak
  if (text.includes('minyak')) {
    return {
      category: 'Minyak',

      recommendation: 'Jangan dibuang ke saluran air.',
    };
  }

  return {
    category: 'Lainnya',

    recommendation: 'Pisahkan limbah dengan benar.',
  };
}
