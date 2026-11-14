
export const handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Méthode non autorisée." })
    };
  }

  try {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL;

    if (!url || !serviceKey || !groqKey || !model) {
      throw new Error("Configuration serveur incomplète.");
    }

    const token = event.headers.authorization?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Connecte-toi à ton compte." })
      };
    }

    const auth = await fetch(`${url}/auth/v1/user`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${token}`
      }
    });

    if (!auth.ok) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Session invalide. Reconnecte-toi." })
      };
    }

    const user = await auth.json();
    const data = JSON.parse(event.body || "{}");
    const message = data.message;

    if (typeof message !== "string" || !message.trim() || message.length > 4000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Message invalide." })
      };
    }

    const history = Array.isArray(data.history)
      ? data.history
          .filter(m =>
            ["user", "assistant"].includes(m.role) &&
            typeof m.content === "string"
          )
          .slice(-8)
          .map(m => ({
            role: m.role,
            content: m.content.slice(0, 4000)
          }))
      : [];

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "Tu es Lapin GPT, un lapin sympathique, chaleureux et serviable. Réponds en français par défaut."
            },
            ...history,
            { role: "user", content: message.trim() }
          ],
          temperature: 0.7,
          max_tokens: 800
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Erreur Groq:", result);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "Le lapin n'arrive pas à joindre son cerveau IA. Vérifie la configuration Groq." })
      };
    }

    const reply = result.choices?.[0]?.message?.content;

    if (!reply) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "Groq n'a pas fourni de réponse." })
      };
    }

    const reward = await fetch(`${url}/rest/v1/rpc/award_chat_coins`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ p_user_id: user.id })
    });

    if (!reward.ok) {
      console.error("Récompense non attribuée:", await reward.text());
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply })
    };

  } catch (error) {
    console.error("Erreur chat:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Erreur serveur du lapin. Vérifie les journaux Netlify." })
    };
  }
};
