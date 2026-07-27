export interface Review {
  id: string;
  author: string;
  stars: number;
  date: string;
  comment: string;
}

export const ALL_REVIEWS: Review[] = [
  {
    id: "r1",
    author: "Grace Wanjiku",
    stars: 5,
    date: "2 Dec 2024",
    comment:
      "Very punctual and friendly. Car was clean and comfortable. Highly recommend!",
  },
  {
    id: "r2",
    author: "Kevin Otieno",
    stars: 5,
    date: "18 Nov 2024",
    comment:
      "Great driver, played good music and drove safely. Will book again.",
  },
  {
    id: "r3",
    author: "Mercy Njeri",
    stars: 4,
    date: "5 Nov 2024",
    comment:
      "Arrived on time, comfortable journey. Slight delay at Mtito Andei but overall good.",
  },
  {
    id: "r4",
    author: "Brian Kamau",
    stars: 5,
    date: "22 Oct 2024",
    comment: "Excellent service, very accommodating with luggage.",
  },
  {
    id: "r5",
    author: "Aisha Odhiambo",
    stars: 4,
    date: "10 Oct 2024",
    comment: "Safe driver, good conversation. Would use again.",
  },
];

/** Deterministically pick `count` reviews for a person so it feels stable per user. */
export function getReviewsForPerson(personId: string, count = ALL_REVIEWS.length): Review[] {
  if (!personId) return ALL_REVIEWS.slice(0, count);
  const offset =
    personId.charCodeAt(personId.length - 1) % ALL_REVIEWS.length;
  const result: Review[] = [];
  for (let i = 0; i < Math.min(count, ALL_REVIEWS.length); i++) {
    result.push(ALL_REVIEWS[(offset + i) % ALL_REVIEWS.length]);
  }
  return result;
}
