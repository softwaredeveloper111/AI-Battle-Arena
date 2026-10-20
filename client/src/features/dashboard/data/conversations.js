/* Demo conversations (UI only) – replace with API data later */

const judge = (s1, s2, r1, r2) => ({
  solution_1_score: s1,
  solution_2_score: s2,
  solution_1_reasoning: r1,
  solution_2_reasoning: r2,
})

export const CONVERSATIONS = [
  {
    id: 'gravity',
    group: 'Today',
    title: 'Explain how gravity works',
    prompt: 'Explain how gravity works',
    responseA: [
      'Gravity is the force that attracts objects with mass toward each other. The more mass an object has, the stronger its gravitational pull, and the greater the distance between objects, the weaker the pull.',
      'On Earth, gravity pulls everything toward the center of the planet, which is why things fall down when dropped. The same force keeps the Moon in orbit around Earth and the planets in orbit around the Sun.',
      "In Einstein's theory of general relativity, gravity is not just a force but a result of massive objects bending the fabric of spacetime. Objects move along these curved paths, which we experience as gravity.",
    ],
    responseB: [
      'Gravity is a fundamental force of nature that attracts any two objects with mass. Every object with mass creates a gravitational field, and other objects with mass are pulled toward it. The stronger the mass, the stronger the gravitational pull, and the farther apart the objects are, the weaker the pull.',
      "For example, Earth's gravity pulls you toward its center, which keeps you on the ground. The same force keeps the Moon orbiting Earth and the planets orbiting the Sun.",
      "Einstein's general relativity explains gravity as the curvature of spacetime caused by mass and energy. Massive objects like stars and planets bend spacetime, and other objects follow these curved paths, which we perceive as gravitational attraction.",
    ],
    judge: judge(
      10,
      7,
      "Solution 1 provides a clear, comprehensive, and well-structured explanation of gravity. It covers the basic concept, everyday examples, and Einstein's general relativity, making it accurate, complete, and easy to understand.",
      "Solution 2 is also accurate but less detailed. It correctly explains the basic concept and includes examples, but the explanation is more concise and does not go as deep into Einstein's general relativity or provide as much context as Solution 1.",
    ),
  },
  {
    id: 'travel-itinerary',
    group: 'Today',
    title: 'Create a travel itinerary',
    prompt: 'Create a 3-day travel itinerary for Goa',
    responseA: [
      'Day 1: Arrive, check in near Calangute, visit Baga Beach in the afternoon and enjoy the sunset at Chapora Fort.',
      'Day 2: Explore Old Goa churches in the morning, lunch at Panjim, then a Mandovi river cruise in the evening.',
      'Day 3: Relax at Palolem Beach, try water sports, and head to the airport after dinner.',
    ],
    responseB: [
      'Plan three days: North Goa beaches on day one, heritage sites on day two, and South Goa on day three.',
      'Try local food like fish curry rice and bebinca, and rent a scooter to move around easily.',
    ],
    judge: judge(
      9,
      7,
      'Solution 1 gives a concrete day-by-day plan with specific places and timing, which is exactly what an itinerary needs.',
      'Solution 2 is helpful but generic. It lacks specific timings and places for each day.',
    ),
  },
  {
    id: 'black-hole',
    group: 'Yesterday',
    title: 'What is a black hole?',
    prompt: 'What is a black hole?',
    responseA: [
      'A black hole is a region of space where gravity is so strong that nothing, not even light, can escape once it crosses the event horizon.',
      'Most form when massive stars collapse at the end of their lives. Supermassive black holes sit at the centers of galaxies.',
    ],
    responseB: [
      'A black hole is a very dense object in space with extremely strong gravity. Because light cannot escape, we cannot see it directly.',
      'Scientists detect them by watching how nearby stars and gas move around them.',
    ],
    judge: judge(
      9,
      8,
      'Solution 1 defines the event horizon and explains how black holes form, giving a more complete answer.',
      'Solution 2 is correct and mentions how they are detected, but skips the event horizon and formation.',
    ),
  },
  {
    id: 'neural-network',
    group: 'Yesterday',
    title: 'How does a neural network learn?',
    prompt: 'How does a neural network learn?',
    responseA: [
      'A neural network learns by adjusting the weights between its neurons to reduce error. It makes a prediction, compares it with the correct answer using a loss function, and updates its weights.',
      'This update step is done with backpropagation and gradient descent, repeated over many examples until the loss is small.',
    ],
    responseB: [
      'Neural networks learn from data. They look at many examples and slowly get better at predicting the right output.',
      'Internally, numbers called weights are tuned during training.',
    ],
    judge: judge(
      10,
      6,
      'Solution 1 names the real mechanisms: loss function, backpropagation, and gradient descent.',
      'Solution 2 is correct at a high level but too vague to explain how learning actually happens.',
    ),
  },
  {
    id: 'japan-trip',
    group: 'Yesterday',
    title: 'Plan a trip to Japan',
    prompt: 'Plan a 7-day trip to Japan for first-time visitors',
    responseA: [
      'Spend 3 days in Tokyo (Shibuya, Asakusa, Akihabara), 2 days in Kyoto (Fushimi Inari, Arashiyama), and 1 day in Osaka for food.',
      'Buy a 7-day JR Pass if you plan multiple bullet-train rides and carry a Suica card for local transport.',
    ],
    responseB: [
      'Japan is best visited in spring or autumn. Start in Tokyo, move to Kyoto, and finish in Osaka.',
      'Book hotels early and learn a few basic Japanese phrases.',
    ],
    judge: judge(
      9,
      7,
      'Solution 1 splits days across cities with specific sights and transport tips.',
      'Solution 2 gives good general advice but no concrete schedule.',
    ),
  },
  {
    id: 'sql-vs-nosql',
    group: 'Older',
    title: 'Compare SQL vs NoSQL',
    prompt: 'Compare SQL vs NoSQL databases',
    responseA: [
      'SQL databases are relational, use fixed schemas and tables, and support powerful joins and ACID transactions. Examples: PostgreSQL, MySQL.',
      'NoSQL databases are flexible and scale horizontally. They include document, key-value, column and graph stores such as MongoDB and Redis.',
    ],
    responseB: [
      'SQL is for structured data and NoSQL is for unstructured data. NoSQL is generally faster.',
    ],
    judge: judge(
      9,
      5,
      'Solution 1 compares schema, consistency, scaling and gives examples.',
      'Solution 2 is oversimplified and the claim that NoSQL is generally faster is misleading.',
    ),
  },
  {
    id: 'python-scraper',
    group: 'Older',
    title: 'Write a Python scraper',
    prompt: 'Write a simple Python web scraper',
    responseA: [
      'Use requests to fetch the page and BeautifulSoup to parse HTML: soup = BeautifulSoup(requests.get(url).text, "html.parser"), then loop over soup.select("a") to read links.',
      'Always check robots.txt, add a User-Agent header, and add delays between requests.',
    ],
    responseB: [
      'You can use Selenium to open a browser and read elements from the page. It works for JavaScript heavy websites.',
    ],
    judge: judge(
      8,
      7,
      'Solution 1 shows a lightweight approach and mentions responsible scraping practices.',
      'Solution 2 is valid for dynamic sites but heavier and includes no code or etiquette notes.',
    ),
  },
  {
    id: 'best-laptop',
    group: 'Older',
    title: 'Best laptop for developers',
    prompt: 'What is the best laptop for developers?',
    responseA: [
      'For most developers, a MacBook Pro offers great battery life and performance. On Windows, ThinkPad X1 Carbon and Dell XPS are strong choices.',
      'Aim for at least 16GB RAM and a fast SSD.',
    ],
    responseB: [
      'The best laptop depends on your work. Web developers need less power, while ML engineers need a good GPU.',
    ],
    judge: judge(
      7,
      9,
      'Solution 1 lists solid options but ignores differing needs.',
      'Solution 2 correctly points out that the best choice depends on the type of development work.',
    ),
  },
  {
    id: 'quantum-computing',
    group: 'Older',
    title: 'Explain quantum computing',
    prompt: 'Explain quantum computing simply',
    responseA: [
      'Classical computers use bits that are 0 or 1. Quantum computers use qubits, which can be in a mix of 0 and 1 at the same time (superposition).',
      'With entanglement and interference, quantum algorithms can solve certain problems, like factoring large numbers, much faster.',
    ],
    responseB: [
      'Quantum computers are very powerful machines that use quantum physics to do many calculations at once.',
    ],
    judge: judge(
      10,
      6,
      'Solution 1 explains qubits, superposition, and entanglement clearly.',
      'Solution 2 is vague and "many calculations at once" is a common oversimplification.',
    ),
  },
]

export const DEFAULT_CHAT_ID = CONVERSATIONS[0].id

export const getConversation = (id) => CONVERSATIONS.find((c) => c.id === id)

/* Group conversations for the sidebar: [{ label, items: [conversation] }] */
export const groupConversations = (list = CONVERSATIONS) => {
  const groups = []
  list.forEach((c) => {
    let g = groups.find((x) => x.label === c.group)
    if (!g) groups.push((g = { label: c.group, items: [] }))
    g.items.push(c)
  })
  return groups
}
