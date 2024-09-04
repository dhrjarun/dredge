type Movie = {
  id: number;
  title: string;
  year: number;
  genre: string;
  director: string;
};

type Event = {
  date: string;
  title: string;
  description: string;
};
const events = [
  {
    date: "2022-01-01",
    title: "Event 1",
    description: "Description 1",
  },
  {
    date: "2022-01-02",
    title: "Event 2",
    description: "Description 2",
  },
  {
    date: "2022-01-03",
    title: "Event 3",
    description: "Description 3",
  },
];

let movies: Movie[] = [
  {
    id: 1,
    title: "Gangs of Wasseypur – Part 1",
    year: 2012,
    genre: "Crime",
    director: "Anurag Kashyap",
  },
  {
    id: 2,
    title: "Gangs of Wasseypur – Part 2",
    year: 2012,
    genre: "Crime",
    director: "Anurag Kashyap",
  },

  {
    id: 3,
    title: "Pulp Fiction",
    year: 1994,
    genre: "Crime",
    director: "Quentin Tarantino",
  },
  {
    id: 4,
    title: "Tumbbad",
    year: 2018,
    genre: "Horror",
    director: "Rahi Anil Barve",
  },
  {
    id: 5,
    title: "Kill",
    year: 2023,
    genre: "Action",
    director: "Nikhil Nagesh Bhat",
  },
];

export const db = {
  movie: {
    getAll: () => movies,
    getById: (id: number) => movies.find((movie) => movie.id === id),
    create: (movie: Movie) => {
      movies.push(movie);
    },
    deleteById: (id: number) => {
      movies = movies.filter((movie) => movie.id !== id);
    },
  },
  events: {
    getAll: () => events,
    getByDate: (date: string) => events.find((event) => event.date === date),
  },
};

export type DB = typeof db;
