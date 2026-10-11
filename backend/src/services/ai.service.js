const Groq =
  require('groq-sdk');

const groq =
  new Groq({
    apiKey:
      process.env.GROQ_API_KEY
  });

async function askAI(message) {

  const completion =
    await groq.chat.completions.create({

      messages: [

        {
          role: 'system',

          content: `

          Kamu adalah AI assistant
          untuk aplikasi Food Ilee.

          Fokus:
          - limbah makanan
          - sustainability
          - edukasi lingkungan
          - kompos
          - daur ulang

          Jawab dalam bahasa Indonesia
          yang jelas dan singkat.
          `
        },

        {
          role: 'user',

          content: message
        }
      ],

      model:
        'llama-3.3-70b-versatile'
    });

  return completion
    .choices[0]
    .message
    .content;
}

async function recommendWaste(
  title,
  description
) {

  const prompt = `

  Kamu adalah AI ahli limbah makanan.

  Analisa limbah berikut:

  Title:
  ${title}

  Description:
  ${description}

  Berikan response hanya pure JSON.

    JANGAN tambahkan:
    - markdown
    - kata pembuka
    - penjelasan
    - kata penutup

    Format JSON:

  {
    "category": "...",
    "danger_level": "...",
    "recommendation": "...",
    "recycle_tip": "..."
  }

  Gunakan bahasa Indonesia.
  `;

  const completion =
    await groq.chat.completions.create({

      messages: [

        {
          role: 'user',
          content: prompt
        }
      ],

      model:
        'llama-3.3-70b-versatile',

      temperature: 0.5
    });

  return completion
    .choices[0]
    .message
    .content;
}

module.exports = {
  askAI, recommendWaste
};