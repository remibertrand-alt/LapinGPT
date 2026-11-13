
export const handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Méthode non autorisée" })
    };
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL;

    if (!apiKey || !model) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Configuration Groq manquante dans Netlify"
        })
      };
    }

    const data = JSON.parse(event.body || "{}");
    const message = data.message;

    if (typeof message !== "string" || !message.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Message vide" })
      };
    }

    if (message.length > 4000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Message trop long" })
      };
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "Tu es Lapin GPT, un assistant sympathique, chaleureux et serviable. Réponds en français par défaut."
            },
            {
              role: "user",
              content: message.trim()
            }
          ],
          temperature: 0.7,
          max_tokens: 800
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Erreur Groq :", response.status, result.error?.message);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "Le service IA n'a pas pu répondre."
        })
      };
    }

    const answer = result.choices?.[0]?.message?.content;

    if (!answer) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "Réponse IA vide" })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ answer })
    };
  } catch (error) {
    console.error("Erreur de la fonction chat :", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Erreur interne du serveur" })
    };
  }
};
