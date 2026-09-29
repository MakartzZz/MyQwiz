export const MUSIC_ALBUM_STORAGE_KEY = "myqwiz:music-album";

export const musicAlbums = [
  {
    id: "bosque-de-cristal",
    title: "Bosque de Cristal",
    description: "Fantasía ambiental, ocarina y ruinas entre la niebla.",
    cover: "/music/bosque-de-cristal/cover.png",
    tracks: [
      { title: "Paseo por el Bosque", src: "/music/bosque-de-cristal/01-paseo-por-el-bosque.mp3" },
      { title: "Ruinas antiguas en la niebla", src: "/music/bosque-de-cristal/02-ruinas-antiguas-en-la-niebla.mp3" },
    ],
  },
  {
    id: "orbita-serena",
    title: "Órbita Serena",
    description: "Ambient electrónico para concentración profunda.",
    cover: "/music/orbita-serena/cover.png",
    tracks: [
      { title: "Contemplando planetas", src: "/music/orbita-serena/01-contemplando-planetas.mp3" },
      { title: "Enfoque constante", src: "/music/orbita-serena/02-enfoque-constante.mp3" },
    ],
  },
  {
    id: "tinta-y-madera",
    title: "Tinta y Madera",
    description: "Piano íntimo, cuerdas y ambiente de biblioteca.",
    cover: "/music/tinta-y-madera/cover.png",
    tracks: [
      { title: "Estudio cálido", src: "/music/tinta-y-madera/01-estudio-calido.mp3" },
      { title: "Sala de lectura tranquila", src: "/music/tinta-y-madera/02-sala-de-lectura-tranquila.mp3" },
    ],
  },
  {
    id: "cafe-de-medianoche",
    title: "Café de Medianoche",
    description: "Lo-fi cálido y jazz suave para estudiar de noche.",
    cover: "/music/cafe-de-medianoche/cover.png",
    tracks: [
      { title: "Foco y concentración", src: "/music/cafe-de-medianoche/01-foco-y-concentracion.mp3" },
      { title: "Flujo de enfoque", src: "/music/cafe-de-medianoche/02-flujo-de-enfoque.mp3" },
    ],
  },
  {
    id: "ritmo-trivia",
    title: "Ritmo Trivia",
    description: "Beats vibrantes para pensar, responder y seguir el ritmo.",
    cover: "/music/ritmo-trivia/cover.png",
    tracks: [
      { title: "Trivia Groove", src: "/music/ritmo-trivia/01-trivia-groove.mp3" },
      { title: "Trivia Pulse", src: "/music/ritmo-trivia/02-trivia-pulse.mp3" },
    ],
  },
  {
    id: "trivia-lounge",
    title: "Trivia Lounge",
    description: "Jazz elegante y ritmo lounge para pensar sin perder el swing.",
    cover: "/music/trivia-lounge/cover.png",
    tracks: [
      { title: "Lounge Shuffle", src: "/music/trivia-lounge/01-lounge-shuffle.mp3" },
      { title: "Casino Lounge", src: "/music/trivia-lounge/02-casino-lounge.mp3" },
    ],
  },
  {
    id: "impulso-solar",
    title: "Impulso Solar",
    description: "Ritmos alegres para estudiar con motivación.",
    cover: "/music/impulso-solar/cover.png",
    tracks: [
      { title: "Enfoque hacia adelante", src: "/music/impulso-solar/01-enfoque-hacia-adelante.mp3" },
      { title: "Enfoque tranquilo", src: "/music/impulso-solar/02-enfoque-tranquilo.mp3" },
    ],
  },
];

export const DEFAULT_MUSIC_ALBUM = musicAlbums[0].id;
