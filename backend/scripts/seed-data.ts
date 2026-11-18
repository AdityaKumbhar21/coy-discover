import type { SeedData } from "../src/db/seed.js";

const photoUrl = "/images/profile-placeholder.svg";

// Entirely synthetic data. Stable candidate IDs do not encode incoming interest.
const candidates = [
  [
    "Aarohi",
    23,
    "Pune",
    "Weekend hikes and a good mystery novel.",
    ["Hiking", "Books"],
  ],
  [
    "Kabir",
    25,
    "Bengaluru",
    "Always looking for a new coffee spot.",
    ["Coffee", "Photography"],
  ],
  [
    "Mira",
    22,
    "Mumbai",
    "Sketchbooks, sea walks, and old films.",
    ["Art", "Cinema"],
  ],
  [
    "Rohan",
    24,
    "Delhi",
    "I cook a new recipe every Sunday.",
    ["Cooking", "Music"],
  ],
  [
    "Ananya",
    21,
    "Fergusson College",
    "Learning guitar between classes.",
    ["Guitar", "Reading"],
  ],
  [
    "Vihaan",
    26,
    "Hyderabad",
    "Badminton games followed by biryani.",
    ["Badminton", "Food"],
  ],
  [
    "Isha",
    24,
    "Chennai",
    "Sunrise runs and very ambitious baking.",
    ["Running", "Baking"],
  ],
  [
    "Arjun",
    27,
    "Pune",
    "Building things and exploring local trails.",
    ["Design", "Hiking"],
  ],
  [
    "Tara",
    23,
    "Jaipur",
    "Collecting postcards and small travel stories.",
    ["Travel", "Writing"],
  ],
  [
    "Dev",
    22,
    "IIT Bombay",
    "Board games are my favourite study break.",
    ["Board games", "Robotics"],
  ],
  [
    "Sana",
    25,
    "Kochi",
    "A beach walk improves most afternoons.",
    ["Swimming", "Art"],
  ],
  [
    "Neel",
    28,
    "Ahmedabad",
    "Trying to keep my balcony plants alive.",
    ["Gardening", "Cooking"],
  ],
  [
    "Kiara",
    21,
    "Christ University",
    "Dance practice and late-night playlists.",
    ["Dance", "Music"],
  ],
  [
    "Advik",
    24,
    "Indore",
    "City cycling and finding excellent snacks.",
    ["Cycling", "Food"],
  ],
  [
    "Myra",
    26,
    "Kolkata",
    "Bookshops are always on my itinerary.",
    ["Books", "Travel"],
  ],
  [
    "Dhruv",
    23,
    "BITS Pilani",
    "A cricket match and a really good podcast.",
    ["Cricket", "Podcasts"],
  ],
  [
    "Avni",
    25,
    "Lucknow",
    "I make pottery and slightly uneven mugs.",
    ["Pottery", "Yoga"],
  ],
  [
    "Reyansh",
    22,
    "Manipal University",
    "Learning languages one conversation at a time.",
    ["Languages", "Cinema"],
  ],
  [
    "Zoya",
    27,
    "Bengaluru",
    "Live gigs and quiet morning walks.",
    ["Music", "Walking"],
  ],
  [
    "Ayaan",
    24,
    "Mumbai",
    "Searching for the best dosa in town.",
    ["Food", "Football"],
  ],
  [
    "Naina",
    23,
    "Savitribai Phule Pune University",
    "Curious about science and street photography.",
    ["Science", "Photography"],
  ],
  [
    "Ishaan",
    26,
    "Chandigarh",
    "Mountain weekends and homemade pasta.",
    ["Hiking", "Cooking"],
  ],
  [
    "Sia",
    22,
    "NID Ahmedabad",
    "Making illustrations inspired by everyday life.",
    ["Illustration", "Design"],
  ],
  [
    "Kunal",
    29,
    "Gurugram",
    "Tennis in the morning, films in the evening.",
    ["Tennis", "Cinema"],
  ],
  [
    "Riya",
    24,
    "Nagpur",
    "I never turn down a museum visit.",
    ["History", "Travel"],
  ],
  [
    "Om",
    21,
    "COEP Technological University",
    "Learning to bake while studying engineering.",
    ["Baking", "Technology"],
  ],
  [
    "Meher",
    28,
    "Surat",
    "Embroidery projects and weekend markets.",
    ["Crafts", "Fashion"],
  ],
  [
    "Yash",
    25,
    "Thiruvananthapuram",
    "Ocean air and a friendly chess game.",
    ["Chess", "Swimming"],
  ],
  [
    "Anika",
    23,
    "Goa",
    "A notebook full of poems and beach sketches.",
    ["Poetry", "Art"],
  ],
  [
    "Samar",
    27,
    "Bhopal",
    "Birdwatching has made me a morning person.",
    ["Nature", "Photography"],
  ],
] satisfies [string, number, string, string, string[]][];

export function createSeedData(demoUserId: number): SeedData {
  const profiles = candidates.map(
    ([name, age, cityOrCollege, bio, interests], index) => ({
      id: 1001 + index,
      name,
      age,
      photoUrl,
      bio,
      cityOrCollege,
      interests,
    }),
  );

  if (profiles.some((profile) => profile.id === demoUserId)) {
    throw new Error(
      "Demo user ID conflicts with reserved candidate IDs 1001-1030.",
    );
  }

  return {
    demoUserId,
    profiles: [
      {
        id: demoUserId,
        name: "Demo User",
        age: 24,
        photoUrl,
        bio: "Exploring Coy Discover.",
        cityOrCollege: "Pune",
        interests: ["Music", "Books"],
      },
      ...profiles,
    ],
    swipes: [1001, 1007, 1020].map((actorId) => ({
      actorId,
      targetId: demoUserId,
      decision: "like",
      createdAt: Date.UTC(2026, 0, 1),
    })),
  };
}
