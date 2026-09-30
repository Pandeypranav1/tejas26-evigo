import { NextRequest, NextResponse } from "next/server";
import { TOURISM_PLACES, EVENT_VENUES } from "@/lib/constants";

// In-memory sliding window rate limiter (resets on server restart or 24h)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS_PER_DAY = 30;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_DAY - 1 };
  }

  if (entry.count >= MAX_REQUESTS_PER_DAY) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS_PER_DAY - entry.count };
}

// Scoped Context Generator for Evigo Tourism with rich historical & practical details
function buildSystemContext() {
  const placesText = TOURISM_PLACES.map(
    (p, i) =>
      `${i + 1}. **${p.name}** (${p.category}) - ${p.district} District\n   - Overview: ${p.overview}\n   - Historical background: ${p.historicalBackground}\n   - Significance: ${p.significance}\n   - Location: ${p.location}\n   - How to reach: ${p.howToReach}\n   - Timings: ${p.timings || "Not published in the reviewed official sources"}\n   - Entry fee: ${p.entryFee || "Not published in the reviewed official sources"}\n   - Sources: ${p.historySources.map((source) => `${source.label} (${source.url})`).join("; ")}\n   - Existing map coordinates: ${p.lat}, ${p.lng}`
  ).join("\n\n");

  const hotelsText = EVENT_VENUES.map(
    (h) => `- **${h.name}** (${h.location}): Rating ${h.googleRating ?? 4.5}★, Features: ${h.safetyFeatures.join(", ")}`
  ).join("\n");

  return `You are Evigo's Official AI Travel & Heritage Assistant for Bihar.
Your role is to help travellers with deep, informative, and verified information about tourist destinations, pilgrimage sites, and heritage trails across Bihar districts (starting with Jamui).

VERIFIED TOURISM DESTINATIONS IN DATABASE:
${placesText}

VERIFIED PARTNER HOTELS & STAYS:
${hotelsText}

INSTRUCTIONS FOR IN-DEPTH ANSWERS:
1. For a specific place, use the structured overview, history, significance, travel fields, and source links above.
2. Do not add dates, dynasties, events, travel times, facilities, fees, opening hours, or ecological facts that are not in the supplied records.
3. Clearly attribute religious belief, local tradition, and disputed source accounts; do not present them as proven fact.
4. If a field is unavailable, say the reviewed official sources do not publish it.
5. Format with clean Markdown headers and short, readable sections.`;
}

function generateHeuristicResponse(userMessage: string): string {
  const query = userMessage.toLowerCase();

  const aliases: Record<string, string[]> = {
    "simultala-hill-station": ["simultala", "tapobhumi"],
    "kshatriya-kund-gram": ["kshatriya kund", "kund gram", "kundgram", "mahavira birth"],
    "lachhuar-jain-mandir": ["lachhuar", "lachuar", "jain mandir"],
    "kali-mandir-malaypur": ["kali mandir", "malaypur", "kali mata"],
    "minto-tower-gidhaur": ["minto", "gidhaur", "clock tower"],
    "giddheshwar-mandir": ["giddheshwar", "gidheshwar"],
    "patneshwar-mandir": ["patneshwar", "patneswar"],
    "nagi-dam-bhimbandh": ["nagi", "bhimbandh"],
  };
  const matchingPlace = TOURISM_PLACES.find((place) =>
    (aliases[place.id] || []).some((alias) => query.includes(alias))
  );

  if (matchingPlace) {
    const sourceLines = matchingPlace.historySources
      .map((source) => `- [${source.label}](${source.url})`)
      .join("\n");
    return `### ${matchingPlace.name}\n\n#### About\n${matchingPlace.overview}\n\n#### History / Background\n${matchingPlace.historicalBackground}\n\n#### Significance\n${matchingPlace.significance}\n\n#### Travel Information\n- **Location:** ${matchingPlace.location}\n- **How to reach:** ${matchingPlace.howToReach}\n- **Timings:** ${matchingPlace.timings || "Not published in the reviewed official sources."}\n- **Entry fee:** ${matchingPlace.entryFee || "Not published in the reviewed official sources."}\n\n#### Sources\n${sourceLines}`;
  }

  // 1. Simultala Hill Station
  if (query.includes("simultala")) {
    return `### 🌲 Simultala Hill Station — 'The Mini Shimla of Bihar'

#### 🏛️ History & Cultural Significance
Simultala is a serene hill station in Jamui district that gained prominence during the British colonial era as a premier health sanitarium (sanatorium) thanks to its unpolluted air and natural mineral springs. Renowned intellectuals from Bengal and spiritual seekers — including followers of **Sri Ramakrishna Paramahamsa** — made Simultala their meditation retreat (**Tapobhumi**).

#### 🗓️ Best Time to Visit & Duration
- **Best Season**: **October to March** (crisp mornings, cool evening breezes).
- **Time Needed**: **Half-day to full-day excursion** (4 to 6 hours).

#### 🎒 What to Expect & Practical Tips
- **Key Attractions**: *Lattu Pahar*, *Haldi Jharna* (waterfall), *Dharhara Falls*, and tranquil colonial-style bungalows.
- **Trek Level**: Easy to moderate undulating trails. Comfortable walking/trekking shoes are recommended.
- **Atmosphere**: Peaceful, uncrowded nature retreat surrounded by sal and mahua forests.

🏨 **Where to Stay**: Return to Jamui town (approx. 45–60 mins) for a comfortable stay at **GenX Brij** or **Hotel Usha Nand Palace**.`;
  }

  // 2. Kshatriya Kund Gram
  if (query.includes("kshatriya") || query.includes("kund gram") || query.includes("kundgram") || query.includes("mahavira birth")) {
    return `### 🛕 Kshatriya Kund Gram — Sacred Birthplace of Lord Mahavira

#### 🏛️ Religious & Historical Significance
Kshatriya Kund Gram is one of the most sacred Jain pilgrimage shrines (**Tirtha**) in India. According to centuries of Jain tradition, this valley surrounded by five picturesque hills is the historic **birthplace of Bhagwan Mahavira**, the 24th Tirthankara of Jainism.

#### 🗓️ Best Time to Visit & Duration
- **Best Season**: **October to March** (especially during *Mahavira Jayanti*).
- **Time Needed**: **3 to 4 hours** (including hill trail ascent).

#### 🎒 Visiting Tips & Etiquette
- **Pilgrim Etiquette**: Dress respectfully in modest clothing. Remove footwear and leather articles before entering the holy sanctum.
- **Accessibility**: Reached via Lachhuar village; involves a scenic uphill walking path. Early morning visits are recommended to avoid midday sun.
- **Spiritual Ambience**: Deeply meditative, serene forest surroundings.

🏨 **Stay & Food**: **Lachhuar Jain Dharamshala** offers pure vegetarian Jain meals; luxury lodging is available in Jamui town at **GenX Brij** and **Hotel JP Grand**.`;
  }

  // 3. Lachhuar Jain Mandir
  if (query.includes("lachhuar") || query.includes("lachuar") || query.includes("jain mandir")) {
    return `### 🛕 Lachhuar Jain Mandir & Dharamshala

#### 🏛️ History & Significance
Lachhuar serves as the principal gateway and base camp for pilgrims travelling to Kshatriya Kund Gram. The temple complex houses ancient, exquisitely carved **black marble idols of Lord Mahavira** and has served Jain yatris from across the globe for generations.

#### 🗓️ Best Time to Visit & Duration
- **Best Season**: **October to March**.
- **Time Needed**: **1.5 to 2 hours**.

#### 🎒 What to Expect
- **Facilities**: Extensive guest houses (Dharamshalas) and traditional *Bhojanshala* providing pure satvik/Jain meals.
- **Architecture**: Intricately carved stone sanctums, peaceful courtyards, and well-maintained prayer halls.

🏨 **Nearby Verified Stays**: **Hotel Nirmala Inn** and **GenX Brij** are convenient bases in Jamui.`;
  }

  // 4. Minto Tower Gidhaur
  if (query.includes("minto") || query.includes("gidhaur") || query.includes("clock tower")) {
    return `### 🏛️ Minto Tower (Gidhaur) — Historic Colonial Landmark

#### 🏛️ History & Significance
Minto Tower was constructed in **1909 by Maharaja Ravaneshwar Prasad Singh Bahadur**, the ruler of the historic Gidhaur Raj estate. The tower was built to commemorate the visit of the then Viceroy of India, **Lord Minto**, to Gidhaur. It stands tall at the main crossroads of Gidhaur as a symbol of colonial-era civic architecture and royal patronage.

#### 🗓️ Best Time to Visit & Duration
- **Best Time**: Late afternoon or sunset (golden hour photography).
- **Time Needed**: **30 to 45 minutes**.

#### 🎒 Nearby Sights
- Pair your visit with the ancient **Giddheshwar Mandir** (situated on the nearby rocky hills) and the heritage **Gidhaur Raj Palace** grounds.

🏨 **Recommended Stay**: **Hotel JP Grand** or **Hotel Usha Nand Palace** (15 mins drive).`;
  }

  // 5. Giddheshwar Mandir
  if (query.includes("giddheshwar") || query.includes("gidheshwar")) {
    return `### 🛕 Giddheshwar/Gidheshwar Mandir — Ancient Hilltop Shiva Shrine

#### 🏛️ History & Mythology
Located on a dramatic rocky hillside in Gidhaur, this ancient temple is dedicated to Lord Shiva. Local folklore associates the hill with the **Ramayana epic**, believing it to be the region where the heroic bird king **Jatayu (Giddh)** engaged Ravana.

#### 🗓️ Best Time to Visit & Duration
- **Best Season**: Year-round; especially energetic during **Maha Shivratri** and the holy month of **Shravan**.
- **Time Needed**: **1 to 2 hours**.

#### 🎒 What to Expect
- **Trek/Ascent**: A moderate stone staircase climb with panoramic views of the Gidhaur valley and surrounding hills.
- **Tips**: Carry water and wear slip-resistant footwear for the rocky steps.`;
  }

  // 6. Kali Mandir, Malaypur
  if (query.includes("kali mandir") || query.includes("malaypur") || query.includes("kali mata")) {
    return `### 🛕 Kali Mandir (Malaypur) — Sacred Shakti Shrine

#### 🏛️ Significance & Tradition
Situated near Jamui Railway Station in Malaypur, this revered temple is dedicated to Goddess Kali. It is celebrated across Bihar for its grand annual **Kali Puja festival**, featuring elaborate night-long aartis, cultural performances, and a lively community fair (mela).

#### 🗓️ Best Time to Visit & Duration
- **Best Time**: Morning/Evening aarti hours; festive peak during **Diwali / Kali Puja** (Oct/Nov).
- **Time Needed**: **1 hour**.`;
  }

  // 7. Patneshwar Mandir
  if (query.includes("patneshwar")) {
    return `### 🛕 Patneshwar Mandir — Medieval Stone Heritage Shrine

#### 🏛️ History & Architecture
Patneshwar Mandir is an ancient Shiva shrine renowned for its traditional stone carvings and lingam. Devotees revere it as a *Manokamna Mandir* (wish-fulfilling shrine), where pilgrims gather for special prayers on Mondays.

#### 🗓️ Best Time to Visit & Duration
- **Best Season**: Year-round, particularly in **Shravan** (July/August).
- **Time Needed**: **45 minutes to 1 hour**.`;
  }

  // Itineraries
  if (query.includes("2 day") || query.includes("two day") || query.includes("weekend") || query.includes("itinerary") || query.includes("plan")) {
    return `### Jamui trip planning\n\nThe reviewed official sources do not provide a verified timed itinerary or travel durations for these places. Use the place detail sections above for source-backed locations and access notes, and confirm local transport and opening arrangements before setting a schedule.`;
  }

  if (query.includes("hotel") || query.includes("stay") || query.includes("restaurant") || query.includes("food")) {
    return `### 🏨 Verified Partner Hotels & Dining in Jamui

- **GenX Brij**: Luxury stay with modern interiors, *Punjabi Junction* restaurant, and *Bake & Chill* café.
- **Hotel Usha Nand Palace**: Premium rooms, grand banquet facilities, and dining.
- **Hotel JP Grand**: Elegant property with scenic garden lounge and fine dining.
- **Hotel Nirmala Inn**: Fully air-conditioned banquet hall, restaurant, and family suites.

*All hotels feature 24/7 security, CCTV surveillance, and verified booking through Evigo.*`;
  }

  // General Overview
  return `### 🧭 Jamui District Travel & Heritage Guide

Jamui boasts **8 verified cultural and nature destinations**:
1. **🌲 Nature & Hills**: *Simultala Hill Station*, *Nagi Dam & Bhimbandh Sanctuary*
2. **🛕 Jain & Hindu Pilgrimage**: *Kshatriya Kund Gram*, *Lachhuar Jain Mandir*, *Giddheshwar Mandir*, *Patneshwar Mandir*, *Kali Mandir Malaypur*
3. **🏛️ Historic Monuments**: *Minto Tower (Gidhaur)*

**Ask me anything specific:**
- *"Tell me about the history of Simultala"*
- *"What is the significance of Kshatriya Kund & Lachhuar?"*
- *"Plan a 2-day weekend trip to Jamui"*
- *"Best season to visit Nagi Dam for birdwatching"*
- *"Where to stay in Jamui"*`;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const { allowed, remaining } = checkRateLimit(ip);

    if (!allowed) {
      return NextResponse.json(
        {
          error: "Daily query limit reached (30 queries/day). Please try again tomorrow or contact our travel desk directly.",
        },
        { status: 429 }
      );
    }

    const { message, messages } = await req.json();
    const userQuery = message || (messages && messages[messages.length - 1]?.content) || "";

    if (!userQuery.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Check if external API key is provided (Claude / Anthropic)
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (anthropicKey) {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 800,
            system: buildSystemContext(),
            messages: [{ role: "user", content: userQuery }],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const replyText = data.content?.[0]?.text || generateHeuristicResponse(userQuery);
          return NextResponse.json({ reply: replyText, remaining });
        }
      } catch {
        // Fallback gracefully
      }
    }

    // Default fast, rich, deeply informative contextual responder
    const reply = generateHeuristicResponse(userQuery);
    return NextResponse.json({ reply, remaining });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error generating recommendation" },
      { status: 500 }
    );
  }
}
